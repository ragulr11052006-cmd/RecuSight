/**
 * RecurSight Production-Grade Invoice & Document Extraction Engine
 * 
 * Extracts verified subscription details from uploaded invoices (PDF, PNG, JPG, CSV):
 * 1. Merchant / Issuer Name (strictly from document evidence, never from PDF creator metadata)
 * 2. Service / Subscription Name
 * 3. Invoice Number
 * 4. Invoice Date
 * 5. Total Amount Paid or Due (prioritizing Grand Total over Subtotal and Tax)
 * 6. Currency (INR, USD, EUR, GBP, etc.)
 * 7. Subtotal
 * 8. Payment Method (evidence-based only; null when not present)
 * 9. Billing Frequency & Billing Period
 * 10. Next Renewal Date (only when explicitly stated or derived from verified billing period)
 */

import { createWorker } from 'tesseract.js';
import { Currency, SubscriptionCategory } from '../types';

export interface ExtractedField<T> {
  value: T | null;
  evidenceText: string | null;
  page: number;
  confidence: number; // 0 to 100
  status: 'high' | 'medium' | 'low' | 'missing';
}

export interface InvoiceExtractionResult {
  documentName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  serviceName: ExtractedField<string>;
  merchantName: ExtractedField<string>;
  invoiceNumber: ExtractedField<string>;
  invoiceDate: ExtractedField<string>;
  totalAmount: ExtractedField<number>;
  currency: ExtractedField<Currency>;
  subtotal: ExtractedField<number>;
  taxAmount: ExtractedField<number>;
  paymentMethod: ExtractedField<string>;
  billingFrequency: ExtractedField<'monthly' | 'yearly' | 'quarterly' | 'weekly'>;
  billingPeriod: ExtractedField<string>;
  renewalDate: ExtractedField<string>;
  rawText: string;
  pagesText: string[];
  warnings: string[];
  detectedAmounts: number[];
}

// =========================================================================
// 1. PDF STREAM EXTRACTION & METADATA SANITIZER
// =========================================================================

/**
 * Strips PDF structural objects, creator metadata, font descriptors, and XMP streams.
 * Crucial fix: Prevents "/Producer (Adobe PDF Library...)" or "/Creator (Adobe InDesign...)"
 * from falsely identifying invoices (such as LinkedIn invoices) as Adobe!
 */
export function sanitizePdfExtractedText(raw: string): string {
  if (!raw) return '';
  return raw
    // Remove PDF header and trailer
    .replace(/%PDF-[0-9.]+[\s\S]*?(?=\bstream|\bBT|\bET|[A-Za-z0-9])/gi, '')
    // Remove PDF dictionary attributes and metadata tags
    .replace(/\/(?:Producer|Creator|Author|Title|Subject|Keywords|CreationDate|ModDate|CreatorTool|Trapped|PTEX\.[\w.]+)\s*\([^)]*\)/gi, ' ')
    .replace(/\/(?:Producer|Creator|Author|Title|Subject)\s*<[^>]*>/gi, ' ')
    .replace(/<xmp:CreatorTool>[\s\S]*?<\/xmp:CreatorTool>/gi, ' ')
    .replace(/<pdf:Producer>[\s\S]*?<\/pdf:Producer>/gi, ' ')
    // Remove font descriptor and encoding definitions
    .replace(/\/(?:Font|FontDescriptor|Encoding|BaseFont|ToUnicode|ProcSet|XObject|MediaBox|CropBox|Parent|Kids|Count|Resources|Filter|Length\d?)\b[^\r\n]*/gi, ' ')
    // Remove PostScript/PDF operators like "ET", "BT", "Q", "q", "cm", "rg", "RG"
    .replace(/\b(?:BT|ET|endobj|obj|endstream|stream|xref|trailer|startxref)\b/g, ' ')
    // Normalize horizontal spaces while preserving newlines for line-by-line invoice processing
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/(?:\r?\n\s*)+/g, '\n')
    .trim();
}

/**
 * Extracts visible text content from PDF file streams across all pages.
 */
export async function extractTextFromPdf(file: File): Promise<{ text: string; pages: string[] }> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const latin1 = new TextDecoder('latin1').decode(bytes);

    const pages: string[] = [];
    let allDecompressedStreams = '';

    // Search all stream ... endstream blocks
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(latin1)) !== null) {
      const streamStart = match.index + match[0].indexOf('\n') + 1;
      const streamEnd = match.index + match[0].lastIndexOf('endstream');
      const streamBytes = bytes.slice(streamStart, streamEnd);

      let decompressed = '';
      if (typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          writer.write(streamBytes);
          writer.close();
          const reader = ds.readable.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const c of chunks) {
            merged.set(c, offset);
            offset += c.length;
          }
          decompressed = new TextDecoder('utf-8', { fatal: false }).decode(merged);
        } catch {
          decompressed = new TextDecoder('latin1').decode(streamBytes);
        }
      } else {
        decompressed = new TextDecoder('latin1').decode(streamBytes);
      }

      if (decompressed) {
        allDecompressedStreams += '\n' + decompressed;
      }
    }

    // Extract text from text blocks: (literal string) Tj or '
    const textPieces: string[] = [];
    const searchTarget = allDecompressedStreams;

    // 1. Literal strings: (string) Tj or '
    const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(searchTarget)) !== null) {
      const clean = tjMatch[1]
        .replace(/\\([\\()])/g, '$1')
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, '')
        .trim();
      if (clean && clean.length > 0) {
        textPieces.push(clean);
      }
    }

    // 2. Array strings: [(foo) 10 (bar)] TJ
    const arrayTjRegex = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/gi;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = arrayTjRegex.exec(searchTarget)) !== null) {
      const inner = arrMatch[1];
      const subMatches = inner.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || [];
      const parts: string[] = [];
      for (const sm of subMatches) {
        const clean = sm.slice(1, -1).replace(/\\([\\()])/g, '$1').trim();
        if (clean) parts.push(clean);
      }
      if (parts.length > 0) {
        textPieces.push(parts.join(' '));
      }
    }

    // 3. Hex strings: <48656c6c6f> Tj
    const hexRegex = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRegex.exec(searchTarget)) !== null) {
      const hex = hexMatch[1].replace(/\s+/g, '');
      if (hex.length >= 2 && hex.length % 2 === 0) {
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          const code = parseInt(hex.substr(i, 2), 16);
          if (code >= 32 && code <= 126) str += String.fromCharCode(code);
        }
        if (str.trim()) textPieces.push(str.trim());
      }
    }

    let parsedText = textPieces.join('\n');

    // If PDF text streams were empty (e.g. scanned PDF), fallback to ASCII cleaning without metadata
    if (!parsedText || parsedText.trim().length < 20) {
      const sanitized = sanitizePdfExtractedText(latin1);
      const cleanTokens = sanitized.match(/[A-Za-z0-9₹$€£.,:/\-@\s]{3,}/g) || [];
      parsedText = cleanTokens.join(' ');
    }

    // Sanitize any remaining PDF metadata strings
    parsedText = sanitizePdfExtractedText(parsedText);

    // Approximate page grouping
    const pageBreakRegex = /(?:page\s*1\s*of|page\s*2\s*of|\/Type\s*\/Page\b)/gi;
    const rawPages = parsedText.split(pageBreakRegex).filter((p) => p.trim().length > 0);
    if (rawPages.length > 0) {
      pages.push(...rawPages);
    } else {
      pages.push(parsedText);
    }

    return {
      text: parsedText,
      pages: pages.length > 0 ? pages : [parsedText],
    };
  } catch (err) {
    console.error('PDF text extraction error:', err);
    return { text: '', pages: [] };
  }
}

