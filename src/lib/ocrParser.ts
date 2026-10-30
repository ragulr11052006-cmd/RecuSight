import { createWorker } from 'tesseract.js';
import { SubscriptionCategory, Currency } from '../types';
import { processInvoiceDocument, InvoiceExtractionResult, sanitizePdfExtractedText, identifyMerchant, isValidMerchantName, cleanMerchantCandidate } from './invoiceExtractor';

export interface ParsedTransaction {
  merchantName: string;
  rawString: string;
  amount: number | null;
  amountStatus?: 'verified' | 'uncertain' | 'not_found' | 'edited';
  currency: Currency;
  date: string | null;
  renewalDate?: string | null;
  paymentSource?: string | null;
  cadence: 'monthly' | 'yearly' | 'unknown';
  category: SubscriptionCategory;
  confidence: number;
  isDuplicate: boolean;
  duplicateMerchant?: string;
  isRecurring: boolean;
  notes?: string;
  detectedAmounts?: number[];
  ocrSnippet?: string;
  invoiceNumber?: string;
  subtotal?: number;
  taxAmount?: number;
  paymentMethodConfidence?: number;
  extractionResult?: InvoiceExtractionResult;
  amountEvidence?: string | null;
  merchantEvidence?: string | null;
}

// Exchange rates for live currency switching
export const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  USD: { USD: 1, INR: 86.5, EUR: 0.92, GBP: 0.79 },
  INR: { USD: 0.0116, INR: 1, EUR: 0.0107, GBP: 0.0091 },
  EUR: { USD: 1.087, INR: 94.0, EUR: 1, GBP: 0.86 },
  GBP: { USD: 1.266, INR: 109.5, EUR: 1.16, GBP: 1 },
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to || !amount || isNaN(amount)) return amount;
  const rate = EXCHANGE_RATES[from]?.[to] || 1;
  const converted = amount * rate;
  return Math.round(converted * 100) / 100;
}

