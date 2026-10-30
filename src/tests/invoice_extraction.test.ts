import { describe, it, expect } from 'vitest';
import {
  identifyMerchant,
  extractTotalAmountAndCurrency,
  extractPaymentMethod,
  extractInvoiceNumber,
  extractDatesAndPeriod,
  sanitizePdfExtractedText,
  parseMonetaryValue,
} from '../lib/invoiceExtractor';
import { extractTransactionsFromText } from '../lib/ocrParser';

describe('Invoice Upload & Extraction Accuracy Test Suite', () => {
  // =========================================================================
  // 1. LINKEDIN INVOICE TEST (Root Cause & Misidentification Fix)
  // =========================================================================
  describe('Problem 1: LinkedIn Invoice Identification', () => {
    it('identifies LinkedIn as merchant and NEVER misidentifies it as Adobe, even with Adobe PDF Library metadata', () => {
      // Real-world scenario: LinkedIn invoice exported via Adobe Distiller/Library
      const rawPdfDocument = `
        %PDF-1.4
        /Producer (Adobe PDF Library 15.0)
        /Creator (Adobe InDesign 16.0)
        stream
        LinkedIn Ireland Unlimited Company
        Wilton Plaza, Wilton Place, Dublin 2, Ireland
        VAT Number: IE9740425P
        INVOICE #LI-2026-98124
        Invoice Date: Oct 20, 2026
        Billing Period: Oct 20, 2026 - Nov 19, 2026
        Description: LinkedIn Premium Career Monthly Subscription
        Subtotal: ₹1,270.34
        IGST (18%): ₹228.66
        Total Amount Paid: ₹1,499.00
        Payment Method: Visa ending in 4092
        Next renewal date: Nov 20, 2026
        endstream
      `;

      // 1. Sanitize PDF metadata tags
      const sanitized = sanitizePdfExtractedText(rawPdfDocument);
      expect(sanitized).not.toContain('/Producer');
      expect(sanitized).not.toContain('/Creator');

      // 2. Identify Merchant
      const merchantResult = identifyMerchant(rawPdfDocument, 'LinkedIn_Invoice_Oct2026.pdf');
      expect(merchantResult.merchantName.value).toBe('LinkedIn');
      expect(merchantResult.merchantName.value).not.toBe('Adobe'); // CRITICAL: NEVER ADOBE
      expect(merchantResult.merchantName.status).toBe('high');

      // 3. Amount & Currency
      const amountResult = extractTotalAmountAndCurrency(rawPdfDocument, 'LinkedIn_Invoice_Oct2026.pdf', 'INR');
      expect(amountResult.totalAmount.value).toBe(1499);
      expect(amountResult.currency.value).toBe('INR');
      expect(amountResult.totalAmount.confidence).toBeGreaterThanOrEqual(90);

      // 4. Payment Method
      const paymentResult = extractPaymentMethod(rawPdfDocument);
      expect(paymentResult.value).toBe('Visa •••• 4092');
      expect(paymentResult.status).toBe('high');

      // 5. Invoice Number & Dates
      const invNum = extractInvoiceNumber(rawPdfDocument);
      expect(invNum.value).toBe('LI-2026-98124');

      const dates = extractDatesAndPeriod(rawPdfDocument, 'monthly');
      expect(dates.invoiceDate.value).toBe('2026-10-20');
      expect(dates.renewalDate.value).toBe('2026-11-20');
    });
  });

  // =========================================================================
  // 2. ADOBE CREATIVE CLOUD TEST
  // =========================================================================
  describe('Authentic Adobe Invoice Extraction', () => {
    it('correctly identifies Adobe when document is genuinely from Adobe Systems', () => {
      const adobeInvoice = `
        Adobe Systems Software Ireland Limited
        4-6 Riverwalk, Citywest Business Campus, Dublin 24, Ireland
        VAT: IE6364992H
        Tax Invoice / Receipt: #ADB-88192-2026
        Invoice Date: 15-Oct-2026
        Product: Adobe Creative Cloud All Apps Membership (One-Year)
        Billing Period: 15-Oct-2026 to 14-Nov-2026
        Subtotal: ₹3,584.75
        IGST @ 18%: ₹645.25
        Grand Total: ₹4,230.00
        Paid via: Mastercard ending in 9102
        Renews on: 15-Nov-2026
      `;

      const merchant = identifyMerchant(adobeInvoice, 'Adobe_Invoice_ADB-88192.pdf');
      expect(merchant.merchantName.value).toBe('Adobe');

      const amount = extractTotalAmountAndCurrency(adobeInvoice, 'Adobe_Invoice_ADB-88192.pdf', 'INR');
      expect(amount.totalAmount.value).toBe(4230);
      expect(amount.currency.value).toBe('INR');
      expect(amount.subtotal.value).toBe(3584.75);
      expect(amount.taxAmount.value).toBe(645.25);

      const payment = extractPaymentMethod(adobeInvoice);
      expect(payment.value).toBe('Mastercard •••• 9102');
    });
  });

  // =========================================================================
  // 3. NETFLIX SUBSCRIPTION TEST
  // =========================================================================
  describe('Netflix Invoice Extraction', () => {
    it('identifies Netflix and extracts UPI AutoPay handle', () => {
      const netflixReceipt = `
        Netflix International B.V.
        Invoice Date: October 18, 2026
        Invoice #NF-2026-4412
        Subscription: Netflix Premium Plan (Ultra HD)
        Total Amount: ₹649.00
        Payment Method: UPI AutoPay (user@oksbi)
        Next billing date: November 18, 2026
      `;

      const merchant = identifyMerchant(netflixReceipt, 'Netflix_Receipt_Oct.pdf');
      expect(merchant.merchantName.value).toBe('Netflix');

      const amount = extractTotalAmountAndCurrency(netflixReceipt, 'Netflix_Receipt_Oct.pdf', 'INR');
      expect(amount.totalAmount.value).toBe(649);
      expect(amount.currency.value).toBe('INR');

      const payment = extractPaymentMethod(netflixReceipt);
      expect(payment.value).toBe('UPI AutoPay (user@oksbi)');

      const dates = extractDatesAndPeriod(netflixReceipt);
      expect(dates.invoiceDate.value).toBe('2026-10-18');
      expect(dates.renewalDate.value).toBe('2026-11-18');
    });
  });

  // =========================================================================
  // 4. SUBTOTAL, TAX & DISCOUNT MATH VALIDATION
  // =========================================================================
  describe('Problem 2: Accurate Amount Extraction (Grand Total vs Subtotal & Tax)', () => {
    it('prioritizes Final Grand Total and does not mistake subtotal or tax for total', () => {
      const complexInvoice = `
        Figma, Inc.
        760 Market Street, 10th Floor, San Francisco, CA 94102
        INVOICE #FIG-99812
        Date of Issue: 2026-10-01
        Figma Organization Plan - 5 Editor Seats
        Net Subtotal: $225.00
        Promotional Discount: -$25.00
        State Sales Tax: $16.00
        Final Amount Charged: $216.00
        Paid via Credit Card ending in 1188
      `;

      const amountResult = extractTotalAmountAndCurrency(complexInvoice, 'figma_inv.pdf', 'USD');
      // Subtotal was $225, but Grand Total charged was $216.00
      expect(amountResult.totalAmount.value).toBe(216);
      expect(amountResult.subtotal.value).toBe(225);
      expect(amountResult.currency.value).toBe('USD');
    });

    it('parses European comma decimal formatted amounts properly', () => {
      expect(parseMonetaryValue('1.499,00')).toBe(1499.00);
      expect(parseMonetaryValue('1,499.00')).toBe(1499.00);
      expect(parseMonetaryValue('17,99')).toBe(17.99);
      expect(parseMonetaryValue('649')).toBe(649);
    });
  });

  // =========================================================================
  // 5. MISSING PAYMENT METHOD (STRICT EVIDENCE ONLY)
  // =========================================================================
  describe('Problem 3: Missing Payment Method Handling', () => {
    it('returns null and missing status when no payment method exists in invoice', () => {
      const invoiceWithoutPayment = `
        Notion Labs, Inc.
        Invoice #NTN-55421
        Date: September 15, 2026
        Notion Plus Plan - Annual
        Total Due: $96.00
        Payment Due Date: October 15, 2026
      `;

      const payment = extractPaymentMethod(invoiceWithoutPayment);
      expect(payment.value).toBeNull();
      expect(payment.status).toBe('missing');
      expect(payment.confidence).toBe(0);

      // Verify ocrParser also returns undefined instead of fabricating cards
      const txs = extractTransactionsFromText(invoiceWithoutPayment, 'notion.pdf', 'USD');
      expect(txs[0].paymentSource).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. MULTI-CURRENCY SUPPORT (EUR, GBP, USD, INR)
  // =========================================================================
  describe('Multi-Currency Invoices', () => {
    it('extracts Euro currency and amounts correctly', () => {
      const euroInvoice = `
        Spotify AB
        Regeringsgatan 19, SE-111 53 Stockholm, Sweden
        Date: 05/10/2026
        Spotify Premium Family
        Subtotal: 14,99 €
        TVA (20%): 3,00 €
        Total Payé: 17,99 €
        Carte bancaire se terminant par 5521
      `;

      const res = extractTotalAmountAndCurrency(euroInvoice, 'spotify_euro.pdf', 'EUR');
      expect(res.currency.value).toBe('EUR');
      expect(res.totalAmount.value).toBe(17.99);

      const payment = extractPaymentMethod(euroInvoice);
      expect(payment.value).toBe('Card •••• 5521');
    });

    it('extracts British Pound GBP currency correctly', () => {
      const gbpInvoice = `
        GitHub, Inc.
        Invoice Date: 12 Oct 2026
        GitHub Copilot Individual Plan
        Total Charged: £10.00
        Billed to Barclays Visa ending in 7712
      `;

      const res = extractTotalAmountAndCurrency(gbpInvoice, 'github_gbp.pdf', 'GBP');
      expect(res.currency.value).toBe('GBP');
      expect(res.totalAmount.value).toBe(10);

      const payment = extractPaymentMethod(gbpInvoice);
      expect(payment.value).toBe('BARCLAYS Visa •••• 7712');
    });
  });

  // =========================================================================
  // 7. CROSS-DOCUMENT ISOLATION (PDF CREATOR LEAK TEST)
  // =========================================================================
  describe('Cross-Document Data Contamination Prevention', () => {
    it('does NOT get confused by Adobe Distiller / Acrobat tags on a Slack invoice', () => {
      const slackWithAdobeProducer = `
        %PDF-1.7
        /Producer (Adobe Acrobat Pro DC 2026.001.20000)
        /Creator (Adobe InDesign 2026)
        stream
        Slack Technologies LLC
        500 Howard Street, San Francisco, CA 94105
        Invoice Number: INV-SLACK-88123
        Date: Oct 22, 2026
        Slack Pro Plan - Monthly Subscription
        Grand Total: $15.00
        Payment Method: American Express ending in 3009
        endstream
      `;

      const merchant = identifyMerchant(slackWithAdobeProducer, 'Slack_Inv_Oct2026.pdf');
      expect(merchant.merchantName.value).toBe('Slack');
      expect(merchant.merchantName.value).not.toBe('Adobe');

      const payment = extractPaymentMethod(slackWithAdobeProducer);
      expect(payment.value).toBe('American Express •••• 3009');
    });
  });

  // =========================================================================
  // 9. NO MONETARY AMOUNT, MISSING FREQUENCY & MISSING RENEWAL DATE
  // =========================================================================
  describe('Strict Missing Information & No Defaults', () => {
    it('returns totalAmount as null and NEVER defaults to ₹0.00 or $0.00', () => {
      const docWithNoAmount = `
        AWS Welcome Letter
        Amazon Web Services, Inc.
        Thank you for subscribing to AWS Free Tier.
        Account Number: 1234-5678-9012
        No monetary payment was charged.
      `;

      const result = extractTotalAmountAndCurrency(docWithNoAmount, 'aws_welcome.pdf', 'INR');
      expect(result.totalAmount.value).toBeNull();
      expect(result.totalAmount.status).toBe('missing');
      expect(result.totalAmount.confidence).toBe(0);
      expect(result.totalAmount.value).not.toBe(0); // MUST NEVER BE 0.00
    });

    it('returns billingFrequency as null when not specified and NEVER defaults to monthly', () => {
      const oneOffReceipt = `
        Apple Store Receipt
        Receipt #APL-99128
        Date: 2026-10-15
        Hardware Accessory Purchase
        Total Amount: $49.00
      `;

      const dates = extractDatesAndPeriod(oneOffReceipt, null);
      expect(dates.billingFrequency.value).toBeNull();
      expect(dates.billingFrequency.status).toBe('missing');
      expect(dates.billingFrequency.value).not.toBe('monthly'); // MUST NEVER DEFAULT TO MONTHLY
    });

    it('returns renewalDate as null when not stated and NEVER invents a date', () => {
      const receiptNoRenewal = `
        GitHub Inc.
        Invoice Date: October 10, 2026
        GitHub Copilot Organization Seat
        Total Charged: $19.00
      `;

      const dates = extractDatesAndPeriod(receiptNoRenewal, null);
      expect(dates.renewalDate.value).toBeNull();
      expect(dates.renewalDate.status).toBe('missing');
    });
  });

  // =========================================================================
  // 10. MULTI-LINE TOTAL & TOTAL WITH TAX LINE-ITEM PATTERNS
  // =========================================================================
  describe('Complex Total Amount Document Patterns', () => {
    it('extracts Grand Total when line contains "incl. GST" without being skipped as a tax line', () => {
      const inclGstInvoice = `
        Atlassian Pty Ltd
        Invoice #ATL-10924
        Subtotal: ₹1,000.00
        IGST (18%): ₹180.00
        Total (incl. GST): ₹1,180.00
        Amount Paid: ₹1,180.00
      `;

      const res = extractTotalAmountAndCurrency(inclGstInvoice, 'atlassian.pdf', 'INR');
      expect(res.totalAmount.value).toBe(1180);
      expect(res.subtotal.value).toBe(1000);
      expect(res.taxAmount.value).toBe(180);
      expect(res.currency.value).toBe('INR');
      expect(res.totalAmount.value).not.toBe(1000);
      expect(res.totalAmount.value).not.toBe(180);
    });

    it('extracts Total when header and amount are on consecutive lines in table format', () => {
      const tableInvoice = `
        Spotify India
        Invoice Date: 2026-10-25
        Subtotal
        ₹119.00
        Total Amount Due:
        ₹119.00
      `;

      const res = extractTotalAmountAndCurrency(tableInvoice, 'spotify_table.pdf', 'INR');
      expect(res.totalAmount.value).toBe(119);
      expect(res.currency.value).toBe('INR');
    });

    it('extracts consecutive documents independently without data contamination', () => {
      const doc1 = `
        Netflix International B.V.
        Invoice #NF-101
        Total Amount: ₹649.00
        Payment Method: UPI AutoPay (user@okhdfcbank)
      `;

      const doc2 = `
        LinkedIn Ireland Unlimited Company
        Invoice #LI-202
        Total Amount Paid: ₹1,499.00
        Paid via Visa ending in 4092
      `;

      const res1 = extractTotalAmountAndCurrency(doc1, 'netflix.pdf', 'INR');
      const merchant1 = identifyMerchant(doc1, 'netflix.pdf');
      const pay1 = extractPaymentMethod(doc1);

      const res2 = extractTotalAmountAndCurrency(doc2, 'linkedin.pdf', 'INR');
      const merchant2 = identifyMerchant(doc2, 'linkedin.pdf');
      const pay2 = extractPaymentMethod(doc2);

      expect(merchant1.merchantName.value).toBe('Netflix');
      expect(res1.totalAmount.value).toBe(649);
      expect(pay1.value).toBe('UPI AutoPay (user@okhdfcbank)');

      expect(merchant2.merchantName.value).toBe('LinkedIn');
      expect(res2.totalAmount.value).toBe(1499);
      expect(pay2.value).toBe('Visa •••• 4092');

      // Zero cross-contamination
      expect(merchant1.merchantName.value).not.toBe(merchant2.merchantName.value);
      expect(res1.totalAmount.value).not.toBe(res2.totalAmount.value);
      expect(pay1.value).not.toBe(pay2.value);
    });
  });

  // =========================================================================
  // 11. UNIVERSAL ARBITRARY SAAS INVOICE EXTRACTION (NO HARDCODED VENDORS)
  // =========================================================================
  describe('Universal Arbitrary SaaS Extraction', () => {
    it('accurately extracts unknown German SaaS vendor and European amount without defaulting', () => {
      const germanInvoice = `
        Superscale Analytics GmbH
        Friedrichstraße 123, 10117 Berlin, Germany
        Steuer-Nr: 30/123/45678
        Rechnung / Invoice #SSA-2026-8810
        Datum / Date: 14.10.2026
        Leistungszeitraum: 14.10.2026 - 13.11.2026
        Beschreibung: Enterprise Telemetry & Cloud Metrics Plan
        Nettobetrag: 125,21 €
        USt (19%): 23,79 €
        Gesamtbetrag / Total Amount: 149,00 €
        Zahlungsmethode: SEPA Direct Debit ending in 4109
        Nächste Verlängerung: 14.11.2026
      `;

      const merchant = identifyMerchant(germanInvoice, 'Superscale_Invoice.pdf');
      expect(merchant.merchantName.value).toContain('Superscale Analytics');
      expect(merchant.merchantName.value).not.toBe('Adobe');
      expect(merchant.merchantName.value).not.toBe('Netflix');

      const amount = extractTotalAmountAndCurrency(germanInvoice, 'Superscale_Invoice.pdf', 'EUR');
      expect(amount.currency.value).toBe('EUR');
      expect(amount.totalAmount.value).toBe(149);
      expect(amount.subtotal.value).toBe(125.21);
      expect(amount.taxAmount.value).toBe(23.79);

      const payment = extractPaymentMethod(germanInvoice);
      expect(payment.value).toBe('SEPA Direct Debit •••• 4109');

      const dates = extractDatesAndPeriod(germanInvoice);
      expect(dates.invoiceDate.value).toBe('2026-10-14');
      expect(dates.renewalDate.value).toBe('2026-11-14');
    });

    it('accurately extracts unknown US SaaS vendor with custom pricing ($89.50)', () => {
      const usSaaSInvoice = `
        CloudFlow Technologies Inc.
        555 Silicon Way, Suite 400, Austin, TX 78701
        INVOICE #CF-99201
        Invoice Date: October 24, 2026
        Billed To: Acme Corp
        Item Description: CloudFlow Worker Fleet - 10 Dedicated Nodes
        Subtotal: $85.00
        Sales Tax: $4.50
        Final Total Paid: $89.50
        Payment Method: Mastercard ending in 6621
      `;

      const merchant = identifyMerchant(usSaaSInvoice, 'CloudFlow_Inv.pdf');
      expect(merchant.merchantName.value).toContain('CloudFlow Technologies');

      const amount = extractTotalAmountAndCurrency(usSaaSInvoice, 'CloudFlow_Inv.pdf', 'USD');
      expect(amount.currency.value).toBe('USD');
      expect(amount.totalAmount.value).toBe(89.5);
      expect(amount.subtotal.value).toBe(85);
      expect(amount.taxAmount.value).toBe(4.5);

      const payment = extractPaymentMethod(usSaaSInvoice);
      expect(payment.value).toBe('Mastercard •••• 6621');
    });

    it('accurately extracts unknown Indian SaaS vendor with custom pricing (₹4,999.00)', () => {
      const indianSaaSInvoice = `
        Billed By: IndicAI Solutions Pvt Ltd
        GSTIN: 29AABCU9603R1ZM
        Tax Invoice Number: IND-2026-091
        Date of Invoice: 28-10-2026
        Subscription: IndicLLM Fine-Tuning Cluster Tier 2
        Subtotal: ₹4,236.44
        CGST 9%: ₹381.28
        SGST 9%: ₹381.28
        Total Invoice Value: ₹4,999.00
        Payment Mode: UPI AutoPay (team@okaxis)
        Billing Cadence: Monthly Subscription
      `;

      const merchant = identifyMerchant(indianSaaSInvoice, 'IndicAI_Tax_Invoice.pdf');
      expect(merchant.merchantName.value).toContain('IndicAI Solutions');

      const amount = extractTotalAmountAndCurrency(indianSaaSInvoice, 'IndicAI_Tax_Invoice.pdf', 'INR');
      expect(amount.currency.value).toBe('INR');
      expect(amount.totalAmount.value).toBe(4999);
      expect(amount.subtotal.value).toBe(4236.44);

      const payment = extractPaymentMethod(indianSaaSInvoice);
      expect(payment.value).toBe('UPI AutoPay (team@okaxis)');

      const dates = extractDatesAndPeriod(indianSaaSInvoice);
      expect(dates.invoiceDate.value).toBe('2026-10-28');
      expect(dates.billingFrequency.value).toBe('monthly');
    });
  });
});
