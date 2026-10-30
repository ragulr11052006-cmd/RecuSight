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
});
