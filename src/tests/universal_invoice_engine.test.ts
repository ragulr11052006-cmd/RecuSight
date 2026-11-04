import { describe, it, expect } from 'vitest';
import {
  identifyMerchant,
  extractTotalAmountAndCurrency,
  extractPaymentMethod,
  extractInvoiceNumber,
  extractDatesAndPeriod,
  normalizePaymentMethod,
  isValidMerchantName,
  parseMonetaryValue,
} from '../lib/invoiceExtractor';

describe('Universal Dynamic Invoice Extraction Engine Tests', () => {
  // =========================================================================
  // TEST 1: UNSEEN GERMAN SAAS MERCHANT (European currency & comma decimals)
  // =========================================================================
  it('correctly extracts completely unseen European merchant with German layout & VAT', () => {
    const germanInvoice = `
      Klaro Analytics Systems GmbH
      Friedrichstraße 120, 10117 Berlin, Deutschland
      USt-IdNr.: DE301984210
      Rechnungsnummer: RE-2026-8812
      Rechnungsdatum: 12.10.2026
      Leistungszeitraum: 12.10.2026 - 11.10.2027
      Plan: Klaro Enterprise Analytics Jahresabonnement
      Zwischensumme: 2.500,00 €
      MwSt. 19%: 475,00 €
      Gesamtbetrag: 2.975,00 €
      Zahlungsart: SEPA-Lastschrift / Direct Debit
    `;

    // 1. Merchant Identification
    const merchant = identifyMerchant(germanInvoice, 'RE-2026-8812_Klaro.pdf');
    expect(merchant.merchantName.value).toBe('Klaro Analytics Systems');
    expect(merchant.serviceName.value).toContain('Klaro Enterprise Analytics');

    // 2. Financial Totals & European comma decimals
    const amount = extractTotalAmountAndCurrency(germanInvoice, 'RE-2026-8812_Klaro.pdf', 'EUR');
    expect(amount.currency.value).toBe('EUR');
    expect(amount.totalAmount.value).toBe(2975);
    expect(amount.subtotal.value).toBe(2500);
    expect(amount.taxAmount.value).toBe(475);

    // 3. Payment Method
    const payment = extractPaymentMethod(germanInvoice);
    expect(normalizePaymentMethod(payment.value)).toBe('Bank Transfer');

    // 4. Cadence & Derived Renewal Date
    const dates = extractDatesAndPeriod(germanInvoice);
    expect(dates.billingFrequency.value).toBe('yearly');
    expect(dates.invoiceDate.value).toBe('2026-10-12');
  });

  // =========================================================================
  // TEST 2: UNSEEN US SAAS MERCHANT WITH PROMOTIONAL DISCOUNT & MULTI-TAX
  // =========================================================================
  it('correctly reconciles total charge when invoice has subtotal, coupon discount, and sales tax', () => {
    const usDiscountInvoice = `
      Veloce Compute Corporation
      100 Congress Ave, Suite 2000, Austin, TX 78701
      INVOICE #VCC-2026-4401
      Issue Date: October 14, 2026
      Service Period: Oct 14, 2026 - Nov 13, 2026
      Description: Veloce GPU Accelerated Worker Tier 3
      Plan: Veloce GPU Worker Monthly
      Subtotal: $450.00
      Promotional Credit / Discount: -$50.00
      State Sales Tax (8.25%): $33.00
      Final Amount Paid: $433.00
      Payment Method: Paid with American Express ending in 8004
      Renews on: Nov 14, 2026
    `;

    // 1. Merchant
    const merchant = identifyMerchant(usDiscountInvoice, 'Veloce_Inv_4401.pdf');
    expect(merchant.merchantName.value).toBe('Veloce Compute');
    expect(merchant.serviceName.value).toContain('Veloce GPU Worker');

    // 2. Financials: Grand Total charged must be $433, not $450 subtotal or $50 discount
    const amount = extractTotalAmountAndCurrency(usDiscountInvoice, 'Veloce_Inv_4401.pdf', 'USD');
    expect(amount.currency.value).toBe('USD');
    expect(amount.totalAmount.value).toBe(433);
    expect(amount.subtotal.value).toBe(450);

    // 3. Payment Method
    const payment = extractPaymentMethod(usDiscountInvoice);
    expect(normalizePaymentMethod(payment.value)).toBe('Credit Card');
    expect(payment.value).toContain('8004');

    // 4. Renewal Date: Explicit
    const dates = extractDatesAndPeriod(usDiscountInvoice);
    expect(dates.billingFrequency.value).toBe('monthly');
    expect(dates.renewalDate.value).toBe('2026-11-14');
  });

  // =========================================================================
  // TEST 3: UNSEEN INDIAN B2B SAAS MERCHANT WITH CGST + SGST SPLIT
  // =========================================================================
  it('correctly accumulates split CGST & SGST and extracts authentic merchant without hardcoding', () => {
    const indianB2BInvoice = `
      Billed By: BreatheHR Solutions Private Limited
      Registered Office: Indiranagar, Bengaluru, Karnataka 560038
      GSTIN: 29AAACB9021Q1ZS
      Tax Invoice # BHR-OCT-9902
      Date of Invoice: 18-Oct-2026
      Customer: Apex Global Corp
      Subscription Plan: BreatheHR Core Suite (Up to 50 Employees)
      Total Taxable: ₹3,000.00
      CGST 9%: ₹270.00
      SGST 9%: ₹270.00
      Total Invoice Value: ₹3,540.00
      Payment Rail: UPI AutoPay (breathehr@hdfcbank)
    `;

    // 1. Merchant
    const merchant = identifyMerchant(indianB2BInvoice, 'BHR_Tax_Invoice.pdf');
    expect(merchant.merchantName.value).toBe('BreatheHR Solutions');
    expect(merchant.serviceName.value).toContain('BreatheHR Core Suite');

    // 2. Financials
    const amount = extractTotalAmountAndCurrency(indianB2BInvoice, 'BHR_Tax_Invoice.pdf', 'INR');
    expect(amount.currency.value).toBe('INR');
    expect(amount.totalAmount.value).toBe(3540); // 3000 + 270 + 270
    expect(amount.subtotal.value).toBe(3000);
    expect(amount.taxAmount.value).toBe(540); // 270 + 270 accumulated

    // 3. Payment Method
    const payment = extractPaymentMethod(indianB2BInvoice);
    expect(normalizePaymentMethod(payment.value)).toBe('UPI');

    // 4. Invoice Number
    const invNum = extractInvoiceNumber(indianB2BInvoice);
    expect(invNum.value).toBe('BHR-OCT-9902');
  });

  // =========================================================================
  // TEST 4: INVOICE WITH MISSING PAYMENT METHOD (NEVER FABRICATE OR DEFAULT)
  // =========================================================================
  it('returns Unknown when invoice does NOT contain any payment instrument evidence', () => {
    const noPaymentInvoice = `
      Acme Document Storage Inc.
      1200 Pine Street, Seattle, WA
      Invoice #ACME-1029
      Date: 2026-10-05
      Plan: Enterprise Cloud Storage Monthly
      Total Amount Due: $120.00
      Terms: Net 30 Days
    `;

    const payment = extractPaymentMethod(noPaymentInvoice);
    expect(payment.value).toBeNull();
    expect(normalizePaymentMethod(payment.value)).toBe('Unknown');
  });

  // =========================================================================
  // TEST 5: INVOICE WITH MISSING BILLING CADENCE (NEVER ASSUME MONTHLY)
  // =========================================================================
  it('returns null / missing cadence when invoice does NOT specify frequency', () => {
    const oneOffInvoice = `
      DesignSpark Studio Ltd
      Invoice #DS-771
      Date: 2026-10-15
      Description: Custom Brand Vector Asset Pack
      Total: $350.00
    `;

    const dates = extractDatesAndPeriod(oneOffInvoice);
    expect(dates.billingFrequency.value).toBeNull();
    expect(dates.billingFrequency.status).toBe('missing');
  });

  // =========================================================================
  // TEST 6: STATUTORY TAX AUTHORITY BLOCKLIST
  // =========================================================================
  it('strictly rejects government statutory bodies and tax authorities as merchants', () => {
    expect(isValidMerchantName('Income Tax Department')).toBe(false);
    expect(isValidMerchantName('Income Tax Department.')).toBe(false);
    expect(isValidMerchantName('Central Board of Direct Taxes')).toBe(false);
    expect(isValidMerchantName('Ministry of Finance')).toBe(false);
    expect(isValidMerchantName('Government of India')).toBe(false);
    expect(isValidMerchantName('Department of Revenue')).toBe(false);
    expect(isValidMerchantName('Internal Revenue Service')).toBe(false);
    expect(isValidMerchantName('HM Revenue & Customs')).toBe(false);
  });
});