// Comprehensive dictionary of top subscription & SaaS merchants
export const KNOWN_MERCHANTS: {
  patterns: RegExp[];
  name: string;
  category: SubscriptionCategory;
  cadence: 'monthly' | 'yearly';
  defaultAmounts: Record<Currency, number>;
}[] = [
  // Streaming & Entertainment
  {
    patterns: [/netflix/i, /netflix\.com/i],
    name: 'Netflix Premium',
    category: 'Streaming & Ent',
    cadence: 'monthly',
    defaultAmounts: { USD: 19.99, INR: 649, EUR: 17.99, GBP: 15.99 },
  },
  {
    patterns: [/spotify/i],
    name: 'Spotify Premium',
    category: 'Streaming & Ent',
    cadence: 'monthly',
    defaultAmounts: { USD: 10.99, INR: 119, EUR: 10.99, GBP: 10.99 },
  },
  {
    patterns: [/youtube\s*premium/i, /google\s*\*youtube/i, /youtube/i],
    name: 'YouTube Premium',
    category: 'Streaming & Ent',
    cadence: 'monthly',
    defaultAmounts: { USD: 13.99, INR: 149, EUR: 12.99, GBP: 11.99 },
  },
  {
    patterns: [/amazon\s*prime/i, /prime\s*video/i, /\bamzn\b/i],
    name: 'Amazon Prime',
    category: 'Entertainment',
    cadence: 'monthly',
    defaultAmounts: { USD: 14.99, INR: 299, EUR: 12.99, GBP: 11.99 },
  },
  {
    patterns: [/disney/i, /hotstar/i],
    name: 'Disney+ Hotstar Super',
    category: 'Streaming & Ent',
    cadence: 'monthly',
    defaultAmounts: { USD: 12.99, INR: 899, EUR: 11.99, GBP: 10.99 },
  },
  {
    patterns: [/apple\s*music/i],
    name: 'Apple Music',
    category: 'Streaming & Ent',
    cadence: 'monthly',
    defaultAmounts: { USD: 10.99, INR: 99, EUR: 10.99, GBP: 10.99 },
  },
  {
    patterns: [/audible/i],
    name: 'Audible Membership',
    category: 'Entertainment',
    cadence: 'monthly',
    defaultAmounts: { USD: 14.95, INR: 199, EUR: 9.95, GBP: 7.99 },
  },

  // AI & Developer Tools
  {
    patterns: [/chatgpt/i, /openai/i],
    name: 'ChatGPT Plus',
    category: 'Ai Assist',
    cadence: 'monthly',
    defaultAmounts: { USD: 20.00, INR: 1999, EUR: 18.50, GBP: 16.00 },
  },
  {
    patterns: [/cursor/i, /cursor\.sh/i, /anysphere/i],
    name: 'Cursor AI Pro',
    category: 'Ai Assist',
    cadence: 'monthly',
    defaultAmounts: { USD: 20.00, INR: 1750, EUR: 18.50, GBP: 16.00 },
  },
  {
    patterns: [/perplexity/i, /perplexity\.ai/i],
    name: 'Perplexity Pro',
    category: 'Ai Assist',
    cadence: 'monthly',
    defaultAmounts: { USD: 20.00, INR: 1750, EUR: 18.50, GBP: 16.00 },
  },
  {
    patterns: [/claude/i, /anthropic/i],
    name: 'Claude Pro',
    category: 'Ai Assist',
    cadence: 'monthly',
    defaultAmounts: { USD: 20.00, INR: 1750, EUR: 18.50, GBP: 16.00 },
  },
  {
    patterns: [/midjourney/i],
    name: 'Midjourney Standard',
    category: 'Ai Assist',
    cadence: 'monthly',
    defaultAmounts: { USD: 30.00, INR: 2500, EUR: 28.00, GBP: 24.00 },
  },
  {
    patterns: [/github/i, /copilot/i],
    name: 'GitHub Copilot',
    category: 'Software & Tools',
    cadence: 'monthly',
    defaultAmounts: { USD: 10.00, INR: 865, EUR: 9.20, GBP: 7.90 },
  },

  // Professional & Career
  {
    patterns: [
      /\blinkedin\b/i,
      /\blinkedin\.com\b/i,
      /\blinkedin\s*(?:ireland|corporation|premium|learning|recruiter|sales\s*navigator)\b/i,
    ],
    name: 'LinkedIn Premium',
    category: 'Software & Tools',
    cadence: 'monthly',
    defaultAmounts: { USD: 39.99, INR: 1499, EUR: 34.99, GBP: 29.99 },
  },

  // Design & Creative
  {
    patterns: [/figma/i],
    name: 'Figma Organization',
    category: 'Design',
    cadence: 'monthly',
    defaultAmounts: { USD: 15.00, INR: 1299, EUR: 14.00, GBP: 12.00 },
  },
  {
    patterns: [
      /\badobe\s*(?:systems|inc\.?|creative\s*cloud|systems\s*software|acrobat|photoshop|illustrator)\b/i,
      /\bcreative\s*cloud\s*(?:all\s*apps|photography|single\s*app)\b/i,
      /\bbilled\s*by\s*adobe\b/i,
      /\bpayment\s*to\s*adobe\b/i,
      /\bwww\.adobe\.com\b/i,
      /\badobe\.com\b/i,
    ],
    name: 'Adobe Creative Cloud',
    category: 'Design',
    cadence: 'monthly',
    defaultAmounts: { USD: 54.99, INR: 4230, EUR: 60.00, GBP: 49.99 },
  },
  {
    patterns: [/canva/i],
    name: 'Canva Pro',
    category: 'Design',
    cadence: 'monthly',
    defaultAmounts: { USD: 12.99, INR: 499, EUR: 11.99, GBP: 10.99 },
  },
  {
    patterns: [/framer/i],
    name: 'Framer Pro',
    category: 'Design',
    cadence: 'monthly',
    defaultAmounts: { USD: 20.00, INR: 1750, EUR: 18.00, GBP: 16.00 },
  },

  // Productivity & Collaboration
  {
    patterns: [/notion/i],
    name: 'Notion AI Plus',
    category: 'Productivity',
    cadence: 'monthly',
    defaultAmounts: { USD: 10.00, INR: 850, EUR: 9.20, GBP: 7.90 },
  },
  {
    patterns: [/slack/i],
    name: 'Slack Pro Workspace',
    category: 'Productivity',
    cadence: 'monthly',
    defaultAmounts: { USD: 8.75, INR: 750, EUR: 8.25, GBP: 7.00 },
  },
  {
    patterns: [/microsoft\s*365/i, /office\s*365/i],
    name: 'Microsoft 365 Family',
    category: 'Productivity',
    cadence: 'monthly',
    defaultAmounts: { USD: 9.99, INR: 619, EUR: 9.99, GBP: 8.99 },
  },
  {
    patterns: [/zoom/i, /zoom\.us/i],
    name: 'Zoom Pro',
    category: 'Productivity',
    cadence: 'monthly',
    defaultAmounts: { USD: 15.99, INR: 1320, EUR: 14.99, GBP: 12.99 },
  },
  {
    patterns: [/grammarly/i],
    name: 'Grammarly Premium',
    category: 'Productivity',
    cadence: 'monthly',
    defaultAmounts: { USD: 12.00, INR: 999, EUR: 11.00, GBP: 9.50 },
  },
  {
    patterns: [/1password/i],
    name: '1Password Family',
    category: 'Productivity',
    cadence: 'monthly',
    defaultAmounts: { USD: 4.99, INR: 399, EUR: 4.50, GBP: 3.99 },
  },
  {
    patterns: [/linear/i, /linear\.app/i],
    name: 'Linear Standard',
    category: 'Productivity',
    cadence: 'monthly',
    defaultAmounts: { USD: 8.00, INR: 690, EUR: 7.50, GBP: 6.50 },
  },

  // Cloud & Utilities
  {
    patterns: [/google\s*cloud/i, /gcp/i, /google\s*\*cloud/i],
    name: 'Google Cloud Platform',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 42.10, INR: 3640, EUR: 38.70, GBP: 33.20 },
  },
  {
    patterns: [/aws/i, /amazon\s*web\s*services/i],
    name: 'Amazon Web Services (AWS)',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 35.00, INR: 2999, EUR: 32.00, GBP: 28.00 },
  },
  {
    patterns: [/supabase/i],
    name: 'Supabase Pro Tier',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 25.00, INR: 2150, EUR: 23.00, GBP: 20.00 },
  },
  {
    patterns: [/vercel/i],
    name: 'Vercel Pro Team',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 20.00, INR: 1750, EUR: 18.50, GBP: 16.00 },
  },
  {
    patterns: [/digitalocean/i, /digital\s*ocean/i],
    name: 'DigitalOcean Droplet',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 12.00, INR: 999, EUR: 11.00, GBP: 9.50 },
  },
  {
    patterns: [/hostinger/i],
    name: 'Hostinger Business Web',
    category: 'Utilities & Cloud',
    cadence: 'yearly',
    defaultAmounts: { USD: 47.88, INR: 3588, EUR: 44.00, GBP: 38.00 },
  },
  {
    patterns: [/godaddy/i],
    name: 'GoDaddy Domains & Hosting',
    category: 'Utilities & Cloud',
    cadence: 'yearly',
    defaultAmounts: { USD: 22.99, INR: 1899, EUR: 21.00, GBP: 18.00 },
  },
  {
    patterns: [/apple/i, /icloud/i, /apple\.com/i],
    name: 'Apple iCloud+ & Services',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 9.99, INR: 219, EUR: 9.99, GBP: 8.99 },
  },

  // Food, Telecom & Everyday Utilities
  {
    patterns: [/swiggy/i, /swiggy\s*one/i],
    name: 'Swiggy One Billed',
    category: 'Other Misc',
    cadence: 'monthly',
    defaultAmounts: { USD: 3.99, INR: 299, EUR: 3.50, GBP: 2.99 },
  },
  {
    patterns: [/zomato/i, /zomato\s*gold/i],
    name: 'Zomato Gold',
    category: 'Other Misc',
    cadence: 'monthly',
    defaultAmounts: { USD: 3.99, INR: 299, EUR: 3.50, GBP: 2.99 },
  },
  {
    patterns: [/jiofiber/i, /reliance\s*jio/i, /\bjio\b/i],
    name: 'JioFiber Broadband',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 11.99, INR: 999, EUR: 10.99, GBP: 9.50 },
  },
  {
    patterns: [/airtel/i, /bharti\s*airtel/i],
    name: 'Airtel Xstream Fiber',
    category: 'Utilities & Cloud',
    cadence: 'monthly',
    defaultAmounts: { USD: 11.99, INR: 999, EUR: 10.99, GBP: 9.50 },
  },
  {
    patterns: [/tata\s*play/i, /tata\s*sky/i],
    name: 'Tata Play Billed',
    category: 'Streaming & Ent',
    cadence: 'monthly',
    defaultAmounts: { USD: 5.99, INR: 450, EUR: 5.50, GBP: 4.90 },
  },

  // Resellers & Billing Platforms
  {
    patterns: [/fastspring/i, /fs\*fastspring/i],
    name: 'FastSpring*Software',
    category: 'Software & Tools',
    cadence: 'yearly',
    defaultAmounts: { USD: 29.00, INR: 2499, EUR: 27.00, GBP: 23.00 },
  },
  {
    patterns: [/paddle/i, /paddle\.com/i],
    name: 'Paddle.com Market',
    category: 'Software & Tools',
    cadence: 'monthly',
    defaultAmounts: { USD: 19.00, INR: 1650, EUR: 17.50, GBP: 15.00 },
  },
  {
    patterns: [/stripe/i],
    name: 'Stripe Billing Commitment',
    category: 'Software & Tools',
    cadence: 'monthly',
    defaultAmounts: { USD: 25.00, INR: 2150, EUR: 23.00, GBP: 20.00 },
  },
  {
    patterns: [/razorpay/i],
    name: 'Razorpay Mandate',
    category: 'Software & Tools',
    cadence: 'monthly',
    defaultAmounts: { USD: 15.00, INR: 1299, EUR: 14.00, GBP: 12.00 },
  },
];

