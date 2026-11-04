// Supabase Edge Function: parse-invoice
// Universal, Dynamic, Document-Based Invoice Extraction Engine
// Powered by Google Cloud Document AI (INVOICE_PROCESSOR) with Contextual Resolution

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface UniversalInvoiceExtraction {
  merchant_name: string | null;
  service_name: string | null;
  invoice_number: string | null;
  subscription_amount: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  payment_method: 'Credit Card' | 'Debit Card' | 'UPI' | 'PayPal' | 'Bank Transfer' | 'Other' | 'Unknown';
  billing_cycle: 'monthly' | 'yearly' | 'quarterly' | 'weekly' | 'custom' | 'unknown';
  invoice_date: string | null;
  payment_date: string | null;
  due_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  next_renewal_date: string | null;
  is_renewal_date_derived: boolean;
  fields_confidence: {
    merchant_name: number;
    service_name: number;
    total_amount: number;
    subscription_amount: number;
    currency: number;
    payment_method: number;
    billing_cycle: number;
    invoice_date: number;
    next_renewal_date: number;
  };
  field_evidence: {
    merchant_name?: string;
    service_name?: string;
    total_amount?: string;
    payment_method?: string;
    billing_cycle?: string;
    next_renewal_date?: string;
  };
  extraction_status: 'verified' | 'needs_review' | 'manual_input_required';
  raw_text?: string;
}

// Generates Google OAuth 2.0 Access Token from Service Account Key using Web Crypto API
async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj: any) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${b64(header)}.${b64(claim)}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signedToken = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedToken,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Google OAuth failure: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// Statutory tax bodies and generic document terms blocklist
function isInvalidMerchantCandidate(name?: string | null): boolean {
  if (!name || typeof name !== "string") return true;
  const clean = name.trim().toLowerCase();
  if (clean.length < 2 || clean.length > 70) return true;
  if (!/[a-zA-Z]{2,}/.test(clean)) return true;

  // Generic document structural terms
  if (
    /^(?:invoice|tax\s*invoice|bill|receipt|statement|original|duplicate|triplicate|details|recipient|receiver|customer|client|buyer|consignee|billed\s*to|bill\s*to|ship\s*to|shipped\s*to|payment\s*receipt|order|particulars|declaration|terms|gstin|pan|cin|date)$/i.test(
      clean
    )
  ) {
    return true;
  }

  // Government & statutory tax bodies
  if (
    /\b(?:income\s*tax(?:\s*department)?|central\s*board|board\s*of\s*direct\s*taxes|cbdt|cbic|ministry\s*of\s*finance|department\s*of\s*revenue|government\s*of\s*india|govt\s*of\s*india|dept\s*of\s*telecom|reserve\s*bank\s*of\s*india|internal\s*revenue\s*service|irs|hmrc|tax\s*department)\b/i.test(
      clean
    )
  ) {
    return true;
  }

  return false;
}

