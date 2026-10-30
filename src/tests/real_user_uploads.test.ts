import { describe, it, expect } from 'vitest';
import {
  identifyMerchant,
  extractTotalAmountAndCurrency,
  extractPaymentMethod,
  extractDatesAndPeriod,
} from '../lib/invoiceExtractor';

describe('Real User Uploads Regression Suite', () => {
  it('accurately extracts Netflix mobile invoice screenshot without Gmail misidentification', () => {
    const netflixText = `
4390m +H - Gmerd448
<
Netflix Entertainment Services India LLP.
Level 11, Godrej BKC
Plot C68, G Block, BKC - Bandra (East)
Mumbai 400051
Maharashtra, India
Tax number. 27AANFNO3STIIZN
yashwanthchandran@gmail.com
Invoice No. C66E0-7E041-FC924-AADE2
Date 12/08/26
Description Streaming Service
Service Period 04/10/26-03/11/26
Amount 2168.64
1GST (18%) 230.36
Total 2199
SUBTOTAL 2168.64
TAX TOTAL 230.36
TOTAL 2199
Payment Method: i=» y+++@okhdfcbank
Payment Date: 8/12/26, 12:29 AM
Reference ID: DHDIRBB1Y3J337
Place of Supply: Tamil Nadu
HSN Code: 998439
< Oo 101
    `;

    const merchant = identifyMerchant(netflixText, 'screenshot.jpg');
    expect(merchant.merchantName.value).toBe('Netflix');
    expect(merchant.merchantName.value).not.toBe('Gmail'); // NEVER GMAIL

    const amount = extractTotalAmountAndCurrency(netflixText, 'screenshot.jpg', 'INR');
    expect(amount.totalAmount.value).toBe(199); // ₹199 (disambiguated from OCR ₹ -> 2199)
    expect(amount.currency.value).toBe('INR');
    expect(amount.subtotal.value).toBe(168.64);
    expect(amount.taxAmount.value).toBe(30.36);

    const payment = extractPaymentMethod(netflixText);
    expect(payment.value).toBe('UPI AutoPay (y•••@okhdfcbank)');

    const dates = extractDatesAndPeriod(netflixText);
    expect(dates.renewalDate.value).toBe('2026-11-03');
  });

  it('accurately extracts LinkedIn purchases mobile screenshot', () => {
    const linkedInText = `
438+ @OM Tme 448
x Linkedin ) ) <<
& https://www.linkedin.com/man...

Linked] = oe ©

Purchases

Active Expired

Premium Career @ Active

Annual subscription (auto-renews)

5,074.58/year + applicable taxes

Oct 20,2026 - Nov 20,2026
    `;

    const merchant = identifyMerchant(linkedInText, 'screenshot2.jpg');
    expect(merchant.merchantName.value).toBe('LinkedIn');

    const amount = extractTotalAmountAndCurrency(linkedInText, 'screenshot2.jpg', 'INR');
    expect(amount.totalAmount.value).toBe(5074.58);
    expect(amount.currency.value).toBe('INR');

    const dates = extractDatesAndPeriod(linkedInText);
    expect(dates.billingFrequency.value).toBe('yearly');
    expect(dates.renewalDate.value).toBe('2026-11-20');
  });

  it('accurately extracts Disney+ Hotstar active plan screenshot', () => {
    const hotstarText = `
414ME OM Ome r448
X
Super 1 Year
Plan expires on 15 Feb, 2027
Mobile 3 Months
Plan expires in 5 days
+919894348848 © Update
Registered Mobile Number
This Device
© Motorola Phone
By fee (fs
Other Devices
Android Phone/ Tablet
Q Last used : 4 Days Ago Lota
Android Tv
Ele Leo ut
< ©) iol
    `;

    const merchant = identifyMerchant(hotstarText, 'screenshot1.jpg');
    expect(merchant.merchantName.value).toBe('Disney+ Hotstar');

    const dates = extractDatesAndPeriod(hotstarText);
    expect(dates.billingFrequency.value).toBe('yearly');
    expect(dates.renewalDate.value).toBe('2027-02-15');
  });

  it('accurately extracts Netflix web print invoice where TAX TOTAL ₹30.36 appears before TOTAL ₹199', () => {
    const webPrintInvoice = `
      NETFLIX
      Netflix Entertainment Services India LLP.
      Level 11, Godrej BKC
      Plot C-68, G Block, BKC - Bandra (East)
      Mumbai 400051
      Maharashtra, India
      Tax number: 27AANFN9351J1ZN

      yashwanthchandran@gmail.com

      Invoice No. C66E0-7E041-FC924-AADE2

      Date        Description        Service Period     Amount    IGST %   IGST     Total
      12/08/26    Streaming Service  04/10/26-03/11/26  ₹168.64   18%      ₹30.36   ₹199

                                                        SUBTOTAL  ₹168.64
                                                        TAX TOTAL ₹30.36
                                                        TOTAL     ₹199

      Payment Method: UPI y...*@okhdfcbank
      Payment Date: 8/12/26, 12:29 AM
      Reference ID: DHD9RBB1Y3J337
    `;

    const merchant = identifyMerchant(webPrintInvoice, 'netflix_invoice.pdf');
    expect(merchant.merchantName.value).toBe('Netflix');

    const amount = extractTotalAmountAndCurrency(webPrintInvoice, 'netflix_invoice.pdf', 'INR');
    // MUST BE 199, NEVER 30.36 OR 3036 (Tax total)
    expect(amount.totalAmount.value).toBe(199);
    expect(amount.subtotal.value).toBe(168.64);
    expect(amount.taxAmount.value).toBe(30.36);
    expect(amount.currency.value).toBe('INR');

    const payment = extractPaymentMethod(webPrintInvoice);
    expect(payment.value).toContain('UPI AutoPay');
    expect(payment.value).toContain('okhdfcbank');
  });

  it('correctly handles multi-amount summary row and rejects generic Recipient Details header', () => {
    const gstInvoiceText = `
      TAX INVOICE
      Acme Cloud Technologies Pvt Ltd
      Plot 42, Tech Park, Whitefield, Bangalore 560066
      GSTIN: 29AABCA1234F1Z5
      
      Details of Receiver (Billed To):
      Details Recipient Details
      Ragul R
      Chennai, Tamil Nadu
      GSTIN: 33AAAAA0000A1Z5

      Invoice No: ACME-2026-8812
      Invoice Date: 30/10/2026

      Item Description           HSN/SAC    Taxable Value    IGST 18%    Total
      Cloud Hosting Standard     998313     4,067.80         732.20      4,800.00

      Total 4,067.80 73220 INR 4,800.00
    `;

    const merchant = identifyMerchant(gstInvoiceText, 'Screenshot 2026-10-30.png');
    // Authentic merchant extracted from corporate header
    expect(merchant.merchantName.value).toBe('Acme Cloud Technologies');
    expect(merchant.merchantName.value).not.toContain('Details');
    expect(merchant.merchantName.value).not.toContain('Recipient');

    const amount = extractTotalAmountAndCurrency(gstInvoiceText, 'Screenshot 2026-10-30.png', 'INR');
    // Must be final payable gross total 4800, NOT taxable net amount 4067.80!
    expect(amount.totalAmount.value).toBe(4800);
    expect(amount.subtotal.value).toBe(4067.80);
    expect(amount.taxAmount.value).toBe(732.20);
    expect(amount.currency.value).toBe('INR');
  });

  it('marks merchant as missing when document only contains generic recipient labels without vendor', () => {
    const invoiceWithoutVendor = `
      TAX INVOICE
      Invoice No: INV-9901
      Date: 28/10/2026

      Details Recipient Details
      Customer Name: John Doe
      Billing Information: Flat 101, Residency

      Total 4,067.80 73220 INR 4,800.00
    `;

    const merchant = identifyMerchant(invoiceWithoutVendor, 'Screenshot 2026-10-30.png');
    // Must be null, NEVER 'Details Recipient Details'!
    expect(merchant.merchantName.value).toBeNull();
    expect(merchant.merchantName.confidence).toBe(0);

    const amount = extractTotalAmountAndCurrency(invoiceWithoutVendor, 'Screenshot 2026-10-30.png', 'INR');
    expect(amount.totalAmount.value).toBe(4800);
    expect(amount.currency.value).toBe('INR');
  });

  it('correctly extracts universal SaaS invoice without relying on known brand list', () => {
    const unknownSaasInvoice = `
      INVOICE
      Zenith Vector Labs Inc.
      100 Market St, San Francisco, CA
      support@zenithvector.com
      https://www.zenithvector.ai

      Bill To: Alex Developer
      Invoice Date: October 25, 2026
      
      Plan: Vector Search Enterprise API
      
      Subtotal: $250.00
      Tax: $20.00
      Total: $270.00
    `;

    const merchant = identifyMerchant(unknownSaasInvoice, 'invoice.pdf');
    expect(merchant.merchantName.value).toBe('Zenith Vector Labs');

    const amount = extractTotalAmountAndCurrency(unknownSaasInvoice, 'invoice.pdf', 'USD');
    expect(amount.totalAmount.value).toBe(270);
    expect(amount.subtotal.value).toBe(250);
    expect(amount.taxAmount.value).toBe(20);
    expect(amount.currency.value).toBe('USD');
  });
});
