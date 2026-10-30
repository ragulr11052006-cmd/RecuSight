import { describe, it, expect } from 'vitest';
import {
  convertCurrency,
  extractTransactionsFromText,
  extractRenewalDateFromText,
  extractPaymentSourceFromText,
  extractMerchantNameFromText,
  advanceDateString,
  parseAnyDateString,
  EXCHANGE_RATES,
} from '../lib/ocrParser';
import { CURRENCY_SYMBOLS, Currency } from '../types';

describe('Currency Conversion & Symbols', () => {
  it('correctly provides symbol for all 4 supported currencies', () => {
    expect(CURRENCY_SYMBOLS.USD).toBe('$');
    expect(CURRENCY_SYMBOLS.INR).toBe('₹');
    expect(CURRENCY_SYMBOLS.EUR).toBe('€');
    expect(CURRENCY_SYMBOLS.GBP).toBe('£');
  });

  it('converts amounts between currencies accurately', () => {
    // USD -> INR
    const inrVal = convertCurrency(100, 'USD', 'INR');
    expect(inrVal).toBe(8650);

    // INR -> USD
    const usdVal = convertCurrency(8650, 'INR', 'USD');
    expect(usdVal).toBeCloseTo(100.34, 0);

    // USD -> EUR
    const eurVal = convertCurrency(100, 'USD', 'EUR');
    expect(eurVal).toBe(92);

    // USD -> GBP
    const gbpVal = convertCurrency(100, 'USD', 'GBP');
    expect(gbpVal).toBe(79);

    // Same currency returns exact amount
    expect(convertCurrency(29.0, 'USD', 'USD')).toBe(29.0);
    expect(convertCurrency(649, 'INR', 'INR')).toBe(649);
  });
});