// =========================================================================
// 2. IMAGE OCR EXTRACTION ENGINE (TESSERACT WITH PRE-PROCESSING)
// =========================================================================

export async function extractTextFromImage(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  try {
    onProgress?.('Preparing image for optical character recognition...');

    // Use canvas to normalize and improve contrast when running in browser
    let processedBlob: Blob = file;
    if (typeof document !== 'undefined') {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          // Grayscale + High contrast normalization
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            d[i] = gray;
            d[i + 1] = gray;
            d[i + 2] = gray;
          }
          ctx.putImageData(imgData, 0, 0);
          processedBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b || file), 'image/png'));
        }
        URL.revokeObjectURL(url);
      } catch {
        processedBlob = file;
      }
    }

    onProgress?.('Initializing OCR engine...');
    const worker = await createWorker('eng');
    onProgress?.('Reading characters, amounts, and vendor evidence...');
    const result = await worker.recognize(processedBlob);
    await worker.terminate();

    return result.data.text || '';
  } catch (err) {
    console.warn('Image OCR error:', err);
    return '';
  }
}

// =========================================================================
// 3. EVIDENCE-BASED MERCHANT & SERVICE IDENTIFIER
// =========================================================================

export interface KnownIssuerPattern {
  id: string;
  merchantName: string;
  defaultServiceName: string;
  category: SubscriptionCategory;
  // Specific patterns that indicate the actual issuer (NOT PDF producer metadata)
  evidencePatterns: RegExp[];
  // Domains that appear on official invoices
  officialDomains: string[];
}

export const KNOWN_ISSUERS: KnownIssuerPattern[] = [
  // 1. LinkedIn (Solves problem #1: Never identified as Adobe)
  {
    id: 'linkedin',
    merchantName: 'LinkedIn',
    defaultServiceName: 'LinkedIn Premium / Subscription',
    category: 'Software & Tools',
    evidencePatterns: [
      /\blinkedin\s*(?:ireland\s*unlimited\s*company|corporation|singapore\s*pte|premium|learning|recruiter|sales\s*navigator)\b/i,
      /\bpayment\s*to\s*linkedin\b/i,
      /\breceipt\s*from\s*linkedin\b/i,
      /\bwelcome\s*to\s*linkedin\b/i,
      /\blinkedin\s*invoice\b/i,
      /\bwww\.linkedin\.com\b/i,
      /\blinkedin\b/i,
    ],
    officialDomains: ['linkedin.com'],
  },
  // 2. Adobe (Only when invoice is genuinely from Adobe Systems / Adobe Inc)
  {
    id: 'adobe',
    merchantName: 'Adobe',
    defaultServiceName: 'Adobe Creative Cloud',
    category: 'Design',
    evidencePatterns: [
      /\badobe\s*(?:systems\s*software\s*ireland\s*limited|inc\.?|creative\s*cloud|systems|software)\b/i,
      /\bcreative\s*cloud\s*(?:all\s*apps|photography|single\s*app)\b/i,
      /\bbilled\s*by\s*adobe\b/i,
      /\bpayment\s*to\s*adobe\b/i,
      /\badobe\.com\b/i,
      /\bwww\.adobe\.com\b/i,
    ],
    officialDomains: ['adobe.com'],
  },
  // 3. Netflix
  {
    id: 'netflix',
    merchantName: 'Netflix',
    defaultServiceName: 'Netflix Subscription',
    category: 'Streaming & Ent',
    evidencePatterns: [
      /\bnetflix\s*(?:entertainment\s*services|international\s*b\.v\.|inc\.?|services\s*germany|streaming)\b/i,
      /\bnetflix\.com\b/i,
      /\bnetflix\b/i,
    ],
    officialDomains: ['netflix.com'],
  },
  // 4. Spotify
  {
    id: 'spotify',
    merchantName: 'Spotify',
    defaultServiceName: 'Spotify Premium',
    category: 'Streaming & Ent',
    evidencePatterns: [
      /\bspotify\s*(?:ab|usa\s*inc\.?|premium|india)\b/i,
      /\bspotify\.com\b/i,
      /\bspotify\b/i,
    ],
    officialDomains: ['spotify.com'],
  },
  // 5. Figma
  {
    id: 'figma',
    merchantName: 'Figma',
    defaultServiceName: 'Figma Professional / Org',
    category: 'Design',
    evidencePatterns: [
      /\bfigma[,\s]+inc\.?\b/i,
      /\bfigma\s*(?:organization|professional|design)\b/i,
      /\bfigma\.com\b/i,
      /\bfigma\b/i,
    ],
    officialDomains: ['figma.com'],
  },
  // 6. Google Cloud / Workspace / YouTube
  {
    id: 'google_cloud',
    merchantName: 'Google Cloud Platform',
    defaultServiceName: 'Google Cloud Services',
    category: 'Utilities & Cloud',
    evidencePatterns: [
      /\bgoogle\s*(?:cloud\s*emea|cloud\s*platform|ireland\s*limited|asia\s*pacific|india\s*pvt)\b/i,
      /\bcloud\.google\.com\b/i,
      /\bgcp\s*invoice\b/i,
    ],
    officialDomains: ['cloud.google.com'],
  },
  {
    id: 'youtube',
    merchantName: 'YouTube Premium',
    defaultServiceName: 'YouTube Premium Membership',
    category: 'Streaming & Ent',
    evidencePatterns: [
      /\byoutube\s*premium\b/i,
      /\bgoogle\s*\*youtube\b/i,
      /\byoutube\.com\b/i,
    ],
    officialDomains: ['youtube.com'],
  },
  // 7. Amazon Web Services (AWS)
  {
    id: 'aws',
    merchantName: 'Amazon Web Services (AWS)',
    defaultServiceName: 'AWS Cloud Infrastructure',
    category: 'Utilities & Cloud',
    evidencePatterns: [
      /\bamazon\s*web\s*services[,\s]+inc\.?\b/i,
      /\baws\s*(?:emea|cloud|invoice)\b/i,
      /\baws\.amazon\.com\b/i,
    ],
    officialDomains: ['aws.amazon.com'],
  },
  // 8. Amazon Prime
  {
    id: 'amazon_prime',
    merchantName: 'Amazon Prime',
    defaultServiceName: 'Amazon Prime Membership',
    category: 'Entertainment',
    evidencePatterns: [
      /\bamazon\s*(?:prime|digital\s*services|seller\s*services)\b/i,
      /\bprime\s*video\b/i,
    ],
    officialDomains: ['amazon.com', 'amazon.in'],
  },
  // 9. GitHub
  {
    id: 'github',
    merchantName: 'GitHub',
    defaultServiceName: 'GitHub Copilot / Plan',
    category: 'Software & Tools',
    evidencePatterns: [
      /\bgithub[,\s]+inc\.?\b/i,
      /\bgithub\s*copilot\b/i,
      /\bgithub\.com\b/i,
      /\bgithub\b/i,
    ],
    officialDomains: ['github.com'],
  },
  // 10. OpenAI / ChatGPT
  {
    id: 'openai',
    merchantName: 'OpenAI',
    defaultServiceName: 'ChatGPT Plus',
    category: 'Ai Assist',
    evidencePatterns: [
      /\bopenai[,\s]+l\.?l\.?c\.?\b/i,
      /\bchatgpt\s*plus\b/i,
      /\bopenai\.com\b/i,
    ],
    officialDomains: ['openai.com'],
  },
  // 11. Anthropic / Claude
  {
    id: 'anthropic',
    merchantName: 'Anthropic',
    defaultServiceName: 'Claude Pro',
    category: 'Ai Assist',
    evidencePatterns: [
      /\banthropic[,\s]+pbc\b/i,
      /\bclaude\s*pro\b/i,
      /\banthropic\.com\b/i,
    ],
    officialDomains: ['anthropic.com'],
  },
  // 12. Notion
  {
    id: 'notion',
    merchantName: 'Notion',
    defaultServiceName: 'Notion Plus / Team',
    category: 'Productivity',
    evidencePatterns: [
      /\bnotion\s*labs[,\s]+inc\.?\b/i,
      /\bnotion\.so\b/i,
      /\bnotion\b/i,
    ],
    officialDomains: ['notion.so'],
  },
  // 13. Slack
  {
    id: 'slack',
    merchantName: 'Slack',
    defaultServiceName: 'Slack Pro Plan',
    category: 'Productivity',
    evidencePatterns: [
      /\bslack\s*technologies[,\s]+llc\b/i,
      /\bslack\.com\b/i,
      /\bslack\b/i,
    ],
    officialDomains: ['slack.com'],
  },
  // 14. Microsoft
  {
    id: 'microsoft',
    merchantName: 'Microsoft',
    defaultServiceName: 'Microsoft 365 Subscription',
    category: 'Productivity',
    evidencePatterns: [
      /\bmicrosoft\s*(?:ireland\s*operations|corporation|365|office\s*365)\b/i,
      /\bmicrosoft\.com\b/i,
    ],
    officialDomains: ['microsoft.com'],
  },
  // 15. Canva
  {
    id: 'canva',
    merchantName: 'Canva',
    defaultServiceName: 'Canva Pro',
    category: 'Design',
    evidencePatterns: [
      /\bcanva\s*(?:pty\s*ltd|pro)\b/i,
      /\bcanva\.com\b/i,
      /\bcanva\b/i,
    ],
    officialDomains: ['canva.com'],
  },
  // 16. Zoom
  {
    id: 'zoom',
    merchantName: 'Zoom',
    defaultServiceName: 'Zoom Pro',
    category: 'Productivity',
    evidencePatterns: [
      /\bzoom\s*video\s*communications[,\s]+inc\.?\b/i,
      /\bzoom\.us\b/i,
    ],
    officialDomains: ['zoom.us'],
  },
];

