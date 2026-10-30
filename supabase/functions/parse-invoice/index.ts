// Supabase Edge Function: parse-invoice
// Google Cloud Document AI (Invoice Parser) processor endpoint

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generic Document & Structure Terms that must NEVER be accepted as merchant names
const GENERIC_DOCUMENT_TERMS = new Set([
  "details", "recipient details", "recipient", "receiver details", "receiver",
  "buyer details", "buyer", "customer details", "customer", "client details", "client",
  "consignee details", "consignee", "billed to", "bill to", "shipped to", "ship to",
  "billing information", "billing info", "billing details", "billing address",
  "shipping address", "shipping information", "payment details", "payment information",
  "payment method", "bank details", "account details", "invoice details", "order details",
  "tax invoice", "original for recipient", "duplicate for transporter", "authorized signatory",
  "terms and conditions", "particulars", "description of goods", "description of service",
  "line items", "invoice verified", "doc ai verified", "subscription service",
  "place of supply", "hsn code", "sac code", "gstin number", "pan number",
  "subtotal", "grand total", "total amount", "tax total", "cgst", "sgst", "igst"
]);

const GENERIC_KEYWORD_SET = new Set([
  "details", "recipient", "receiver", "customer", "client", "buyer", "consignee",
  "billed", "bill", "shipped", "ship", "invoice", "receipt", "statement",
  "summary", "information", "info", "payment", "bank", "account", "particulars",
  "description", "items", "item", "signatory", "signature", "declaration",
  "terms", "conditions", "subtotal", "total", "amount", "tax", "verified", "unknown"
]);

