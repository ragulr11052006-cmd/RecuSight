import { describe, it, expect, beforeEach } from 'vitest';
import { searchCatalog, findCatalogItem, POPULAR_SUBSCRIPTION_SERVICES } from '../lib/subscriptionCatalog';
import { db } from '../lib/supabase';
import { Subscription } from '../types';

describe('Manual Subscription & Autocomplete Catalog Tests', () => {
  beforeEach(() => {
    // Clear mock storage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('searches the subscription catalog accurately by name or alias', () => {
    // Search for Hotstar / Disney
    const hotstarResults = searchCatalog('hotstar');
    expect(hotstarResults.length).toBeGreaterThan(0);
    expect(hotstarResults[0].name).toBe('Disney+ Hotstar');
    expect(hotstarResults[0].category).toBe('Streaming & Ent');

    // Search for Prime / Amazon
    const primeResults = searchCatalog('prime');
    expect(primeResults.length).toBeGreaterThan(0);
    expect(primeResults[0].name).toBe('Amazon Prime');

    // Search for AWS
    const awsResults = searchCatalog('aws');
    expect(awsResults.length).toBeGreaterThan(0);
    expect(awsResults[0].name).toContain('AWS');

    // Search for LinkedIn
    const linkedInResults = searchCatalog('linkedin');
    expect(linkedInResults.length).toBeGreaterThan(0);
    expect(linkedInResults[0].name).toBe('LinkedIn Premium');

    // Search for Canva
    const canvaResults = searchCatalog('canva');
    expect(canvaResults.length).toBeGreaterThan(0);
    expect(canvaResults[0].name).toBe('Canva Pro');
  });

  it('finds exact catalog items', () => {
    const netflix = findCatalogItem('Netflix');
    expect(netflix).toBeDefined();
    expect(netflix?.category).toBe('Streaming & Ent');

    const figma = findCatalogItem('figma');
    expect(figma).toBeDefined();
    expect(figma?.category).toBe('Design');
  });

  it('reliably saves any custom app and retrieves it in the subscription tracker', async () => {
    const customAppName = 'My Custom AI Startup Tool';
    const newSub = await db.createSubscription({
      user_id: 'default-user',
      merchant_name: customAppName,
      category: 'Software & Tools',
      amount: 1499,
      currency: 'INR',
      billing_interval: 1,
      billing_interval_unit: 'months',
      next_billing_date: '2026-11-30',
      payment_mode_label: 'UPI AutoPay (Google Pay / PhonePe)',
      payment_mode_badge: 'UPI AutoPay: Active',
      status: 'active',
      confidence_status: 'verified',
      notes: 'Custom manual subscription test',
    });

    expect(newSub.id).toBeDefined();
    expect(newSub.merchant_name).toBe(customAppName);

    // Now retrieve subscriptions from tracker
    const allSubs = await db.getSubscriptions('default-user');
    expect(allSubs.length).toBeGreaterThan(0);

    const found = allSubs.find((s) => s.merchant_name === customAppName);
    expect(found).toBeDefined();
    expect(found?.amount).toBe(1499);
    expect(found?.currency).toBe('INR');
  });

  it('handles empty dates and sanitized fields gracefully when creating subscriptions', async () => {
    const subWithoutDate = await db.createSubscription({
      user_id: 'usr-hendry-sujon',
      merchant_name: 'Disney+ Hotstar',
      category: 'Streaming & Ent',
      amount: 899,
      currency: 'INR',
      billing_interval: 1,
      billing_interval_unit: 'years',
      next_billing_date: '',
      payment_mode_label: 'UPI AutoPay',
      payment_mode_badge: 'UPI AutoPay: Active',
      status: 'active',
      confidence_status: 'verified',
    });

    expect(subWithoutDate.id).toBeDefined();
    const subs = await db.getSubscriptions('usr-hendry-sujon');
    const matched = subs.find((s) => s.merchant_name === 'Disney+ Hotstar');
    expect(matched).toBeDefined();
    expect(matched?.amount).toBe(899);
  });

  it('correctly tracks and filters expired subscriptions by date and status', () => {
    const isSubscriptionExpired = (s: { status: string; trial_end_date?: string; next_billing_date?: string }): boolean => {
      if (s.status === 'cancelled' || s.status === 'expired') return true;
      const dateToCheck = s.status === 'trial' ? (s.trial_end_date || s.next_billing_date) : s.next_billing_date;
      if (dateToCheck) {
        const targetDate = new Date(dateToCheck).getTime();
        if (!isNaN(targetDate)) {
          const today = new Date().setHours(0, 0, 0, 0);
          if (targetDate < today) return true;
        }
      }
      return false;
    };

    const subs = [
      { id: '1', merchant_name: 'Adobe Creative Cloud', status: 'active', next_billing_date: '2026-11-04' },
      { id: '2', merchant_name: 'github', status: 'trial', next_billing_date: '2026-10-30' },
      { id: '3', merchant_name: 'Spotify', status: 'active', next_billing_date: '2026-11-29' },
      { id: '4', merchant_name: 'Old App', status: 'cancelled', next_billing_date: '2026-09-01' },
      { id: '5', merchant_name: 'Explicit Expired', status: 'expired', next_billing_date: '2026-11-01' },
    ];

    const expiredSubs = subs.filter(isSubscriptionExpired);
    expect(expiredSubs.length).toBe(3); // github (past trial), Old App (cancelled), Explicit Expired
    expect(expiredSubs.map((s) => s.merchant_name)).toEqual(['github', 'Old App', 'Explicit Expired']);

    const activeSubs = subs.filter((s) => s.status === 'active' && !isSubscriptionExpired(s));
    expect(activeSubs.length).toBe(2); // Adobe and Spotify
  });
});