describe('OCR & Heuristic Amount Extraction', () => {
  it('extracts INR amount from labeled text', () => {
    const text = 'HDFC Credit Card Statement\nTotal Amount Due: ₹1,499.00\nPayment Due Date: Nov 15, 2026';
    const result = extractTransactionsFromText(text, 'Statement.pdf');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].currency).toBe('INR');
    expect(result[0].amount).toBe(1499);
    expect(result[0].detectedAmounts).toContain(1499);
  });

  it('extracts USD amount and identifies Netflix subscription', () => {
    const text = 'Netflix.com streaming plan\nMonthly subscription: $19.99\nBilled to card';
    const result = extractTransactionsFromText(text, 'Netflix_Invoice.png');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].merchantName).toContain('Netflix');
    expect(result[0].amount).toBe(19.99);
    expect(result[0].currency).toBe('USD');
  });

  it('extracts amount from filename when text has no amount', () => {
    const text = 'Receipt for services rendered';
    const result = extractTransactionsFromText(text, 'Spotify_119_INR.png');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].amount).toBe(119);
    expect(result[0].currency).toBe('INR');
  });

  it('filters out calendar years like 2026 and 2025 from detected amounts', () => {
    const text = 'Invoice Date: Oct 29, 2026. Due Date: Nov 28, 2026. Charged: $29.00';
    const result = extractTransactionsFromText(text, 'bill_2026.pdf');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].amount).toBe(29);
    expect(result[0].detectedAmounts).not.toContain(2026);
  });

  it('captures all detected amounts for interactive pill autofill', () => {
    const text = 'Subtotal: $25.00\nTax: $4.00\nTotal Amount: $29.00';
    const result = extractTransactionsFromText(text, 'invoice.pdf');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].detectedAmounts?.length).toBeGreaterThanOrEqual(1);
    expect(result[0].detectedAmounts).toContain(29);
  });

  it('extracts exact renewal date from explicit Next Billing Date label', () => {
    const text = 'Figma Subscription Receipt\nTotal: $15.00\nNext Billing Date: Nov 15, 2026';
    const result = extractTransactionsFromText(text, 'Figma_Invoice.pdf');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].renewalDate).toBe('2026-11-15');
    expect(result[0].date).toBe('2026-11-15');
  });

  it('extracts renewal date from Renews On with full month name', () => {
    const text = 'Netflix Monthly Subscription\nTotal Paid: $19.99\nRenews on: 28 November 2026';
    const result = extractTransactionsFromText(text, 'Netflix_Bill.pdf');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].renewalDate).toBe('2026-11-28');
  });

  it('extracts renewal date from Indian format DD/MM/YYYY in INR invoice', () => {
    const text = 'HDFC Mandate Notification\nTotal Amount: ₹1499.00\nNext Renewal Date: 18/11/2026';
    const date = extractRenewalDateFromText(text, 'monthly', true);
    expect(date).toBe('2026-11-18');
  });

  it('extracts renewal date from Billing Period range end date', () => {
    const text = 'Adobe Creative Cloud\nBilling Period: Oct 10, 2026 - Nov 10, 2026\nGrand Total: $54.99';
    const date = extractRenewalDateFromText(text, 'monthly', false);
    expect(date).toBe('2026-11-10');
  });

  it('forward-projects next renewal date by 1 month when only invoice date is given', () => {
    const text = 'Google Cloud Invoice\nInvoice Date: Oct 15, 2026\nTotal Amount: $42.10';
    const date = extractRenewalDateFromText(text, 'monthly', false);
    expect(date).toBe('2026-11-15');
  });

  it('advances dates cleanly without timezone or month rollover errors', () => {
    expect(advanceDateString('2026-10-15', 'monthly')).toBe('2026-11-15');
    expect(advanceDateString('2026-10-31', 'monthly')).toBe('2026-11-30');
    expect(advanceDateString('2026-12-15', 'monthly')).toBe('2027-01-15');
    expect(advanceDateString('2026-10-15', 'yearly')).toBe('2027-10-15');
  });

  it('extracts Payment Source Account accurately from invoice text', () => {
    // 1. Bank + Card
    const text1 = 'Invoice #10293\nPaid with HDFC Bank Visa ending in 4090\nTotal: ₹1,499.00';
    expect(extractPaymentSourceFromText(text1, 'INR')).toBe('HDFC Visa •••• 4090');

    // 2. Card Brand + Last 4
    const text2 = 'Payment Method: Mastercard ending in 8891\nAmount Paid: $20.00';
    expect(extractPaymentSourceFromText(text2, 'USD')).toBe('Mastercard •••• 8891');

    // 3. UPI AutoPay ID
    const text3 = 'Subscription Auto-Debit\nUPI ID: rahul.sharma@okhdfcbank\nAmount: ₹649.00';
    expect(extractPaymentSourceFromText(text3, 'INR')).toBe('UPI AutoPay (rahul.sharma@okhdfcbank)');

    // 4. Google Pay UPI
    const text4 = 'Paid via Google Pay UPI AutoPay\nTotal: ₹299.00';
    expect(extractPaymentSourceFromText(text4, 'INR')).toBe('UPI AutoPay (Google Pay)');
  });

  it('extracts Merchant Name dynamically for unknown / custom vendors', () => {
    const text1 = 'INVOICE\nBilled By: Acme Analytics Inc\nInvoice Date: Oct 20, 2026\nGrand Total: $49.00';
    const m1 = extractMerchantNameFromText(text1, 'invoice.pdf');
    expect(m1.name).toContain('Acme Analytics');

    const text2 = 'Receipt from CloudStack Hosting LLC\nTotal Charged: $12.00\nPayment Due: Nov 20, 2026';
    const m2 = extractMerchantNameFromText(text2, 'receipt.pdf');
    expect(m2.name).toContain('CloudStack Hosting');
  });

  it('extracts all 4 essential fields: observed charge, renewal date, payment source, merchant name', () => {
    const invoiceText = `
      INVOICE #INV-2026-9921
      Billed By: Cursor AI Pro
      Invoice Date: Oct 25, 2026
      Next Billing Date: Nov 25, 2026
      Subtotal: $20.00
      Tax: $0.00
      Total Amount Paid: $20.00
      Payment Method: HDFC Bank Visa ending in 4092
    `;

    const [cand] = extractTransactionsFromText(invoiceText, 'Cursor_Invoice.pdf', 'USD');
    expect(cand).toBeDefined();
    // 1. Merchant Name
    expect(cand.merchantName).toBe('Cursor AI Pro');
    // 2. Observed Charge
    expect(cand.amount).toBe(20.0);
    expect(cand.currency).toBe('USD');
    // 3. Projected Renewal Date
    expect(cand.renewalDate).toBe('2026-11-25');
    // 4. Payment Source Account
    expect(cand.paymentSource).toBe('HDFC Visa •••• 4092');
  });
});