/**
 * Identifies the authentic merchant from document evidence.
 * Specifically distinguishes between:
 * - Actual seller / company name
 * - Payment processor (e.g. Stripe, Razorpay)
 * - Bank (e.g. HDFC, Chase)
 */
export function identifyMerchant(
  text: string,
  filename: string
): {
  merchantName: ExtractedField<string>;
  serviceName: ExtractedField<string>;
  category: SubscriptionCategory;
} {
  const cleanDoc = sanitizePdfExtractedText(text);

  // 1. Check known issuers with strict evidence patterns
  for (const issuer of KNOWN_ISSUERS) {
    for (const pattern of issuer.evidencePatterns) {
      const match = cleanDoc.match(pattern);
      if (match) {
        // If the pattern is Adobe, ensure it was NOT just a PDF producer string
        if (issuer.id === 'adobe') {
          // Adobe must appear in the actual invoice body or company name,
          // not merely in a creator tag
          const isRealAdobe = /\b(?:adobe\s*systems|adobe\s*inc|creative\s*cloud|adobe\s*acrobat\s*pro\s*subscription|billed\s*by\s*adobe)\b/i.test(cleanDoc);
          if (!isRealAdobe) continue;
        }

        return {
          merchantName: {
            value: issuer.merchantName,
            evidenceText: match[0],
            page: 1,
            confidence: 96,
            status: 'high',
          },
          serviceName: {
            value: issuer.defaultServiceName,
            evidenceText: match[0],
            page: 1,
            confidence: 90,
            status: 'high',
          },
          category: issuer.category,
        };
      }
    }
  }

  // 2. Explicit labeled issuer / seller / vendor in invoice text
  const labeledVendorRegex = [
    /(?:billed\s*by|sold\s*by|seller\s*name|provider\s*name|company\s*name|merchant\s*name|issuer|supplier)[:\s]+([^\r\n,;]+)/i,
    /(?:invoice\s*from|receipt\s*from|payment\s*to|subscription\s*to)[:\s]+([^\r\n,;]+)/i,
    /(?:thank\s*you\s*for\s*(?:your\s*)?(?:business\s*with|subscribing\s*to|payment\s*to))[:\s]+([^\r\n,;!.]+)/i,
  ];

  for (const regex of labeledVendorRegex) {
    const match = cleanDoc.match(regex);
    if (match && match[1]) {
      const candidate = cleanMerchantCandidate(match[1]);
      if (candidate) {
        return {
          merchantName: {
            value: candidate,
            evidenceText: match[0],
            page: 1,
            confidence: 88,
            status: 'high',
          },
          serviceName: {
            value: `${candidate} Subscription`,
            evidenceText: match[0],
            page: 1,
            confidence: 75,
            status: 'medium',
          },
          category: detectCategory(cleanDoc + ' ' + candidate),
        };
      }
    }
  }

  // 3. Domain heuristics (e.g. support@domain.com or www.domain.com)
  const domainMatch = cleanDoc.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]{3,25})\.(?:com|ai|io|net|in|org|co|app|dev)\b/i);
  if (domainMatch && domainMatch[1] && !/^(?:google|apple|microsoft|stripe|razorpay|fastspring|paypal)$/i.test(domainMatch[1])) {
    const domainName = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1).toLowerCase();
    return {
      merchantName: {
        value: domainName,
        evidenceText: domainMatch[0],
        page: 1,
        confidence: 80,
        status: 'medium',
      },
      serviceName: {
        value: `${domainName} Subscription`,
        evidenceText: domainMatch[0],
        page: 1,
        confidence: 70,
        status: 'medium',
      },
      category: detectCategory(cleanDoc + ' ' + domainName),
    };
  }

  // 4. Header entity in first 5 lines (ignoring generic invoice words)
  const lines = cleanDoc.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 2);
  for (const line of lines.slice(0, 5)) {
    if (/^(?:invoice|tax\s*invoice|bill|receipt|statement|original|duplicate|gstin|cin|date|bill\s*to|ship\s*to|customer|order|p\.?o\.?)/i.test(line)) {
      continue;
    }
    if (line.length >= 3 && line.length <= 40 && !/[0-9]{3,}/.test(line)) {
      const candidate = cleanMerchantCandidate(line);
      if (candidate) {
        return {
          merchantName: {
            value: candidate,
            evidenceText: line,
            page: 1,
            confidence: 75,
            status: 'medium',
          },
          serviceName: {
            value: `${candidate} Service`,
            evidenceText: line,
            page: 1,
            confidence: 65,
            status: 'medium',
          },
          category: detectCategory(cleanDoc + ' ' + candidate),
        };
      }
    }
  }

  // 5. Filename clean candidate as fallback (ignoring generic scan/doc terms)
  const cleanFilename = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_\-+]/g, ' ')
    .replace(/statement|invoice|receipt|tax|bill|oct|nov|dec|jan|202[4-9]|pdf|png|jpg|jpeg|scan|unknown|document|doc|upload|unnamed|image|img|screenshot/gi, '')
    .trim();

  if (cleanFilename.length >= 2 && /[a-zA-Z]{2,}/.test(cleanFilename) && !/^(?:file|new|temp)$/i.test(cleanFilename)) {
    const formatted = cleanFilename
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return {
      merchantName: {
        value: formatted,
        evidenceText: `Filename: ${filename}`,
        page: 1,
        confidence: 65,
        status: 'low',
      },
      serviceName: {
        value: `${formatted} Service`,
        evidenceText: `Filename: ${filename}`,
        page: 1,
        confidence: 60,
        status: 'low',
      },
      category: detectCategory(cleanDoc + ' ' + formatted),
    };
  }

  // Missing / Unknown
  return {
    merchantName: {
      value: null,
      evidenceText: null,
      page: 1,
      confidence: 0,
      status: 'missing',
    },
    serviceName: {
      value: null,
      evidenceText: null,
      page: 1,
      confidence: 0,
      status: 'missing',
    },
    category: 'Software & Tools',
  };
}