// =========================================================================
// MAIN ENTRY POINT: parseDocument
// =========================================================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function parseDocument(
  file: File,
  onProgress?: (msg: string) => void,
  userPreferredCurrency: Currency = 'USD'
): Promise<ParsedTransaction[]> {
  const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';

  if (isCsv) {
    if (onProgress) onProgress('Parsing CSV statement records...');
    return parseCsvFile(file);
  }

  // 1. Try Google Cloud Document AI via Supabase Edge Function if configured
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey && typeof window !== 'undefined' && typeof window.fetch === 'function') {
      if (onProgress) onProgress('Analyzing invoice with Google Cloud Document AI...');
      const base64 = await fileToBase64(file);
      const res = await fetch(`${supabaseUrl}/functions/v1/parse-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || 'application/pdf',
          documentName: file.name,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const doc = json.data;
          const currency = (doc.currency as Currency) || userPreferredCurrency;
          let hasValidMerchant = Boolean(doc.merchantName && isValidMerchantName(doc.merchantName));
          let merchantName = hasValidMerchant ? doc.merchantName : '';

          // If Document AI did not identify the merchant name for an unknown commodity,
          // extract the authentic merchant name from the local invoice document!
          if (!hasValidMerchant || !merchantName) {
            try {
              const localDoc = await processInvoiceDocument(file, undefined, userPreferredCurrency);
              if (localDoc.merchantName.value && isValidMerchantName(localDoc.merchantName.value)) {
                merchantName = localDoc.merchantName.value;
                hasValidMerchant = true;
              }
            } catch (fallbackErr) {
              console.warn('Local merchant extraction fallback failed:', fallbackErr);
            }
          }

          const confidence = doc.confidence !== undefined ? doc.confidence : (hasValidMerchant ? 85 : 40);
          const amountStatus: 'verified' | 'uncertain' | 'not_found' =
            doc.totalAmount === null || doc.totalAmount === undefined
              ? 'not_found'
              : (confidence >= 75 && hasValidMerchant ? 'verified' : 'uncertain');

          if (onProgress) onProgress('Google Cloud Document AI parsing complete!');
          return [
            {
              merchantName,
              rawString: hasValidMerchant
                ? `${merchantName.toUpperCase().replace(/\s+/g, '_')}*DOC_AI_VERIFIED`
                : 'UNIDENTIFIED_PROVIDER*DOC_AI_REVIEW',
              amount: doc.totalAmount ?? null,
              amountStatus,
              currency,
              date: doc.invoiceDate ?? null,
              renewalDate: doc.renewalDate ?? null,
              paymentSource: doc.paymentMethod || undefined,
              cadence: doc.cadence || 'unknown',
              category: hasValidMerchant ? detectCategoryFromText(merchantName) : 'Software & Tools',
              confidence,
              isDuplicate: false,
              isRecurring: true,
              notes: !hasValidMerchant
                ? 'Service provider could not be identified automatically by Document AI. Please confirm merchant name.'
                : (doc.needsReview ? 'Please review extracted values before confirming.' : 'Extracted via Google Cloud Document AI Invoice Parser'),
              detectedAmounts: doc.totalAmount ? [doc.totalAmount] : [],
              subtotal: doc.subtotal,
              taxAmount: doc.taxAmount,
            },
          ];
        }
      }
    }
  } catch (edgeErr) {
    console.warn('Google Document AI Edge Function skipped or unconfigured, falling back to local OCR engine:', edgeErr);
  }

  // 2. Fallback to local production OCR engine
  const extraction = await processInvoiceDocument(file, onProgress, userPreferredCurrency);

  const hasValidMerchant = Boolean(extraction.merchantName.value && isValidMerchantName(extraction.merchantName.value));
  const merchant = hasValidMerchant ? extraction.merchantName.value! : '';
  const amount = extraction.totalAmount.value; 
  const currency = extraction.currency.value || userPreferredCurrency;
  const renewalDate = extraction.renewalDate.value;
  const date = extraction.invoiceDate.value;
  const paymentSource = extraction.paymentMethod.value;
  const cadence: 'monthly' | 'yearly' | 'unknown' =
    extraction.billingFrequency.value === 'yearly'
      ? 'yearly'
      : extraction.billingFrequency.value === 'monthly'
      ? 'monthly'
      : 'unknown';

  const merchantConfidence = hasValidMerchant ? (extraction.merchantName.confidence || 75) : 0;
  const amountConfidence = extraction.totalAmount.confidence || 0;
  const confidence = hasValidMerchant
    ? Math.round((merchantConfidence + amountConfidence) / 2)
    : Math.min(45, amountConfidence > 0 ? Math.round(amountConfidence / 2) : 30);

  const amountStatus: 'verified' | 'uncertain' | 'not_found' =
    amount === null
      ? 'not_found'
      : (confidence >= 75 && hasValidMerchant ? 'verified' : 'uncertain');

  const primaryTx: ParsedTransaction = {
    merchantName: merchant,
    rawString: hasValidMerchant
      ? `${merchant.toUpperCase().replace(/\s+/g, '_')}*INVOICE_${extraction.invoiceNumber.value || 'VERIFIED'}`
      : (extraction.invoiceNumber.value ? `INVOICE_${extraction.invoiceNumber.value}` : 'UNIDENTIFIED_PROVIDER*INVOICE_REVIEW'),
    amount,
    amountStatus,
    currency,
    date,
    renewalDate,
    paymentSource: paymentSource || undefined,
    cadence,
    category: hasValidMerchant && extraction.serviceName.value
      ? detectCategoryFromText(extraction.serviceName.value + ' ' + merchant)
      : (hasValidMerchant ? detectCategoryFromText(merchant) : 'Software & Tools'),
    confidence,
    isDuplicate: false,
    duplicateMerchant: undefined,
    isRecurring: true,
    notes: !hasValidMerchant
      ? 'Service provider could not be identified from document. Please enter merchant name.'
      : (extraction.warnings.length > 0 ? extraction.warnings.join('; ') : 'Document parsed via verified OCR/text extraction'),
    detectedAmounts: extraction.detectedAmounts,
    ocrSnippet: extraction.rawText ? extraction.rawText.slice(0, 180) : file.name,
    invoiceNumber: extraction.invoiceNumber.value || undefined,
    subtotal: extraction.subtotal.value || undefined,
    taxAmount: extraction.taxAmount.value || undefined,
    paymentMethodConfidence: extraction.paymentMethod.confidence,
    extractionResult: extraction,
    amountEvidence: extraction.totalAmount.evidenceText,
    merchantEvidence: extraction.merchantName.evidenceText,
  };

  return [primaryTx];
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

// =========================================================================
// PDF DECOMPRESSION & STREAM EXTRACTION ENGINE (ZERO DEPENDENCIES)
// =========================================================================

async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const latin1 = new TextDecoder('latin1').decode(bytes);
    let decompressedStreamsText = '';

    // Search for all streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    while ((match = streamRegex.exec(latin1)) !== null) {
      const streamStart = match.index + match[0].indexOf('\n') + 1;
      const streamEnd = match.index + match[0].lastIndexOf('endstream');
      const streamBytes = bytes.slice(streamStart, streamEnd);

      // Check if it's FlateDecode or zlib
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
          decompressedStreamsText += '\n' + new TextDecoder('utf-8').decode(merged);
          continue;
        } catch {
          // Stream is either not deflate or plain text
        }
      }
      decompressedStreamsText += '\n' + new TextDecoder('latin1').decode(streamBytes);
    }

    const fullText = latin1 + '\n' + decompressedStreamsText;
    const textPieces: string[] = [];

    // Extract PDF text literals in (string) Tj or '
    const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(fullText)) !== null) {
      const clean = tjMatch[1]
        .replace(/\\([\\()])/g, '$1')
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, '')
        .trim();
      if (clean) textPieces.push(clean);
    }

    // Extract PDF array TJ: [(foo) 10 (bar)] TJ
    const arrayTjRegex = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/gi;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = arrayTjRegex.exec(fullText)) !== null) {
      const inner = arrMatch[1];
      const subMatches = inner.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || [];
      for (const sm of subMatches) {
        const clean = sm.slice(1, -1).replace(/\\([\\()])/g, '$1').trim();
        if (clean) textPieces.push(clean);
      }
    }

    // Extract Hex strings: <48656c6c6f> Tj
    const hexRegex = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRegex.exec(fullText)) !== null) {
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

    if (textPieces.length > 0) {
      return textPieces.join('\n');
    }

    // Fallback: clean ASCII sequences in latin1
    const asciiMatches = latin1.match(/[A-Za-z0-9₹$€£.,:/\-@\s]{4,}/g) || [];
    return asciiMatches.join(' ');
  } catch (err) {
    console.error('PDF parsing notice:', err);
    return '';
  }
}

// =========================================================================
// IMAGE OCR ENGINE (TESSERACT WITH RESILIENT TIMEOUT)
// =========================================================================

async function extractTextFromImage(file: File, onProgress?: (msg: string) => void): Promise<string> {
  try {
    const ocrPromise = (async () => {
      onProgress?.('Initializing Tesseract OCR worker...');
      const worker = await createWorker('eng');
      onProgress?.('Extracting text and figures from image...');
      const result = await worker.recognize(file);
      await worker.terminate();
      return result.data.text;
    })();

    // 40-second generous timeout for OCR
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve(''), 40000);
    });

    const text = await Promise.race([ocrPromise, timeoutPromise]);
    return text || '';
  } catch (err) {
    console.warn('OCR error fallback:', err);
    return '';
  }
}

async function parseCsvFile(file: File): Promise<ParsedTransaction[]> {
  const text = await readFileAsText(file);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const candidates: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length && candidates.length < 5; i++) {
    const row = lines[i].split(',');
    if (row.length >= 2) {
      const desc = row[0] || row[1] || 'Transaction';
      const amtMatch = lines[i].match(/([0-9]+(?:\.[0-9]{2})?)/);
      const amt = amtMatch ? parseFloat(amtMatch[1]) : null;

      const found = KNOWN_MERCHANTS.find((m) => m.patterns.some((p) => p.test(desc)));
      candidates.push({
        merchantName: found ? found.name : desc.trim(),
        rawString: desc.trim(),
        amount: amt,
        amountStatus: amt !== null ? 'verified' : 'not_found',
        currency: 'USD',
        date: null,
        renewalDate: null,
        paymentSource: null,
        cadence: found?.cadence || 'unknown',
        category: found?.category || 'Software & Tools',
        confidence: found ? 90 : 70,
        isDuplicate: false,
        duplicateMerchant: undefined,
        isRecurring: true,
        detectedAmounts: amt !== null ? [amt] : [],
      });
    }
  }

  if (candidates.length === 0) {
    return extractTransactionsFromText(file.name, file.name);
  }
  return candidates;
}

// =========================================================================
// PAYMENT SOURCE ACCOUNT EXTRACTION ENGINE
// =========================================================================

export function extractPaymentSourceFromText(text: string, currency: Currency = 'USD'): string {
  if (!text) return '';

  // 1. Bank Name + Card Type + Last 4 Digits (e.g., "HDFC Bank Visa ending in 4090" or "SBI Credit Card •••• 2345")
  const bankCardMatch = text.match(/\b(hdfc|sbi|icici|axis|kotak|pnb|citi|chase|bofa|barclays|hsbc)\b[^\r\n0-9]*\b(visa|mastercard|rupay|amex|credit|debit)\b[^\r\n0-9]*(\d{4})\b/i);
  if (bankCardMatch) {
    const bank = bankCardMatch[1].toUpperCase();
    const brand = bankCardMatch[2].charAt(0).toUpperCase() + bankCardMatch[2].slice(1).toLowerCase();
    const last4 = bankCardMatch[3];
    return `${bank} ${brand} •••• ${last4}`;
  }

  // 2. Specific Card Brand + Last 4 (e.g. "Visa ending in 4092" or "Mastercard •••• 1234")
  const cardBrandMatch = text.match(/\b(visa|mastercard|master\s*card|amex|american\s*express|rupay|discover|diners)\b[^\r\n0-9]*(\d{4})\b/i);
  if (cardBrandMatch) {
    const brand = cardBrandMatch[1].replace(/\s+/g, ' ').trim();
    const cleanBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
    const last4 = cardBrandMatch[2];
    return `${cleanBrand} •••• ${last4}`;
  }

  // 3. Generic "Card ending in 4092" or "Credit Card ending in 4092"
  const genericCardMatch = text.match(/(?:credit\s*card|debit\s*card|card|instrument|account|a\/c)\b[^\r\n0-9]*(?:ending\s*in|ending\s*with|ending|••|\*\*|\.\.|\s+)[^\r\n0-9]*(\d{4})\b/i);
  if (genericCardMatch) {
    return `Card •••• ${genericCardMatch[1]}`;
  }

  // 4. Standalone 4 digits preceded by asterisks/dots: e.g. "•••• 4090" or "**** 4090"
  const dotCardMatch = text.match(/(?:••|\*\*|\.\.|\*{2,}|•{2,})\s*(\d{4})\b/);
  if (dotCardMatch) {
    return `Card •••• ${dotCardMatch[1]}`;
  }

  // 5. UPI / AutoPay Handles & Apps
  const upiIdMatch = text.match(/\b([a-zA-Z0-9.\-_]{2,25}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|ibl|apl|axl|upi))\b/i);
  if (upiIdMatch) {
    return `UPI AutoPay (${upiIdMatch[1]})`;
  }
  if (/\b(?:google\s*pay|gpay)\b/i.test(text)) {
    return 'UPI AutoPay (Google Pay)';
  }
  if (/\bphonepe\b/i.test(text)) {
    return 'UPI AutoPay (PhonePe)';
  }
  if (/\bpaytm\b/i.test(text)) {
    return 'UPI AutoPay (Paytm)';
  }
  if (/\b(?:upi\s*autopay|e-mandate|standing\s*instruction|nach\s*mandate|upi\s*mandate|upi)\b/i.test(text)) {
    return 'UPI AutoPay / Bank Mandate';
  }

  // 6. Digital Wallets
  if (/\bapple\s*pay\b/i.test(text)) return 'Apple Pay';
  if (/\bpaypal\b/i.test(text)) return 'PayPal';

  // 7. Bank Account without card
  const bankAccMatch = text.match(/\b(hdfc|sbi|icici|axis|kotak|pnb)\b[^\r\n0-9]*(?:a\/c|account)[^\r\n0-9]*(\d{4})\b/i);
  if (bankAccMatch) {
    return `${bankAccMatch[1].toUpperCase()} Bank A/c •••• ${bankAccMatch[2]}`;
  }

  // NO PAYMENT METHOD FOUND: Return empty string. Never invent or assume!
  return '';
}

// =========================================================================
// INTELLIGENT MERCHANT NAME & CATEGORY EXTRACTION
// =========================================================================

export function extractMerchantNameFromText(
  text: string,
  filename: string
): { name: string; category: SubscriptionCategory; confidence: number } {
  // 1. Check if matches any known merchants first
  for (const m of KNOWN_MERCHANTS) {
    if (m.patterns.some((p) => p.test(text) || p.test(filename))) {
      return {
        name: m.name,
        category: m.category,
        confidence: 96,
      };
    }
  }

  // 2. Explicit vendor / merchant labels in invoice text
  const vendorRegexes = [
    /(?:billed\s*by|sold\s*by|merchant\s*name|vendor\s*name|provider\s*name|company\s*name|seller\s*name|payable\s*to|remit\s*to|merchant|vendor|seller|service\s*provider|issuer)[:\s]+([^\r\n,;]+)/i,
    /(?:receipt\s*from|invoice\s*from|order\s*from|payment\s*to|subscription\s*to|welcome\s*to)[:\s]+([^\r\n,;]+)/i,
    /(?:thank\s*you\s*for\s*(?:your\s*)?(?:business\s*with|subscribing\s*to|payment\s*to))[:\s]+([^\r\n,;!.]+)/i,
  ];

  for (const reg of vendorRegexes) {
    const match = text.match(reg);
    if (match && match[1]) {
      const candidate = cleanMerchantCandidate(match[1]);
      if (candidate) {
        return {
          name: candidate,
          category: detectCategoryFromText(text + ' ' + candidate),
          confidence: 88,
        };
      }
    }
  }

  // 3. Domain or Email heuristics (e.g. support@cursor.com or www.perplexity.ai)
  const domainMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]{3,25})\.(?:com|ai|io|net|in|org|co|app|dev)\b/i);
  if (domainMatch && domainMatch[1] && !/^(?:google|apple|microsoft|stripe|razorpay|fastspring)$/i.test(domainMatch[1])) {
    const rawDomain = domainMatch[1];
    const name = rawDomain.charAt(0).toUpperCase() + rawDomain.slice(1);
    return {
      name,
      category: detectCategoryFromText(text + ' ' + name),
      confidence: 82,
    };
  }

  // 4. Prominent header lines in first 5 lines of text
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 2);
  for (const line of lines.slice(0, 5)) {
    // Skip common document title words and generic section headers
    if (/^(?:invoice|tax\s*invoice|bill|receipt|statement|original|duplicate|gstin|cin|date|bill\s*to|ship\s*to|customer|recipient|receiver|order|details)/i.test(line)) {
      continue;
    }
    if (/\b(?:details|recipient|receiver|customer|client|consignee|signatory|particulars|declaration|terms)\b/i.test(line)) {
      continue;
    }
    // Line has no numbers or dates and reasonable length
    if (line.length >= 3 && line.length <= 40 && !/[0-9]{3,}/.test(line)) {
      const candidate = cleanMerchantCandidate(line);
      if (candidate && isValidMerchantName(candidate)) {
        return {
          name: candidate,
          category: detectCategoryFromText(text + ' ' + candidate),
          confidence: 75,
        };
      }
    }
  }

  // 5. Filename clean candidate
  const cleanFilename = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_\-+]/g, ' ')
    .replace(/statement|invoice|receipt|tax|bill|oct|nov|dec|jan|202[4-9]|pdf|png|jpg|jpeg|screenshot|upload|doc/gi, '')
    .trim();

  if (cleanFilename.length >= 2 && /[a-zA-Z]{2,}/.test(cleanFilename)) {
    const formatted = cleanFilename
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    if (isValidMerchantName(formatted)) {
      return {
        name: formatted,
        category: detectCategoryFromText(text + ' ' + formatted),
        confidence: 60,
      };
    }
  }

  return {
    name: '',
    category: 'Software & Tools',
    confidence: 30,
  };
}

export function detectCategoryFromText(text: string): SubscriptionCategory {
  const lower = text.toLowerCase();
  if (/netflix|spotify|disney|hotstar|hulu|prime\s*video|youtube|music|sound|movie|show|streaming|entertain/i.test(lower)) {
    return 'Streaming & Ent';
  }
  if (/cloud|aws|amazon\s*web|azure|gcp|google\s*cloud|hosting|server|hostinger|godaddy|namecheap|vps|storage|telecom|broadband|wifi|jio|airtel/i.test(lower)) {
    return 'Utilities & Cloud';
  }
  if (/ai|gpt|chatgpt|openai|claude|anthropic|perplexity|midjourney|copilot|model|llm|intelligence|anysphere/i.test(lower)) {
    return 'Ai Assist';
  }
  if (/figma|canva|adobe|creative|photoshop|illustrator|design|ui|ux|vector|framer|webflow/i.test(lower)) {
    return 'Design';
  }
  if (/slack|notion|zoom|microsoft|office|workspace|asana|jira|trello|linear|loom|calendar|grammarly|productivity/i.test(lower)) {
    return 'Productivity';
  }
  if (/swiggy|zomato|blinkit|zepto|gym|fit|cult|health|food/i.test(lower)) {
    return 'Other Misc';
  }
  return 'Software & Tools';
}

// =========================================================================
// STRICT FINAL TOTAL AMOUNT & TRANSACTION EXTRACTOR
// =========================================================================

export function extractTransactionsFromText(
  text: string,
  filename: string,
  userPreferredCurrency: Currency = 'USD'
): ParsedTransaction[] {
  // 1. First scan for explicit currency symbols attached to amounts or totals
  let detectedCurrency: Currency = userPreferredCurrency;
  let explicitSymbolCurrency: Currency | null = null;

  // Check if explicit currency symbols ($ or USD, € or EUR, £ or GBP, ₹ or INR) are present
  const hasDollar = /\$|\busd\b|\bdollar/i.test(text) || /\busd\b/i.test(filename);
  const hasEuro = /€|\beur\b|\beuro\b/i.test(text) || /\beur\b/i.test(filename);
  const hasPound = /£|\bgbp\b|\bpound\b/i.test(text) || /\bgbp\b/i.test(filename);
  const hasRupee = /₹|\brs\.?\b|\binr\b|\brupee/i.test(text) || /\binr\b|\brs\b/i.test(filename);

  // General Indian banking/services regex
  const indianKeywordsRegex = /\bgstin\b|\bupi\b|\bpaytm\b|\bphonepe\b|\bgpay\b|\bbharatpe\b|\brazorpay\b|\bbilldesk\b|\bhdfc\b|\bicici\b|\bsbi\b|\baxis\b|\bkotak\b|\bpnb\b|\bairtel\b|\bjio\b|\bswiggy\b|\bzomato\b|\bhotstar\b|\bnetbanking\b|\/-\b|\bpaise\b/i;

  // 2. Strict Final Total Amount Extraction
  // We ONLY extract the final total amount. Intermediate charges like tax, subtotal, discount, fee are excluded.
  const lines = text.split(/\r?\n/);
  let finalTotalAmount = 0;

  // Regex specifically targeting final total labels
  const finalTotalRegex = /(?:grand\s*total|total\s*amount\s*(?:due|paid|charged|payable)?|total\s*payable|net\s*payable|amount\s*paid|amount\s*due|final\s*total|invoice\s*total|total\s*charged|total\s*billed|total\s*[:=]|total\s+amt|total|paid|amount)[:\s]*([₹$€£]|inr|usd|eur|gbp|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{2,6})/i;

  // Pass 1: Scan line by line for an explicit Final Total line, skipping lines that contain "subtotal" or "tax"
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip intermediate lines (Subtotal, GST, Tax, Discount) and table column headers
    if (/^(?:subtotal|sub-total|sub\s+total|discount|tax\b|gst\b|vat\b|cgst|sgst|fee\b|convenience|balance\s*due)/i.test(trimmed)) {
      continue;
    }
    if (/\b(?:item\s*description|description|hsn|sac|qty|quantity|unit\s*price|rate|service\s*period|igst\s*%|cgst\s*%|sgst\s*%|tax\s*%)\b/i.test(trimmed)) {
      continue;
    }
    // Skip payment dates and status stamps (e.g. "Paid On 10 Sept 2026", "Status PAID")
    if (/\b(?:paid\s*on|payment\s*date|paid\s*date|invoice\s*date|status\s*[:\s]*paid)\b/i.test(trimmed)) {
      continue;
    }
    const isTotalCandidate = /(?:grand\s*total|total\s*amount\s*(?:due|paid|charged|payable)?|total\s*payable|net\s*payable|amount\s*paid|paid\s*amount|amount\s*due|final\s*total|invoice\s*total|total\s*charged|total\s*billed|total\s*[:=]|total\s+amt|\btotal\b|paid\s*[:=])/i.test(trimmed);
    if (!isTotalCandidate) continue;

    // Strip email addresses so digits inside email names are never captured
    const lineWithoutEmails = trimmed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ');

    // Scan all numeric amounts on this total line (ignoring percentages)
    const numScanner = /(?:([₹$€£]|inr|usd|eur|gbp|rs\.?)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{2,6})/gi;
    const tokens: { val: number; sym?: string }[] = [];
    let nm: RegExpExecArray | null;
    while ((nm = numScanner.exec(lineWithoutEmails)) !== null) {
      const charAfter = lineWithoutEmails.slice(nm.index + nm[0].length, nm.index + nm[0].length + 1);
      if (charAfter === '%' || nm[0].includes('%')) continue;

      const val = parseFloat(nm[2].replace(/,/g, ''));
      if (val && !isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030 && Number.isInteger(val))) {
        tokens.push({ val, sym: nm[1] });
      }
    }

    if (tokens.length >= 2) {
      // Multiple columns e.g. "Total 4,067.80 73220 INR 4,800.00"
      // Rightmost column or explicit currency-tagged value is the true gross payable total
      const last = tokens[tokens.length - 1];
      const first = tokens[0];
      const chosen = (last.sym || last.val >= first.val) ? last : tokens.reduce((max, t) => t.val > max.val ? t : max, tokens[0]);
      finalTotalAmount = chosen.val;

      if (chosen.sym || trimmed.includes('₹') || /inr|rs/i.test(trimmed)) explicitSymbolCurrency = 'INR';
      else if (chosen.sym === '$' || trimmed.includes('$')) explicitSymbolCurrency = 'USD';
      else if (chosen.sym === '€' || trimmed.includes('€')) explicitSymbolCurrency = 'EUR';
      else if (chosen.sym === '£' || trimmed.includes('£')) explicitSymbolCurrency = 'GBP';
      break;
    } else if (tokens.length === 1) {
      finalTotalAmount = tokens[0].val;
      const sym = (tokens[0].sym || '').toLowerCase();
      if (sym === '$' || sym === 'usd' || trimmed.includes('$')) explicitSymbolCurrency = 'USD';
      else if (sym === '€' || sym === 'eur' || trimmed.includes('€')) explicitSymbolCurrency = 'EUR';
      else if (sym === '£' || sym === 'gbp' || trimmed.includes('£')) explicitSymbolCurrency = 'GBP';
      else if (sym === '₹' || sym.includes('rs') || sym === 'inr' || trimmed.includes('₹')) explicitSymbolCurrency = 'INR';
      break;
    }
  }

  // Pass 2: If no strict line matched, check with regex over full text ignoring subtotal
  if (!finalTotalAmount) {
    const fallbackRegex = /(?:grand\s*total|total\s*amount(?:\s*due|\s*paid|\s*charged|\s*payable)?|total\s*payable|net\s*payable|amount\s*paid|amount\s*due|final\s*amount|total\s*[:=]|total\b)[:\s]*([₹$€£]|inr|usd|eur|gbp|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{2,6})/gi;
    let m: RegExpExecArray | null;
    while ((m = fallbackRegex.exec(text)) !== null) {
      const prefix = text.slice(Math.max(0, m.index - 10), m.index).toLowerCase();
      if (prefix.includes('sub') || prefix.includes('tax')) continue;

      const val = parseFloat(m[2].replace(/,/g, ''));
      if (val && !isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030 && Number.isInteger(val))) {
        finalTotalAmount = val;
        if (m[1]) {
          const sym = m[1].toLowerCase();
          if (sym === '$' || sym === 'usd') explicitSymbolCurrency = 'USD';
          else if (sym === '€' || sym === 'eur') explicitSymbolCurrency = 'EUR';
          else if (sym === '£' || sym === 'gbp') explicitSymbolCurrency = 'GBP';
          else if (sym === '₹' || sym.includes('rs') || sym === 'inr') explicitSymbolCurrency = 'INR';
        }
      }
    }
  }

  // Resolve currency priority:
  // 1. Explicit symbol on the total line
  // 2. Explicit symbols in the document
  // 3. Indian keywords (if no foreign currency symbol was explicitly found)
  // 4. Default to user's preferred currency
  if (explicitSymbolCurrency) {
    detectedCurrency = explicitSymbolCurrency;
  } else if (hasDollar && !hasRupee) {
    detectedCurrency = 'USD';
  } else if (hasEuro && !hasRupee) {
    detectedCurrency = 'EUR';
  } else if (hasPound && !hasRupee) {
    detectedCurrency = 'GBP';
  } else if (hasRupee || indianKeywordsRegex.test(text) || /inr|rupee|rs/i.test(filename)) {
    detectedCurrency = 'INR';
  } else if (hasDollar) {
    detectedCurrency = 'USD';
  } else if (hasEuro) {
    detectedCurrency = 'EUR';
  } else if (hasPound) {
    detectedCurrency = 'GBP';
  } else {
    detectedCurrency = userPreferredCurrency;
  }

  // Pass 3: Check filename for amount (e.g. "Invoice_649_INR.pdf" or "Spotify_119_INR.png")
  if (!finalTotalAmount) {
    const fnMatch = filename.match(/(?:^|[^0-9.])([0-9]{1,5}(?:\.[0-9]{1,2})?)(?:[^0-9.]|$)/);
    if (fnMatch && fnMatch[1]) {
      const val = parseFloat(fnMatch[1]);
      if (val && !isNaN(val) && !(val >= 2020 && val <= 2030 && Number.isInteger(val))) {
        finalTotalAmount = val;
      }
    }
  }

  // Pass 4: Fallback to the largest non-year monetary figure (since Total >= subtotal and taxes)
  if (!finalTotalAmount) {
    const allNumbers: number[] = [];
    const symbolMatches = text.matchAll(/(?:₹|rs\.?|inr|usd|eur|gbp|\$|€|£)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{2,6})/gi);
    for (const sm of symbolMatches) {
      const val = parseFloat(sm[1].replace(/,/g, ''));
      if (val && !isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030 && Number.isInteger(val))) {
        allNumbers.push(val);
      }
    }

    if (allNumbers.length > 0) {
      finalTotalAmount = Math.max(...allNumbers);
    }
  }

  // 3. Cadence Detection from Text
  let detectedCadence: 'monthly' | 'yearly' | 'unknown' = 'unknown';
  if (/yearly|annual|annually|per\s*year|\/yr|\/year|12\s*months/i.test(text) || /annual|yearly/i.test(filename)) {
    detectedCadence = 'yearly';
  } else if (/monthly|per\s*month|\/mo|\/month|every\s*month/i.test(text) || /monthly/i.test(filename)) {
    detectedCadence = 'monthly';
  }

  // 4. Extract Renewal / Next Billing Date from Invoice Text
  const foundRenewalDate = extractRenewalDateFromText(text, detectedCadence === 'yearly' ? 'yearly' : 'monthly', detectedCurrency === 'INR');

  // 5. Extract Payment Source Account
  const paymentSource = extractPaymentSourceFromText(text, detectedCurrency);

  // 6. Gather all detected monetary amounts for interactive autofill
  const detectedAmountsList: number[] = [];
  const symbolMatches = text.matchAll(/(?:₹|rs\.?|inr|usd|eur|gbp|\$|€|£)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{2,6})/gi);
  for (const sm of symbolMatches) {
    const val = parseFloat(sm[1].replace(/,/g, ''));
    if (val && !isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030 && Number.isInteger(val))) {
      if (!detectedAmountsList.includes(val)) {
        detectedAmountsList.push(val);
      }
    }
  }
  if (finalTotalAmount > 0 && !detectedAmountsList.includes(finalTotalAmount)) {
    detectedAmountsList.push(finalTotalAmount);
  }

  // 7. Strict Amount Handling: NEVER substitute missing amounts with fake defaults (like 19.99 or 1499.00)
  const amt = finalTotalAmount > 0 ? finalTotalAmount : null;
  const amountStatus: 'verified' | 'not_found' = amt !== null ? 'verified' : 'not_found';

  // 8. Identify Merchant without hardcoded fallback duplicates
  const identified = identifyMerchant(text, filename);
  const identifiedName = identified.merchantName.value;

  let chosenMerchant = identifiedName;
  let chosenCategory: SubscriptionCategory = identified.category;
  let chosenConfidence = identified.merchantName.confidence || 0;

  if (!chosenMerchant) {
    for (const m of KNOWN_MERCHANTS) {
      if (m.patterns.some((p) => p.test(text) || p.test(filename))) {
        chosenMerchant = m.name;
        chosenCategory = m.category;
        chosenConfidence = 96;
        break;
      }
    }
  }

  if (!chosenMerchant) {
    const extractedMerchant = extractMerchantNameFromText(text, filename);
    if (extractedMerchant.name && isValidMerchantName(extractedMerchant.name)) {
      chosenMerchant = extractedMerchant.name;
      chosenCategory = extractedMerchant.category;
      chosenConfidence = extractedMerchant.confidence;
    }
  }

  const hasMerchant = Boolean(chosenMerchant && isValidMerchantName(chosenMerchant));
  const finalMerchant = hasMerchant ? chosenMerchant! : '';
  const finalConfidence = hasMerchant
    ? Math.round((chosenConfidence + (amt !== null ? 95 : 70)) / 2)
    : Math.min(45, amt !== null ? 50 : 30);

  const primaryCandidate: ParsedTransaction = {
    merchantName: finalMerchant,
    rawString: hasMerchant
      ? `${finalMerchant.toUpperCase().replace(/\s+/g, '_')}*INVOICE_BILLING`
      : 'UNIDENTIFIED_PROVIDER*INVOICE_BILLING',
    amount: amt,
    amountStatus: hasMerchant && amt !== null ? 'verified' : 'uncertain',
    currency: detectedCurrency,
    date: foundRenewalDate,
    renewalDate: foundRenewalDate,
    paymentSource: paymentSource || undefined,
    cadence: detectedCadence,
    category: chosenCategory,
    confidence: finalConfidence,
    isDuplicate: false,
    duplicateMerchant: undefined,
    isRecurring: true,
    detectedAmounts: detectedAmountsList.length > 0 ? detectedAmountsList : (amt !== null ? [amt] : []),
    ocrSnippet: text.slice(0, 180),
  };

  return [primaryCandidate];
}

// =========================================================================
// RENEWAL & NEXT BILLING DATE EXTRACTION ENGINE
// =========================================================================

const MONTH_MAP: Record<string, number> = {
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

function formatIso(year: number, month: number, day: number): string | null {
  if (year < 2020 || year > 2040) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function advanceDateString(isoDate: string, cadence: 'monthly' | 'yearly'): string {
  const parts = isoDate.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10);

  if (cadence === 'yearly') {
    year += 1;
  } else {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const maxDays = new Date(year, month, 0).getDate();
    if (day > maxDays) day = maxDays;
  }
  return formatIso(year, month, day) || isoDate;
}

export function parseAnyDateString(raw: string, preferDmy = false): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^(?:on|at|date|[:\s-])+/i, '').trim();

  // 1. ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/\b(202[4-9]|203[0-9])[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12][0-9]|3[01])\b/);
  if (isoMatch) {
    return formatIso(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10), parseInt(isoMatch[3], 10));
  }

  // 2. Month name first: "Nov 28, 2026" or "November 28th 2026"
  const mdyNamed = clean.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(202[4-9]|203[0-9])\b/i);
  if (mdyNamed) {
    const m = MONTH_MAP[mdyNamed[1].toLowerCase()];
    if (m) {
      return formatIso(parseInt(mdyNamed[3], 10), m, parseInt(mdyNamed[2], 10));
    }
  }

  // 3. Day first with month name: "28 Nov 2026" or "28th November 2026" or "28-Nov-2026"
  const dmyNamed = clean.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-_]+([a-z]{3,9})[\s\-_,]+(202[4-9]|203[0-9])\b/i);
  if (dmyNamed) {
    const m = MONTH_MAP[dmyNamed[2].toLowerCase()];
    if (m) {
      return formatIso(parseInt(dmyNamed[3], 10), m, parseInt(dmyNamed[1], 10));
    }
  }

  // 4. Numeric formats: DD/MM/YYYY vs MM/DD/YYYY
  const numMatch = clean.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](202[4-9]|203[0-9])\b/);
  if (numMatch) {
    const first = parseInt(numMatch[1], 10);
    const second = parseInt(numMatch[2], 10);
    const yr = parseInt(numMatch[3], 10);

    if (first > 12) {
      return formatIso(yr, second, first);
    } else if (second > 12) {
      return formatIso(yr, first, second);
    } else if (preferDmy) {
      return formatIso(yr, second, first);
    } else {
      return formatIso(yr, first, second);
    }
  }

  return null;
}

export function extractRenewalDateFromText(
  text: string,
  cadence: 'monthly' | 'yearly' = 'monthly',
  isIndian = false
): string {
  const preferDmy = isIndian || /₹|inr|gstin|upi/i.test(text);

  // 1. Explicit Renewal / Next Billing / Due Date lines
  const explicitKeywords = [
    /(?:next\s*billing\s*(?:date)?|next\s*charge\s*(?:date)?|next\s*renewal\s*(?:date)?|next\s*invoice\s*(?:date)?|next\s*cycle|renewal\s*date|renews\s*on|renews\s*at|auto[- ]?renews\s*on|auto[- ]?renews|auto[- ]?debit\s*date|auto[- ]?debit\s*on|payment\s*due\s*date|payment\s*due|due\s*date|valid\s*thru|valid\s*through|valid\s*until|valid\s*till|expires\s*on|expiry\s*date|expiration\s*date|plan\s*renews|subscription\s*renews|bill\s*due\s*date)[:\s]*([^\r\n;]+)/i,
    /(?:validity|coverage\s*ends?|service\s*ends?|period\s*ends?)[:\s]*([^\r\n;]+)/i,
  ];

  for (const re of explicitKeywords) {
    const match = text.match(re);
    if (match && match[1]) {
      const parsed = parseAnyDateString(match[1], preferDmy);
      if (parsed) return parsed;
    }
  }

  // 2. Billing Period range: e.g. "Billing Period: Oct 10, 2026 - Nov 10, 2026"
  const periodMatch = text.match(/(?:billing\s*period|service\s*period|coverage\s*period|period|dates\s*of\s*service)[:\s]*([^\r\n]+)/i);
  if (periodMatch && periodMatch[1]) {
    const line = periodMatch[1];
    const splitParts = line.split(/\s+(?:to|thru|through|–|-)\s+/i);
    if (splitParts.length >= 2) {
      const endPart = splitParts[splitParts.length - 1];
      const parsedEnd = parseAnyDateString(endPart, preferDmy);
      if (parsedEnd) return parsedEnd;
    }
  }

  // 3. Fallback: Invoice Date / Issue Date + 1 Cadence
  const invoiceDateMatch = text.match(/(?:invoice\s*date|bill\s*date|date\s*of\s*issue|issue\s*date|billing\s*date|statement\s*date|transaction\s*date)[:\s]*([^\r\n;]+)/i);
  if (invoiceDateMatch && invoiceDateMatch[1]) {
    const parsedInvoiceDate = parseAnyDateString(invoiceDateMatch[1], preferDmy);
    if (parsedInvoiceDate) {
      return advanceDateString(parsedInvoiceDate, cadence);
    }
  }

  // 4. Any standalone future date mentioned in the document
  const allDateRegex = /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+202[4-9]|\d{1,2}(?:st|nd|rd|th)?[\s\-_]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-_,]+202[4-9]|202[4-9][-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12][0-9]|3[01])|\d{1,2}[-/.]\d{1,2}[-/.](?:202[4-9]|203[0-9]))\b/gi;
  const allMatches = text.match(allDateRegex) || [];
  for (const matchStr of allMatches) {
    const p = parseAnyDateString(matchStr, preferDmy);
    if (p) {
      return p;
    }
  }

  // 5. Default: Current date + 30 days
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  return fallback.toISOString().split('T')[0];
}