function isValidMerchantName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (!/[a-zA-Z]{2,}/.test(trimmed)) return false;
  if (trimmed.includes("@") || /https?:\/\/|www\./i.test(trimmed)) return false;

  // Reject tax / registration numbers
  if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(trimmed)) return false;
  if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(trimmed)) return false;

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (GENERIC_DOCUMENT_TERMS.has(normalized)) return false;

  const prefixes = [
    "details", "recipient", "receiver", "customer", "client", "buyer", "consignee",
    "billed to", "bill to", "shipped to", "ship to", "invoice details", "payment details",
    "tax invoice", "original for", "duplicate for", "authorized signatory", "terms and conditions"
  ];
  for (const p of prefixes) {
    if (normalized === p || normalized.startsWith(p + " ")) return false;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.every((w) => GENERIC_KEYWORD_SET.has(w))) return false;

  return true;
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

  // Clean PEM private key
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

    // Call Google Cloud Document AI Process endpoint
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

    const entities: any[] = docAiData.document?.entities || [];

    // Helper functions to extract entity text and normalized values
    const getEntity = (type: string) => entities.find((e) => e.type === type);
    const getEntityVal = (type: string) => getEntity(type)?.mentionText?.trim();

    // 1. Supplier / Merchant Name (Strictly disambiguated from customer/receiver)
    const supplierEntity = getEntity("supplier_name");
    const receiverEntity = getEntity("receiver_name");
    let rawSupplier = supplierEntity?.mentionText?.trim() || null;
    const rawReceiver = receiverEntity?.mentionText?.trim() || null;

    // Reject supplier if it matches receiver or fails validation
    if (rawSupplier) {
      if (rawReceiver && rawSupplier.toLowerCase() === rawReceiver.toLowerCase()) {
        rawSupplier = null; // NEVER use receiver_name as supplier_name
      } else if (!isValidMerchantName(rawSupplier)) {
        rawSupplier = null; // NEVER accept generic headings or labels
      }
    }

    // Fallback 1: supplier_website entity
    if (!rawSupplier) {
      const web = getEntityVal("supplier_website");
      if (web) {
        const domain = web.replace(/https?:\/\//i, "").replace(/www\./i, "").split(/[\/.]/)[0];
        if (domain && isValidMerchantName(domain)) {
          rawSupplier = domain;
        }
      }
    }

    // Fallback 2: supplier_email entity
    if (!rawSupplier) {
      const email = getEntityVal("supplier_email");
      if (email && email.includes("@")) {
        const domainPart = email.split("@")[1]?.split(".")[0];
        if (domainPart && !/^(?:gmail|yahoo|hotmail|outlook|icloud|proton|live|msn)$/i.test(domainPart) && isValidMerchantName(domainPart)) {
          rawSupplier = domainPart;
        }
      }
    }

    // Clean and canonicalize merchant name
    let canonicalMerchant: string | null = null;
    if (rawSupplier) {
      const lower = rawSupplier.toLowerCase();
      if (/netflix/i.test(lower)) canonicalMerchant = "Netflix";
      else if (/hotstar|disney/i.test(lower)) canonicalMerchant = "Disney+ Hotstar";
      else if (/linkedin/i.test(lower)) canonicalMerchant = "LinkedIn";
      else if (/spotify/i.test(lower)) canonicalMerchant = "Spotify";
      else if (/github/i.test(lower)) canonicalMerchant = "GitHub";
      else if (/adobe/i.test(lower)) canonicalMerchant = "Adobe";
      else if (/amazon\s*web|\baws\b/i.test(lower)) canonicalMerchant = "Amazon Web Services (AWS)";
      else if (/google\s*cloud|\bgcp\b/i.test(lower)) canonicalMerchant = "Google Cloud Platform";
      else if (/canva/i.test(lower)) canonicalMerchant = "Canva";
      else if (/slack/i.test(lower)) canonicalMerchant = "Slack";
      else if (/notion/i.test(lower)) canonicalMerchant = "Notion";
      else if (/zoom/i.test(lower)) canonicalMerchant = "Zoom";
      else if (/openai|chatgpt/i.test(lower)) canonicalMerchant = "OpenAI";
      else if (/anthropic|claude/i.test(lower)) canonicalMerchant = "Anthropic";
      else if (/microsoft/i.test(lower)) canonicalMerchant = "Microsoft";
      else {
        canonicalMerchant = rawSupplier
          .replace(/\b(?:pvt\.?\s*ltd\.?|private\s*limited|ltd\.?|limited|inc\.?|llc|llp|corp\.?|corporation|gmbh|co\.)\b\.?/gi, "")
          .trim()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }

    // 2. Financial Totals (Prioritizing structured total_amount over net_amount / subtotal)
    const totalEntity = getEntity("total_amount");
    const netEntity = getEntity("net_amount");
    const taxEntity = getEntity("total_tax_amount");

    const totalAmount = totalEntity?.normalizedValue?.extractedAmount !== undefined
      ? totalEntity.normalizedValue.extractedAmount
      : (totalEntity?.mentionText ? parseFloat(totalEntity.mentionText.replace(/[^0-9.]/g, "")) : null);

    const subtotal = netEntity?.normalizedValue?.extractedAmount !== undefined
      ? netEntity.normalizedValue.extractedAmount
      : (netEntity?.mentionText ? parseFloat(netEntity.mentionText.replace(/[^0-9.]/g, "")) : null);

    const taxAmount = taxEntity?.normalizedValue?.extractedAmount !== undefined
      ? taxEntity.normalizedValue.extractedAmount
      : (taxEntity?.mentionText ? parseFloat(taxEntity.mentionText.replace(/[^0-9.]/g, "")) : null);

    // Final Total selection
    let finalTotal: number | null = totalAmount;
    if (finalTotal === null && subtotal !== null) {
      finalTotal = subtotal;
    } else if (finalTotal !== null && subtotal !== null && finalTotal < subtotal) {
      finalTotal = Math.max(finalTotal, subtotal);
    }

    // Currency Detection (ISO Currency Code from Document AI)
    let currency = totalEntity?.normalizedValue?.currencyCode || "INR";
    if (currency === "₹") currency = "INR";
    if (currency === "$") currency = "USD";
    if (currency === "€") currency = "EUR";
    if (currency === "£") currency = "GBP";

    // 3. Billing Dates
    const invoiceDateEntity = getEntity("invoice_date");
    const dueDateEntity = getEntity("due_date");
    const invoiceDate = invoiceDateEntity?.normalizedValue?.text || invoiceDateEntity?.mentionText || null;
    const dueDate = dueDateEntity?.normalizedValue?.text || dueDateEntity?.mentionText || null;

    // 4. Payment Method & Terms (Evidence-only)
    const paymentTerms = getEntityVal("payment_terms");
    let paymentMethod: string | null = null;
    if (paymentTerms && /card|visa|mastercard|amex/i.test(paymentTerms)) {
      paymentMethod = paymentTerms;
    } else if (/okhdfcbank|okaxis|oksbi|gpay|phonepe/i.test(docAiData.document?.text || "")) {
      paymentMethod = "UPI AutoPay";
    }

    // 5. Cadence / Frequency (Evidence-only)
    const fullText = (docAiData.document?.text || "").toLowerCase();
    let cadence: "monthly" | "yearly" | "unknown" = "unknown";
    if (fullText.includes("/year") || fullText.includes("per year") || fullText.includes("annual") || fullText.includes("yearly")) {
      cadence = "yearly";
    } else if (fullText.includes("/month") || fullText.includes("per month") || fullText.includes("monthly")) {
      cadence = "monthly";
    }

    // 6. Honest Confidence Scoring
    const supplierConfidence = supplierEntity?.confidence ?? 0;
    const totalConfidence = totalEntity?.confidence ?? 0;
    let finalConfidence = 0;
    let needsReview = false;

    if (canonicalMerchant && finalTotal !== null) {
      const sc = supplierConfidence > 0 ? supplierConfidence : 0.85;
      const tc = totalConfidence > 0 ? totalConfidence : 0.90;
      finalConfidence = Math.round((sc * 0.5 + tc * 0.5) * 100);
    } else if (finalTotal !== null) {
      finalConfidence = Math.min(45, Math.round((totalConfidence || 0.7) * 50));
      needsReview = true;
    } else {
      finalConfidence = 30;
      needsReview = true;
    }

    const result = {
      merchantName: canonicalMerchant,
      rawMerchantName: rawSupplier,
      totalAmount: finalTotal,
      subtotal,
      taxAmount,
      currency,
      invoiceDate,
      renewalDate: dueDate || invoiceDate,
      paymentMethod,
      cadence,
      confidence: finalConfidence,
      needsReview,
      source: "google_cloud_document_ai",
    };

    return new Response(JSON.stringify({ success: true, data: result }), {
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