function cleanMerchantCandidate(str: string): string | null {
  const clean = str
    .replace(/["'#*<>~@!?^&+=/\\|~`%$;:]+/g, '')
    .replace(/\b(?:ltd|pvt|limited|inc|corp|corporation|llc|gmbh|co\.)\b\.?/gi, '')
    .trim();
  if (clean.length < 2 || clean.length > 40) return null;
  if (!/[a-zA-Z]{2,}/.test(clean)) return null;
  if (/^(?:date|total|amount|invoice|receipt|statement|tax|gstin|pan|order|subtotal|bill|usd|inr|eur|gbp)$/i.test(clean)) {
    return null;
  }
  return clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function detectCategory(text: string): SubscriptionCategory {
  const lower = text.toLowerCase();
  if (/netflix|spotify|disney|hotstar|hulu|prime\s*video|youtube|music|streaming|entertain/i.test(lower)) {
    return 'Streaming & Ent';
  }
  if (/cloud|aws|amazon\s*web|azure|gcp|google\s*cloud|hosting|server|hostinger|godaddy|storage|telecom|broadband|wifi|jio|airtel/i.test(lower)) {
    return 'Utilities & Cloud';
  }
  if (/ai|gpt|chatgpt|openai|claude|anthropic|perplexity|midjourney|copilot|intelligence|anysphere|model/i.test(lower)) {
    return 'Ai Assist';
  }
  if (/figma|canva|adobe|creative|photoshop|illustrator|design|vector|framer|webflow/i.test(lower)) {
    return 'Design';
  }
  if (/slack|notion|zoom|microsoft|office|workspace|asana|jira|trello|linear|grammarly|productivity/i.test(lower)) {
    return 'Productivity';
  }
  if (/swiggy|zomato|blinkit|zepto|gym|fit|cult|health|food/i.test(lower)) {
    return 'Other Misc';
  }
  return 'Software & Tools';
}

// =========================================================================
// 4. AMOUNT & CURRENCY EXTRACTION (STRICT GRAND TOTAL PRIORITIZATION)
// =========================================================================

/**
 * Parses numeric monetary values supporting decimal point (1,499.00) and European decimal comma (1.499,00).
 */
export function parseMonetaryValue(str: string): number | null {
  if (!str) return null;
  const clean = str.trim().replace(/\s+/g, '');
  // European format: 1.499,00 or 17,99 (comma as decimal separator)
  if (/\d+\.\d{3},\d{2}/.test(clean) || /^\d+,\d{1,2}$/.test(clean)) {
    const val = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    return isNaN(val) ? null : val;
  }
  // Standard format: 1,499.00 or 1499.00
  const val = parseFloat(clean.replace(/,/g, ''));
  return isNaN(val) ? null : val;
}

export function isLikelyYearOrId(val: number, contextText: string): boolean {
  if (val >= 2020 && val <= 2030 && Number.isInteger(val)) {
    // If the text surrounding it mentions date/year/month or has date punctuation, it's a year
    if (/(?:date|year|202[0-9]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(contextText)) {
      return true;
    }
  }
  return false;
}

export function extractTotalAmountAndCurrency(
  text: string,
  filename: string,
  userPreferredCurrency: Currency = 'USD'
): {
  totalAmount: ExtractedField<number>;
  currency: ExtractedField<Currency>;
  subtotal: ExtractedField<number>;
  taxAmount: ExtractedField<number>;
  detectedAmounts: number[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);
  const detectedAmounts: number[] = [];

  let extractedTotal: number | null = null;
  let totalEvidence: string | null = null;
  let totalPage = 1;
  let totalConfidence = 0;

  let extractedSubtotal: number | null = null;
  let subtotalEvidence: string | null = null;

  let extractedTax: number | null = null;
  let taxEvidence: string | null = null;

  let explicitCurrency: Currency | null = null;
  let currencyEvidence: string | null = null;

  // Regex specifically targeting final totals
  const finalTotalRegex = /(?:grand\s*total|final\s*amount\s*(?:due|paid|charged|payable)?|total\s*amount\s*(?:due|paid|charged|payable)?|total\s*payable|net\s*payable|final\s*total|amount\s*paid|amount\s*due|total\s*charged|total\s*billed|invoice\s*total|total\s*pay[eé]|total\s*[:=]|total\s+amt|total|paid|amount)(?:\s*\([^)]*\))?[:\s]*([₹$€£]|inr|usd|eur|gbp|rs\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?|[0-9]{1,6})\s*([₹$€£]|inr|usd|eur|gbp|\/-)?/i;
  const subtotalRegex = /(?:subtotal|sub-total|sub\s+total|net\s*subtotal|net\s*amount|taxable\s*value)[:\s]*([₹$€£]|inr|usd|eur|gbp|rs\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?|[0-9]{1,6})\s*([₹$€£]|inr|usd|eur|gbp|\/-)?/i;
  const taxRegex = /(?:(?:total\s*)?tax|gst|igst|cgst\s*\+\s*sgst|cgst|sgst|vat|tva)(?:\s*(?:@|at)?\s*\(?[0-9]+%?\)?|\s*\([^)]*\))?[:\s]*([₹$€£]|inr|usd|eur|gbp|rs\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?|[0-9]{1,6})\s*([₹$€£]|inr|usd|eur|gbp|\/-)?/i;

  // Pass 1: Line-by-line inspection
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Subtotal
    if (!extractedSubtotal) {
      const sm = trimmed.match(subtotalRegex);
      if (sm && sm[2]) {
        const val = parseMonetaryValue(sm[2]);
        if (val && val > 0 && !isLikelyYearOrId(val, trimmed)) {
          extractedSubtotal = val;
          subtotalEvidence = trimmed;
        }
      }
    }

    // Tax
    if (!extractedTax) {
      const tm = trimmed.match(taxRegex);
      if (tm && tm[2]) {
        const val = parseMonetaryValue(tm[2]);
        if (val && val > 0 && !isLikelyYearOrId(val, trimmed)) {
          extractedTax = val;
          taxEvidence = trimmed;
        }
      }
    }

    // Determine if this line is purely an intermediate line (e.g. Subtotal, Discount, standalone Tax)
    // CRITICAL: A line like "Total (incl. GST): ₹1,180.00" has "gst" but IS a Grand Total line!
    // So only skip if it is NOT a Grand Total line.
    const isTotalCandidate = /(?:grand\s*total|final\s*amount|total\s*amount|amount\s*paid|total\s*charged|total\s*paid|net\s*payable|total\s*payable|invoice\s*total|total\s*billed|amount\s*due|total\s*due|\btotal\b|\bpaid\b)/i.test(trimmed);
    const isPureIntermediate = !isTotalCandidate && /^(?:subtotal|sub-total|sub\s+total|net\s*subtotal|discount|promo|coupon|convenience|balance\s*due|fee)\b/i.test(trimmed);

    if (isPureIntermediate) {
      continue;
    }

    // Final Total check on current line
    if (!extractedTotal) {
      const tm = trimmed.match(finalTotalRegex);
      if (tm && tm[2]) {
        const val = parseMonetaryValue(tm[2]);
        if (val && val > 0 && !isLikelyYearOrId(val, trimmed)) {
          extractedTotal = val;
          totalEvidence = trimmed;
          totalConfidence = 95;
          detectedAmounts.push(val);

          // Check currency symbol on line (prefix or suffix)
          const sym = ((tm[1] || tm[3] || '') + '').toLowerCase();
          if (sym === '$' || sym === 'usd' || trimmed.includes('$')) {
            explicitCurrency = 'USD';
            currencyEvidence = tm[1] || tm[3] || '$';
          } else if (sym === '€' || sym === 'eur' || trimmed.includes('€')) {
            explicitCurrency = 'EUR';
            currencyEvidence = tm[1] || tm[3] || '€';
          } else if (sym === '£' || sym === 'gbp' || trimmed.includes('£')) {
            explicitCurrency = 'GBP';
            currencyEvidence = tm[1] || tm[3] || '£';
          } else if (sym === '₹' || sym.includes('rs') || sym === 'inr' || trimmed.includes('₹')) {
            explicitCurrency = 'INR';
            currencyEvidence = tm[1] || tm[3] || '₹';
          }
        }
      } else if (isTotalCandidate && i + 1 < lines.length) {
        // Multi-line table support: Header on line i ("Total Amount Due:"), amount on line i + 1 ("₹1,499.00")
        const nextLine = lines[i + 1].trim();
        const nextMatch = nextLine.match(/^([₹$€£]|inr|usd|eur|gbp|rs\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?|[0-9]{1,6})\s*([₹$€£]|inr|usd|eur|gbp|\/-)?$/i);
        if (nextMatch && nextMatch[2]) {
          const val = parseMonetaryValue(nextMatch[2]);
          if (val && val > 0 && !isLikelyYearOrId(val, nextLine)) {
            extractedTotal = val;
            totalEvidence = `${trimmed} -> ${nextLine}`;
            totalConfidence = 92;
            detectedAmounts.push(val);

            const sym = ((nextMatch[1] || nextMatch[3] || '') + '').toLowerCase();
            if (sym === '$' || sym === 'usd' || nextLine.includes('$')) explicitCurrency = 'USD';
            else if (sym === '€' || sym === 'eur' || nextLine.includes('€')) explicitCurrency = 'EUR';
            else if (sym === '£' || sym === 'gbp' || nextLine.includes('£')) explicitCurrency = 'GBP';
            else if (sym === '₹' || sym.includes('rs') || sym === 'inr' || nextLine.includes('₹')) explicitCurrency = 'INR';
          }
        }
      }
    }
  }

  // Pass 2: Mathematical verification if Subtotal and Tax were found
  if (extractedSubtotal && extractedTax && extractedTotal) {
    const expectedTotal = extractedSubtotal + extractedTax;
    // If the difference is negligible, confidence is 98%
    if (Math.abs(expectedTotal - extractedTotal) < 1.0) {
      totalConfidence = 98;
    } else if (extractedTotal === extractedSubtotal && extractedTotal < expectedTotal) {
      // Detected amount accidentally picked subtotal instead of grand total
      extractedTotal = Math.round(expectedTotal * 100) / 100;
      totalEvidence = `Calculated Grand Total (Subtotal ${extractedSubtotal} + Tax ${extractedTax})`;
      totalConfidence = 92;
      warnings.push('Validated total amount against subtotal and taxes.');
    }
  }

  // Pass 3: Fallback calculation & symbol pattern search if no explicit final total line matched
  if (!extractedTotal && extractedSubtotal && extractedTax) {
    extractedTotal = Math.round((extractedSubtotal + extractedTax) * 100) / 100;
    totalEvidence = `Calculated Total (Subtotal ${extractedSubtotal} + Tax ${extractedTax})`;
    totalConfidence = 90;
    detectedAmounts.push(extractedTotal);
    warnings.push('Final total calculated from extracted subtotal and tax amounts.');
  }

  if (!extractedTotal) {
    // Search for numbers preceded OR followed by currency symbols
    const prefixMatches = text.matchAll(/(?:₹|rs\.?|inr|usd|eur|gbp|\$|€|£)\s*([0-9]{1,3}(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?)/gi);
    const suffixMatches = text.matchAll(/([0-9]{1,3}(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?)\s*(?:₹|rs\.?|inr|usd|eur|gbp|\$|€|£|\/-)/gi);
    
    const candidateAmounts: number[] = [];
    for (const sm of prefixMatches) {
      const val = parseMonetaryValue(sm[1]);
      if (val && val > 0 && !isLikelyYearOrId(val, text)) {
        candidateAmounts.push(val);
        detectedAmounts.push(val);
      }
    }
    for (const sm of suffixMatches) {
      const val = parseMonetaryValue(sm[1]);
      if (val && val > 0 && !isLikelyYearOrId(val, text)) {
        candidateAmounts.push(val);
        detectedAmounts.push(val);
      }
    }

    if (candidateAmounts.length > 0) {
      // Prioritize the maximum monetary figure since Total >= Subtotal
      extractedTotal = Math.max(...candidateAmounts);
      totalEvidence = `Extracted from document values: ${extractedTotal}`;
      totalConfidence = 75;
      warnings.push('Final total line was ambiguous; selected highest verified monetary amount.');
    } else {
      warnings.push('Amount not detected in invoice.');
    }
  }

  // Check currency cues from full document
  let finalCurrency: Currency = userPreferredCurrency;
  let currencyConfidence = 70;

  if (explicitCurrency) {
    finalCurrency = explicitCurrency;
    currencyConfidence = 95;
  } else if (/₹|\brs\.?\b|\binr\b|\bgstin\b|\bupi\b/i.test(text) || /inr|rupee|rs/i.test(filename)) {
    finalCurrency = 'INR';
    currencyConfidence = 90;
    currencyEvidence = 'Document context: INR / Indian tax & payment format';
  } else if (/\$|\busd\b/i.test(text)) {
    finalCurrency = 'USD';
    currencyConfidence = 85;
    currencyEvidence = 'Document symbol: $ (USD)';
  } else if (/€|\beur\b/i.test(text)) {
    finalCurrency = 'EUR';
    currencyConfidence = 85;
    currencyEvidence = 'Document symbol: € (EUR)';
  } else if (/£|\bgbp\b/i.test(text)) {
    finalCurrency = 'GBP';
    currencyConfidence = 85;
    currencyEvidence = 'Document symbol: £ (GBP)';
  }

  return {
    totalAmount: {
      value: extractedTotal,
      evidenceText: totalEvidence,
      page: totalPage,
      confidence: totalConfidence,
      status: totalConfidence >= 85 ? 'high' : totalConfidence >= 65 ? 'medium' : extractedTotal ? 'low' : 'missing',
    },
    currency: {
      value: finalCurrency,
      evidenceText: currencyEvidence,
      page: 1,
      confidence: currencyConfidence,
      status: currencyConfidence >= 85 ? 'high' : 'medium',
    },
    subtotal: {
      value: extractedSubtotal,
      evidenceText: subtotalEvidence,
      page: 1,
      confidence: extractedSubtotal ? 90 : 0,
      status: extractedSubtotal ? 'high' : 'missing',
    },
    taxAmount: {
      value: extractedTax,
      evidenceText: taxEvidence,
      page: 1,
      confidence: extractedTax ? 90 : 0,
      status: extractedTax ? 'high' : 'missing',
    },
    detectedAmounts: Array.from(new Set(detectedAmounts)),
    warnings,
  };
}

// =========================================================================
// 5. PAYMENT METHOD EXTRACTION (STRICT EVIDENCE-BASED ONLY)
// =========================================================================

/**
 * Extracts payment method ONLY when there is actual evidence in the document.
 * Returns null and status 'missing' when no payment method is stated.
 * Solves Problem #3: Never assumes a card or payment mode without evidence!
 */
export function extractPaymentMethod(text: string): ExtractedField<string> {
  const clean = sanitizePdfExtractedText(text);

  // 1. Bank + Card Type + Last 4 Digits (e.g. "HDFC Bank Visa ending in 4090")
  const bankCardMatch = clean.match(/\b(hdfc|sbi|icici|axis|kotak|pnb|citi|chase|bofa|barclays|hsbc)\b[^\r\n0-9]*\b(visa|mastercard|rupay|amex|credit|debit)\b[^\r\n0-9]*(\d{4})\b/i);
  if (bankCardMatch) {
    const bank = bankCardMatch[1].toUpperCase();
    const brand = bankCardMatch[2].charAt(0).toUpperCase() + bankCardMatch[2].slice(1).toLowerCase();
    const last4 = bankCardMatch[3];
    return {
      value: `${bank} ${brand} •••• ${last4}`,
      evidenceText: bankCardMatch[0],
      page: 1,
      confidence: 96,
      status: 'high',
    };
  }

  // 2. Specific Card Brand + Last 4 (e.g. "Visa ending in 4090" or "Mastercard •••• 1234")
  const cardBrandMatch = clean.match(/\b(visa|mastercard|master\s*card|amex|american\s*express|rupay|discover|diners)\b[^\r\n0-9]*(\d{4})\b/i);
  if (cardBrandMatch) {
    const brand = cardBrandMatch[1].replace(/\s+/g, ' ').trim();
    const cleanBrand = brand
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    const last4 = cardBrandMatch[2];
    return {
      value: `${cleanBrand} •••• ${last4}`,
      evidenceText: cardBrandMatch[0],
      page: 1,
      confidence: 94,
      status: 'high',
    };
  }

  // 3. Generic "Card ending in 4092" or "Credit Card ending in 4092" / French "Carte bancaire ... terminant par 5521"
  const genericCardMatch = clean.match(/(?:credit\s*card|debit\s*card|card|carte\s*bancaire|carte|account|a\/c)\b[^\r\n0-9]*(?:ending\s*in|ending\s*with|ending|terminant\s*par|terminant|finissant\s*par|••|\*\*|\.\.|\s+)[^\r\n0-9]*(\d{4})\b/i);
  if (genericCardMatch) {
    return {
      value: `Card •••• ${genericCardMatch[1]}`,
      evidenceText: genericCardMatch[0],
      page: 1,
      confidence: 88,
      status: 'high',
    };
  }

  // 4. Standalone 4 digits preceded by asterisks/dots: e.g. "•••• 4090" or "**** 4090"
  const dotCardMatch = clean.match(/(?:••|\*\*|\.\.|\*{2,}|•{2,})\s*(\d{4})\b/);
  if (dotCardMatch) {
    return {
      value: `Card •••• ${dotCardMatch[1]}`,
      evidenceText: dotCardMatch[0],
      page: 1,
      confidence: 85,
      status: 'high',
    };
  }

  // 5. UPI / AutoPay Handles & Apps
  const upiIdMatch = clean.match(/\b([a-zA-Z0-9.\-_]{2,25}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|ibl|apl|axl|upi))\b/i);
  if (upiIdMatch) {
    return {
      value: `UPI AutoPay (${upiIdMatch[1]})`,
      evidenceText: upiIdMatch[0],
      page: 1,
      confidence: 94,
      status: 'high',
    };
  }
  if (/\b(?:google\s*pay|gpay)\b/i.test(clean)) {
    return {
      value: 'UPI AutoPay (Google Pay)',
      evidenceText: 'Google Pay AutoPay',
      page: 1,
      confidence: 90,
      status: 'high',
    };
  }
  if (/\bphonepe\b/i.test(clean)) {
    return {
      value: 'UPI AutoPay (PhonePe)',
      evidenceText: 'PhonePe AutoPay',
      page: 1,
      confidence: 90,
      status: 'high',
    };
  }
  if (/\bpaytm\b/i.test(clean)) {
    return {
      value: 'UPI AutoPay (Paytm)',
      evidenceText: 'Paytm AutoPay',
      page: 1,
      confidence: 90,
      status: 'high',
    };
  }
  if (/\b(?:upi\s*autopay|e-mandate|standing\s*instruction|nach\s*mandate|upi\s*mandate)\b/i.test(clean)) {
    return {
      value: 'UPI AutoPay',
      evidenceText: 'UPI AutoPay / e-Mandate',
      page: 1,
      confidence: 88,
      status: 'high',
    };
  }

  // 6. Digital Wallets
  if (/\bapple\s*pay\b/i.test(clean)) {
    return {
      value: 'Apple Pay',
      evidenceText: 'Apple Pay',
      page: 1,
      confidence: 90,
      status: 'high',
    };
  }
  if (/\bpaypal\b/i.test(clean)) {
    return {
      value: 'PayPal',
      evidenceText: 'PayPal',
      page: 1,
      confidence: 90,
      status: 'high',
    };
  }
  if (/\b(?:bank\s*transfer|wire\s*transfer|direct\s*debit|ach\s*transfer)\b/i.test(clean)) {
    return {
      value: 'Bank Transfer',
      evidenceText: 'Bank Transfer / Direct Debit',
      page: 1,
      confidence: 85,
      status: 'high',
    };
  }

  // NO PAYMENT METHOD FOUND IN DOCUMENT: Return null! Never invent or guess.
  return {
    value: null,
    evidenceText: null,
    page: 1,
    confidence: 0,
    status: 'missing',
  };
}

// =========================================================================
// 6. INVOICE NUMBER, DATES, CADENCE & BILLING PERIOD
// =========================================================================

export function extractInvoiceNumber(text: string): ExtractedField<string> {
  const clean = sanitizePdfExtractedText(text);
  const regexes = [
    /(?:invoice\s*(?:number|no\.?|#|id)|inv\s*#|bill\s*(?:no\.?|#)|receipt\s*(?:no\.?|#))[:\s]*([a-zA-Z0-9\-_/]{4,30})\b/i,
    /#\s*([0-9]{5,15})\b/,
  ];

  for (const re of regexes) {
    const match = clean.match(re);
    if (match && match[1]) {
      return {
        value: match[1].trim(),
        evidenceText: match[0],
        page: 1,
        confidence: 92,
        status: 'high',
      };
    }
  }

  return {
    value: null,
    evidenceText: null,
    page: 1,
    confidence: 0,
    status: 'missing',
  };
}

export function extractDatesAndPeriod(
  text: string,
  cadence?: 'monthly' | 'yearly' | null
): {
  invoiceDate: ExtractedField<string>;
  billingPeriod: ExtractedField<string>;
  renewalDate: ExtractedField<string>;
  billingFrequency: ExtractedField<'monthly' | 'yearly' | 'quarterly' | 'weekly'>;
} {
  const clean = sanitizePdfExtractedText(text);

  // 1. Cadence / Frequency
  let freq: 'monthly' | 'yearly' | 'quarterly' | 'weekly' | null = null;
  let freqEvidence: string | null = null;
  if (/yearly|annual|annually|per\s*year|\/yr|\/year|12\s*months/i.test(clean)) {
    freq = 'yearly';
    freqEvidence = 'Annual / Yearly frequency detected';
  } else if (/quarterly|every\s*3\s*months|\/quarter/i.test(clean)) {
    freq = 'quarterly';
    freqEvidence = 'Quarterly billing detected';
  } else if (/weekly|every\s*week|\/wk/i.test(clean)) {
    freq = 'weekly';
    freqEvidence = 'Weekly billing detected';
  } else if (/monthly|per\s*month|\/mo|\/month|every\s*month/i.test(clean)) {
    freq = 'monthly';
    freqEvidence = 'Monthly billing detected';
  }

  // 2. Billing Period range (e.g. "Billing Period: Oct 12, 2026 - Nov 11, 2026")
  let periodVal: string | null = null;
  let periodEvidence: string | null = null;
  let derivedRenewalFromPeriod: string | null = null;

  const periodMatch = clean.match(/(?:billing\s*period|service\s*period|coverage\s*period|period|dates\s*of\s*service)[:\s]*([^\r\n]+)/i);
  if (periodMatch && periodMatch[1]) {
    periodVal = periodMatch[1].trim();
    periodEvidence = periodMatch[0];
    const parts = periodVal.split(/\s+(?:to|thru|through|–|-)\s+/i);
    if (parts.length >= 2) {
      const endPart = parts[parts.length - 1];
      const parsedEnd = parseDateStringToIso(endPart);
      if (parsedEnd) {
        derivedRenewalFromPeriod = parsedEnd;
      }
    }
  }

  // 3. Explicit Invoice Date
  let invDateVal: string | null = null;
  let invDateEvidence: string | null = null;
  const invDateMatch = clean.match(/(?:invoice\s*date|bill\s*date|date\s*of\s*issue|issue\s*date|billing\s*date|statement\s*date|transaction\s*date|\bdate)[:\s]*([^\r\n;]+)/i);
  if (invDateMatch && invDateMatch[1]) {
    const parsed = parseDateStringToIso(invDateMatch[1]);
    if (parsed) {
      invDateVal = parsed;
      invDateEvidence = invDateMatch[0];
    }
  }

  // 4. Renewal / Next Billing Date
  let renewalVal: string | null = null;
  let renewalEvidence: string | null = null;
  let renewalConfidence = 0;

  const explicitRenewal = clean.match(/(?:next\s*billing\s*(?:date)?|next\s*charge\s*(?:date)?|next\s*renewal\s*(?:date)?|next\s*invoice\s*(?:date)?|renewal\s*date|renews\s*on|renews\s*at|auto[- ]?renews\s*on|auto[- ]?debit\s*date|payment\s*due\s*date|due\s*date|valid\s*thru|valid\s*until|expires\s*on)[:\s]*([^\r\n;]+)/i);
  if (explicitRenewal && explicitRenewal[1]) {
    const parsed = parseDateStringToIso(explicitRenewal[1]);
    if (parsed) {
      renewalVal = parsed;
      renewalEvidence = explicitRenewal[0];
      renewalConfidence = 95;
    }
  } else if (derivedRenewalFromPeriod) {
    renewalVal = derivedRenewalFromPeriod;
    renewalEvidence = `Derived from billing period: ${periodVal}`;
    renewalConfidence = 88;
  } else {
    // NEVER invent a renewal date when document does not state one!
    renewalVal = null;
    renewalEvidence = null;
    renewalConfidence = 0;
  }

  return {
    invoiceDate: {
      value: invDateVal,
      evidenceText: invDateEvidence,
      page: 1,
      confidence: invDateVal ? 94 : 0,
      status: invDateVal ? 'high' : 'missing',
    },
    billingPeriod: {
      value: periodVal,
      evidenceText: periodEvidence,
      page: 1,
      confidence: periodVal ? 90 : 0,
      status: periodVal ? 'high' : 'missing',
    },
    renewalDate: {
      value: renewalVal,
      evidenceText: renewalEvidence,
      page: 1,
      confidence: renewalConfidence,
      status: renewalConfidence >= 85 ? 'high' : renewalConfidence >= 65 ? 'medium' : renewalVal ? 'low' : 'missing',
    },
    billingFrequency: {
      value: freq,
      evidenceText: freqEvidence,
      page: 1,
      confidence: freq ? 90 : 0,
      status: freq ? 'high' : 'missing',
    },
  };
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export function parseDateStringToIso(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^(?:on|at|date|[:\s-])+/i, '').trim();

  // 1. ISO: YYYY-MM-DD
  const isoMatch = clean.match(/\b(202[4-9]|203[0-9])[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12][0-9]|3[01])\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Named month: "Oct 12, 2026" or "12 October 2026"
  const mdyNamed = clean.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(202[4-9]|203[0-9])\b/i);
  if (mdyNamed) {
    const m = MONTHS[mdyNamed[1].toLowerCase()];
    if (m) {
      const y = parseInt(mdyNamed[3], 10);
      const d = String(parseInt(mdyNamed[2], 10)).padStart(2, '0');
      return `${y}-${String(m).padStart(2, '0')}-${d}`;
    }
  }

  const dmyNamed = clean.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-_]+([a-z]{3,9})[\s\-_,]+(202[4-9]|203[0-9])\b/i);
  if (dmyNamed) {
    const m = MONTHS[dmyNamed[2].toLowerCase()];
    if (m) {
      const y = parseInt(dmyNamed[3], 10);
      const d = String(parseInt(dmyNamed[1], 10)).padStart(2, '0');
      return `${y}-${String(m).padStart(2, '0')}-${d}`;
    }
  }

  // 3. Numeric: DD/MM/YYYY or MM/DD/YYYY
  const numMatch = clean.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](202[4-9]|203[0-9])\b/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    const yr = parseInt(numMatch[3], 10);

    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
      month = p1;
      day = p2;
    }
    return `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

export function advanceIsoDate(isoDate: string, cadence: 'monthly' | 'yearly' | 'quarterly' | 'weekly'): string {
  const parts = isoDate.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10);

  if (cadence === 'yearly') {
    year += 1;
  } else if (cadence === 'quarterly') {
    month += 3;
    if (month > 12) {
      month -= 12;
      year += 1;
    }
  } else if (cadence === 'weekly') {
    day += 7;
    const maxDays = new Date(year, month, 0).getDate();
    if (day > maxDays) {
      day -= maxDays;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const maxDays = new Date(year, month, 0).getDate();
    if (day > maxDays) day = maxDays;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// =========================================================================
// 7. COMPREHENSIVE DOCUMENT PROCESSOR (MAIN ENTRY POINT)
// =========================================================================

export async function processInvoiceDocument(
  file: File,
  onProgress?: (msg: string) => void,
  userPreferredCurrency: Currency = 'USD'
): Promise<InvoiceExtractionResult> {
  const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');
  const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';

  let rawText = '';
  let pagesText: string[] = [];

  if (isPdf) {
    onProgress?.('Extracting text streams and inspecting multi-page structure...');
    const pdfData = await extractTextFromPdf(file);
    rawText = pdfData.text;
    pagesText = pdfData.pages;
  } else if (isImage) {
    onProgress?.('Performing OCR scanning on uploaded invoice image...');
    rawText = await extractTextFromImage(file, onProgress);
    pagesText = [rawText];
  } else if (isCsv) {
    onProgress?.('Reading statement CSV records...');
    rawText = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string) || '');
      r.onerror = () => res('');
      r.readAsText(file);
    });
    pagesText = [rawText];
  } else {
    rawText = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string) || '');
      r.onerror = () => res('');
      r.readAsText(file);
    });
    pagesText = [rawText];
  }

  onProgress?.('Identifying invoice issuer, amounts, payment rails, and dates...');

  // Combine document text with filename for edge cases
  const docCombinedText = (rawText + '\n' + file.name).trim();

  // 1. Identify Merchant & Service
  const merchantInfo = identifyMerchant(docCombinedText, file.name);

  // 2. Identify Total Amount, Subtotal, Tax, and Currency
  const amountInfo = extractTotalAmountAndCurrency(docCombinedText, file.name, userPreferredCurrency);

  // 3. Identify Payment Method (Strict evidence only)
  const paymentMethodInfo = extractPaymentMethod(docCombinedText);

  // 4. Identify Invoice Number
  const invoiceNumberInfo = extractInvoiceNumber(docCombinedText);

  // 5. Identify Dates and Cadence (Never assume monthly!)
  const datesInfo = extractDatesAndPeriod(docCombinedText, null);

  const warnings = [...amountInfo.warnings];
  if (paymentMethodInfo.status === 'missing') {
    warnings.push('Payment method is not explicitly stated in this invoice.');
  }
  if (!merchantInfo.merchantName.value) {
    warnings.push('Invoice issuer could not be determined with high confidence.');
  }
  if (datesInfo.billingFrequency.status === 'missing') {
    warnings.push('Billing frequency is not explicitly specified in this invoice.');
  }
  if (datesInfo.renewalDate.status === 'missing') {
    warnings.push('Next renewal date is not stated in this invoice.');
  }

  return {
    documentName: file.name,
    fileSize: file.size,
    mimeType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
    pageCount: Math.max(1, pagesText.length),
    serviceName: merchantInfo.serviceName,
    merchantName: merchantInfo.merchantName,
    invoiceNumber: invoiceNumberInfo,
    invoiceDate: datesInfo.invoiceDate,
    totalAmount: amountInfo.totalAmount,
    currency: amountInfo.currency,
    subtotal: amountInfo.subtotal,
    taxAmount: amountInfo.taxAmount,
    paymentMethod: paymentMethodInfo,
    billingFrequency: datesInfo.billingFrequency,
    billingPeriod: datesInfo.billingPeriod,
    renewalDate: datesInfo.renewalDate,
    rawText,
    pagesText,
    warnings,
    detectedAmounts: amountInfo.detectedAmounts,
  };
}