function cleanTitleCase(str: string): string {
  const stripped = str
    .replace(/["'*<>~@!?^+=\\/|~`%$;:]+/g, " ")
    .replace(/\b(?:pvt\.?\s*ltd\.?|private\s*limited|pte\.?\s*ltd\.?|ltd\.?|limited|inc\.?|incorporated|corp\.?|corporation|llc|llp|gmbh|co\.)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return stripped
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseAmount(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const clean = String(val).replace(/,/g, "").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, documentName } = await req.json();

    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "fileBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = Deno.env.get("GCP_PROJECT_ID");
    const location = Deno.env.get("GCP_LOCATION") || "us";
    const processorId = Deno.env.get("GCP_PROCESSOR_ID");
    const serviceAccountKeyRaw = Deno.env.get("GCP_SERVICE_ACCOUNT_KEY");

    if (!projectId || !processorId || !serviceAccountKeyRaw) {
      return new Response(
        JSON.stringify({
          error: "Document AI secrets missing. Ensure GCP_PROJECT_ID, GCP_PROCESSOR_ID, and GCP_SERVICE_ACCOUNT_KEY are set.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getGoogleAccessToken(serviceAccount);

    const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

    const docAiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: fileBase64,
          mimeType: mimeType || "application/pdf",
        },
      }),
    });

    const docAiData = await docAiRes.json();
    if (docAiData.error) {
      throw new Error(`Document AI Error: ${docAiData.error.message || JSON.stringify(docAiData.error)}`);
    }

    const doc = docAiData.document || {};
    const entities: any[] = doc.entities || [];
    const fullText = (doc.text || "").trim();

    // Helper functions for entity extraction
    const getEntities = (type: string) => entities.filter((e) => e.type === type);
    const getBestEntity = (type: string) => {
      const matches = getEntities(type);
      if (matches.length === 0) return null;
      return matches.reduce((best, curr) => ((curr.confidence || 0) > (best.confidence || 0) ? curr : best), matches[0]);
    };

    // =========================================================================
    // 1. UNIVERSAL MERCHANT & SERVICE DETECTION
    // =========================================================================
    let merchantName: string | null = null;
    let merchantConfidence = 0.0;
    let merchantEvidence: string | undefined = undefined;

    // Check Document AI supplier_name entities
    const supplierEntities = getEntities("supplier_name").sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    for (const sup of supplierEntities) {
      const text = sup.mentionText?.trim();
      if (text && !isInvalidMerchantCandidate(text)) {
        merchantName = cleanTitleCase(text);
        merchantConfidence = sup.confidence || 0.92;
        merchantEvidence = sup.mentionText;
        break;
      }
    }

    // Fallback 1a: Labeled vendor pattern in text
    if (!merchantName) {
      const vendorRegex = [
        /(?:billed\s*by|sold\s*by|seller(?:\s*name)?|provider(?:\s*name)?|company(?:\s*name)?|merchant(?:\s*name)?|service\s*provider|supplier(?:\s*name)?|issued\s*by|payee|organization|business\s*name)[:\s]+([^\r\n,;]+)/i,
        /(?:invoice\s*from|receipt\s*from|payment\s*to|subscription\s*to|welcome\s*to)[:\s]+([^\r\n,;]+)/i,
        /(?:thank\s*you\s*for\s*(?:your\s*)?(?:business\s*with|subscribing\s*to|payment\s*to|choosing|joining))[:\s]+([^\r\n,;!.]+)/i,
      ];
      for (const r of vendorRegex) {
        const m = fullText.match(r);
        if (m && m[1] && !isInvalidMerchantCandidate(m[1])) {
          merchantName = cleanTitleCase(m[1]);
          merchantConfidence = 0.88;
          merchantEvidence = m[0];
          break;
        }
      }
    }

    // Fallback 1b: Corporate entity in first 15 lines before Billed To / Customer
    if (!merchantName) {
      const rawLines = fullText.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 2);
      for (const line of rawLines.slice(0, 15)) {
        if (/^(?:invoice|tax\s*invoice|bill|receipt|statement|original|duplicate|date|billed\s*to|bill\s*to|ship\s*to|customer|client|recipient|order|details|p\.?o\.?|page\s*\d|status|paid)/i.test(line)) {
          continue;
        }
        if (isInvalidMerchantCandidate(line)) continue;
        if (/@|[0-9]{5,}/.test(line)) continue;

        const corpMatch = line.match(/^([A-Za-z0-9\s&.,'-]+?\b(?:inc\.?|llc|llp|ltd\.?|limited|corp\.?|corporation|gmbh|company|co\.?|pvt\.?\s*ltd\.?|pte\.?\s*ltd\.?|b\.?v\.?|s\.?a\.?|plc|technologies|software|entertainment|services))\b/i);
        if (corpMatch && corpMatch[1] && !isInvalidMerchantCandidate(corpMatch[1])) {
          merchantName = cleanTitleCase(corpMatch[1]);
          merchantConfidence = 0.85;
          merchantEvidence = line;
          break;
        }
      }
    }

    // Fallback 1c: Supplier website or official email domain
    if (!merchantName) {
      const websiteEntity = getBestEntity("supplier_website");
      if (websiteEntity?.mentionText) {
        const domain = websiteEntity.mentionText.replace(/https?:\/\//i, "").replace(/www\./i, "").split(".")[0];
        if (domain && domain.length >= 2 && !/^(?:google|apple|microsoft|stripe|razorpay|paypal)$/i.test(domain)) {
          merchantName = cleanTitleCase(domain);
          merchantConfidence = 0.80;
          merchantEvidence = websiteEntity.mentionText;
        }
      }
    }

    // Fallback 1d: Clean document name if all else fails
    if (!merchantName && documentName) {
      const cleanDoc = documentName
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b(?:invoice|receipt|bill|statement|tax|oct|nov|dec|jan|feb|202[4-9])\b/gi, "")
        .trim();
      if (cleanDoc.length >= 2 && /[a-zA-Z]{2,}/.test(cleanDoc)) {
        merchantName = cleanTitleCase(cleanDoc);
        merchantConfidence = 0.45;
        merchantEvidence = `Filename: ${documentName}`;
      }
    }

    // SERVICE NAME: Extract line-item service / plan description
    let serviceName: string | null = null;
    let serviceConfidence = 0.0;
    let serviceEvidence: string | undefined = undefined;

    // Check line_item sub-entities from Document AI
    const lineItemEntities = getEntities("line_item");
    for (const item of lineItemEntities) {
      const descProp = (item.properties || []).find((p: any) => p.type === "line_item/description");
      if (descProp?.mentionText) {
        const desc = descProp.mentionText.trim().replace(/\s+/g, " ");
        if (desc.length >= 3 && desc.length <= 80 && !isInvalidMerchantCandidate(desc) && desc !== merchantName) {
          serviceName = desc;
          serviceConfidence = descProp.confidence || 0.90;
          serviceEvidence = descProp.mentionText;
          break;
        }
      }
    }

    // Fallback service detection from text
    if (!serviceName) {
      const planMatch = fullText.match(/(?:subscription(?:\s*to)?|plan(?:\s*name)?|membership|product(?:\s*name)?)[:\s]+([A-Za-z0-9\s+&/\\-]{3,60})(?=\r?\n|$|,|;)/i);
      if (planMatch && planMatch[1]) {
        const candidate = planMatch[1].trim();
        if (!/^(?:monthly|yearly|annual|active|verified|details|date|amount)$/i.test(candidate)) {
          serviceName = candidate;
          serviceConfidence = 0.82;
          serviceEvidence = planMatch[0];
        }
      }
    }

    if (!serviceName && merchantName) {
      serviceName = `${merchantName} Plan`;
      serviceConfidence = 0.65;
    }

    // =========================================================================
    // 2. UNIVERSAL FINANCIAL RESOLUTION ENGINE (TOTAL, SUBTOTAL, TAX, CHARGE)
    // =========================================================================
    const totalEntity = getBestEntity("total_amount");
    const netEntity = getBestEntity("net_amount");
    const taxEntity = getBestEntity("total_tax_amount");

    let extractedTotal = totalEntity?.normalizedValue?.extractedAmount !== undefined
      ? totalEntity.normalizedValue.extractedAmount
      : parseAmount(totalEntity?.mentionText?.replace(/[^0-9.]/g, ""));

    let extractedSubtotal = netEntity?.normalizedValue?.extractedAmount !== undefined
      ? netEntity.normalizedValue.extractedAmount
      : parseAmount(netEntity?.mentionText?.replace(/[^0-9.]/g, ""));

    let extractedTax = taxEntity?.normalizedValue?.extractedAmount !== undefined
      ? taxEntity.normalizedValue.extractedAmount
      : parseAmount(taxEntity?.mentionText?.replace(/[^0-9.]/g, ""));

    // Extract line-item subscription amount if distinct
    let subscriptionAmount: number | null = null;
    let subAmountConfidence = 0.0;
    for (const item of lineItemEntities) {
      const amtProp = (item.properties || []).find((p: any) => p.type === "line_item/amount");
      if (amtProp) {
        const val = amtProp.normalizedValue?.extractedAmount !== undefined
          ? amtProp.normalizedValue.extractedAmount
          : parseAmount(amtProp.mentionText?.replace(/[^0-9.]/g, ""));
        if (val && val > 0) {
          subscriptionAmount = val;
          subAmountConfidence = amtProp.confidence || 0.88;
          break;
        }
      }
    }

    // Mathematical reconciliation: Total = Subtotal + Tax
    let totalEvidence: string | undefined = totalEntity?.mentionText;
    let totalConfidence = totalEntity?.confidence || 0.0;

    if (extractedSubtotal !== null && extractedTax !== null) {
      const mathTotal = Math.round((extractedSubtotal + extractedTax) * 100) / 100;
      // If Document AI total was missing or grabbed the taxable subtotal (<= subtotal while tax exists):
      if (extractedTotal === null || extractedTotal <= extractedSubtotal) {
        if (fullText.includes(String(Math.round(mathTotal))) || fullText.includes(mathTotal.toFixed(2)) || extractedTotal === null) {
          extractedTotal = mathTotal;
          totalEvidence = `Reconciled: Subtotal (${extractedSubtotal}) + Tax (${extractedTax}) = ${mathTotal}`;
          totalConfidence = 0.96;
        }
      }
    }

    // Fallback text extraction if Document AI missed totals
    if (extractedTotal === null) {
      const explicitTotalRegex = /(?:grand\s*total|total\s*invoice\s*value|total\s*amount(?:\s*due|\s*paid|\s*payable)?|net\s*payable|amount\s*paid|paid\s*amount|total\s*charged|total\s*billed)(?:\s*\([^)]*\))?[:\s]*([₹$€£]|inr|usd|eur|gbp|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
      const m = fullText.match(explicitTotalRegex);
      if (m && m[2]) {
        const val = parseAmount(m[2]);
        if (val && val > 0) {
          extractedTotal = val;
          totalEvidence = m[0];
          totalConfidence = 0.90;
        }
      }
    }

    if (subscriptionAmount === null && extractedSubtotal !== null) {
      subscriptionAmount = extractedSubtotal;
      subAmountConfidence = 0.85;
    } else if (subscriptionAmount === null && extractedTotal !== null) {
      subscriptionAmount = extractedTotal;
      subAmountConfidence = totalConfidence;
    }

    // CURRENCY DETECTION
    let currency: string | null = totalEntity?.normalizedValue?.currencyCode || null;
    if (!currency) {
      if (/[$]|usd/i.test(fullText)) currency = "USD";
      else if (/[€]|eur/i.test(fullText)) currency = "EUR";
      else if (/[£]|gbp/i.test(fullText)) currency = "GBP";
      else if (/[₹]|inr|rs\.?/i.test(fullText)) currency = "INR";
      else currency = "USD";
    }
    if (currency === "₹") currency = "INR";
    if (currency === "$") currency = "USD";
    if (currency === "€") currency = "EUR";
    if (currency === "£") currency = "GBP";

    // =========================================================================
    // 3. PAYMENT METHOD (STRICT EVIDENCE-BASED, NEVER GUESS)
    // =========================================================================
    let paymentMethod: UniversalInvoiceExtraction["payment_method"] = "Unknown";
    let paymentMethodEvidence: string | undefined = undefined;
    let paymentConfidence = 0.0;

    const paymentTerms = getBestEntity("payment_terms")?.mentionText || "";
    const combinedPaymentContext = `${paymentTerms}\n${fullText}`;

    if (/\b(?:credit\s*card|visa|mastercard|amex|american\s*express|discover)\b/i.test(combinedPaymentContext)) {
      paymentMethod = "Credit Card";
      paymentConfidence = 0.92;
      paymentMethodEvidence = "Credit Card identified in payment terms / text";
    } else if (/\bdebit\s*card\b/i.test(combinedPaymentContext)) {
      paymentMethod = "Debit Card";
      paymentConfidence = 0.90;
      paymentMethodEvidence = "Debit Card identified in payment terms / text";
    } else if (/\b(?:card\s*ending\s*in|\*{3,}|\b\d{4}\b\s*card)/i.test(combinedPaymentContext)) {
      paymentMethod = "Credit Card";
      paymentConfidence = 0.85;
      paymentMethodEvidence = "Card reference detected";
    } else if (/\b(?:upi|okhdfcbank|okaxis|oksbi|paytm|gpay|google\s*pay|phonepe|upi\s*autopay)\b/i.test(combinedPaymentContext)) {
      paymentMethod = "UPI";
      paymentConfidence = 0.94;
      paymentMethodEvidence = "UPI rail / AutoPay identified";
    } else if (/\bpaypal\b/i.test(combinedPaymentContext)) {
      paymentMethod = "PayPal";
      paymentConfidence = 0.95;
      paymentMethodEvidence = "PayPal payment record";
    } else if (/\b(?:bank\s*transfer|wire\s*transfer|ach\s*transfer|direct\s*debit|neft|rtgs|nach)\b/i.test(combinedPaymentContext)) {
      paymentMethod = "Bank Transfer";
      paymentConfidence = 0.88;
      paymentMethodEvidence = "Bank transfer / direct debit record";
    }

    // =========================================================================
    // 4. BILLING CYCLE & RENEWAL DATES (EVIDENCE-DRIVEN)
    // =========================================================================
    let billingCycle: UniversalInvoiceExtraction["billing_cycle"] = "unknown";
    let billingCycleConfidence = 0.0;
    let billingCycleEvidence: string | undefined = undefined;

    const lowerText = fullText.toLowerCase();
    if (/\b(?:annual|annually|\/year|per\s*year|1\s*year|12\s*months?)\b/i.test(lowerText)) {
      billingCycle = "yearly";
      billingCycleConfidence = 0.90;
      billingCycleEvidence = "Annual / Yearly billing term matched";
    } else if (/\b(?:monthly|\/month|per\s*month|1\s*month|every\s*month|30\s*days?)\b/i.test(lowerText)) {
      billingCycle = "monthly";
      billingCycleConfidence = 0.90;
      billingCycleEvidence = "Monthly billing term matched";
    } else if (/\b(?:quarterly|\/quarter|per\s*quarter|3\s*months?)\b/i.test(lowerText)) {
      billingCycle = "quarterly";
      billingCycleConfidence = 0.90;
      billingCycleEvidence = "Quarterly billing term matched";
    } else if (/\b(?:weekly|\/week|per\s*week|7\s*days?)\b/i.test(lowerText)) {
      billingCycle = "weekly";
      billingCycleConfidence = 0.90;
      billingCycleEvidence = "Weekly billing term matched";
    }

    // DATES: Distinct invoice date, due date, billing period, and renewal date
    const invoiceDateEntity = getBestEntity("invoice_date");
    const dueDateEntity = getBestEntity("due_date");

    const invoiceDate = invoiceDateEntity?.normalizedValue?.text || invoiceDateEntity?.mentionText || null;
    const dueDate = dueDateEntity?.normalizedValue?.text || dueDateEntity?.mentionText || null;

    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    const periodMatch = fullText.match(/(?:service|billing)\s*period[:\s]+([0-9A-Za-z\s,-]{8,25})\s*(?:to|-|through)\s*([0-9A-Za-z\s,-]{8,25})/i);
    if (periodMatch) {
      periodStart = periodMatch[1].trim();
      periodEnd = periodMatch[2].trim();
    }

    // Explicit next renewal date vs derived
    let nextRenewalDate: string | null = null;
    let isRenewalDateDerived = false;
    let renewalDateEvidence: string | undefined = undefined;
    let renewalConfidence = 0.0;

    const renewalExplicitMatch = fullText.match(/(?:next\s*(?:renewal|billing|payment)\s*date|renews\s*on)[:\s]+([0-9A-Za-z\s,-]{8,25})/i);
    if (renewalExplicitMatch && renewalExplicitMatch[1]) {
      nextRenewalDate = renewalExplicitMatch[1].trim();
      isRenewalDateDerived = false;
      renewalConfidence = 0.92;
      renewalDateEvidence = renewalExplicitMatch[0];
    } else if (periodEnd) {
      // Derived from billing period end date
      nextRenewalDate = periodEnd;
      isRenewalDateDerived = true;
      renewalConfidence = 0.75;
      renewalDateEvidence = `Derived from billing period end: ${periodEnd}`;
    }

    // INVOICE NUMBER
    const invoiceIdEntity = getBestEntity("invoice_id") || getBestEntity("invoice_number");
    let invoiceNumber = invoiceIdEntity?.mentionText?.trim() || null;
    if (!invoiceNumber) {
      const invMatch = fullText.match(/(?:invoice\s*(?:number|no\.?|#|id)|tax\s*invoice\s*(?:no\.?|#)|inv\s*#)[:\s]*([a-zA-Z0-9\-_/]{4,30})\b/i);
      if (invMatch) invoiceNumber = invMatch[1].trim();
    }

    // =========================================================================
    // 5. STRUCTURED SCHEMA & EXTRACTION STATUS
    // =========================================================================
    let extractionStatus: UniversalInvoiceExtraction["extraction_status"] = "verified";
    if (!merchantName || extractedTotal === null) {
      extractionStatus = "manual_input_required";
    } else if (merchantConfidence < 0.70 || totalConfidence < 0.70 || billingCycle === "unknown" || paymentMethod === "Unknown") {
      extractionStatus = "needs_review";
    }

    const extractionResult: UniversalInvoiceExtraction = {
      merchant_name: merchantName,
      service_name: serviceName,
      invoice_number: invoiceNumber,
      subscription_amount: subscriptionAmount,
      subtotal: extractedSubtotal,
      tax_amount: extractedTax,
      total_amount: extractedTotal,
      currency,
      payment_method: paymentMethod,
      billing_cycle: billingCycle,
      invoice_date: invoiceDate,
      payment_date: invoiceDate,
      due_date: dueDate,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      next_renewal_date: nextRenewalDate,
      is_renewal_date_derived: isRenewalDateDerived,
      fields_confidence: {
        merchant_name: Math.round(merchantConfidence * 100) / 100,
        service_name: Math.round(serviceConfidence * 100) / 100,
        total_amount: Math.round(totalConfidence * 100) / 100,
        subscription_amount: Math.round(subAmountConfidence * 100) / 100,
        currency: 0.95,
        payment_method: Math.round(paymentConfidence * 100) / 100,
        billing_cycle: Math.round(billingCycleConfidence * 100) / 100,
        invoice_date: invoiceDateEntity ? 0.95 : 0.70,
        next_renewal_date: Math.round(renewalConfidence * 100) / 100,
      },
      field_evidence: {
        merchant_name: merchantEvidence,
        service_name: serviceEvidence,
        total_amount: totalEvidence,
        payment_method: paymentMethodEvidence,
        billing_cycle: billingCycleEvidence,
        next_renewal_date: renewalDateEvidence,
      },
      extraction_status: extractionStatus,
      raw_text: fullText.slice(0, 500),
    };

    // Maintain backward-compatible data object alongside universal schema
    const responsePayload = {
      success: true,
      data: {
        ...extractionResult,
        // Legacy compatibility mappings
        merchantName: extractionResult.merchant_name,
        rawMerchantName: extractionResult.merchant_name,
        totalAmount: extractionResult.total_amount,
        subtotal: extractionResult.subtotal,
        taxAmount: extractionResult.tax_amount,
        currency: extractionResult.currency,
        invoiceDate: extractionResult.invoice_date,
        renewalDate: extractionResult.next_renewal_date,
        paymentMethod: extractionResult.payment_method !== "Unknown" ? extractionResult.payment_method : null,
        cadence: extractionResult.billing_cycle !== "unknown" ? extractionResult.billing_cycle : null,
        confidence: Math.round(((merchantConfidence + totalConfidence) / 2) * 100),
        source: "google_cloud_document_ai",
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Failed to process document with Document AI" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
