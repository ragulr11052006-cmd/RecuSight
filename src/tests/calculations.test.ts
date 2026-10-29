import { describe, it, expect } from 'vitest';
import { Subscription } from '../types';

describe('RecurSight Subscription Calculations', () => {
  const calculateMonthlyAmount = (sub: Partial<Subscription>): number => {
    const amt = Number(sub.amount) || 0;
    const interval = sub.billing_interval || 1;
    switch (sub.billing_interval_unit) {
      case 'years':
        return amt / (12 * interval);
      case 'weeks':
        return (amt * 52) / (12 * interval);
      case 'days':
        return (amt * 30.4) / interval;
      case 'months':
      default:
        return amt / interval;
    }
  };

  it('correctly calculates monthly recurring spend for monthly subscriptions', () => {
    const sub: Partial<Subscription> = {
      amount: 15.00,
      billing_interval: 1,
      billing_interval_unit: 'months',
    };
    expect(calculateMonthlyAmount(sub)).toBe(15.00);
  });

  it('correctly normalizes annual billing to monthly amount', () => {
    const sub: Partial<Subscription> = {
      amount: 120.00,
      billing_interval: 1,
      billing_interval_unit: 'years',
    };
    expect(calculateMonthlyAmount(sub)).toBe(10.00);
  });

  it('correctly normalizes weekly billing to monthly equivalent', () => {
    const sub: Partial<Subscription> = {
      amount: 10.00,
      billing_interval: 1,
      billing_interval_unit: 'weeks',
    };
    // (10 * 52) / 12 = 43.333...
    expect(calculateMonthlyAmount(sub)).toBeCloseTo(43.33, 1);
  });

  it('detects duplicates safely based on merchant name', () => {
    const existingSubs: Partial<Subscription>[] = [
      { merchant_name: 'Adobe Creative Cloud', amount: 54.99 },
      { merchant_name: 'Netflix Premium', amount: 19.99 },
    ];

    const isDuplicate = (name: string) => {
      const normalized = name.toLowerCase();
      return existingSubs.some(s => 
        s.merchant_name?.toLowerCase().includes(normalized) ||
        normalized.includes(s.merchant_name?.toLowerCase() || '')
      );
    };

    expect(isDuplicate('Adobe Creative Cloud')).toBe(true);
    expect(isDuplicate('Adobe')).toBe(true);
    expect(isDuplicate('Figma Organization')).toBe(false);
  });

  it('filters subscriptions by status and category properly', () => {
    const subs: Partial<Subscription>[] = [
      { id: '1', merchant_name: 'Figma', category: 'Design', status: 'trial' },
      { id: '2', merchant_name: 'Netflix', category: 'Entertainment', status: 'active' },
      { id: '3', merchant_name: 'Claude', category: 'AI Assist', status: 'active' },
      { id: '4', merchant_name: 'FastSpring', category: 'Software & Tools', status: 'needs_review' },
    ];

    const activeSubs = subs.filter(s => s.status === 'active');
    expect(activeSubs.length).toBe(2);

    const designSubs = subs.filter(s => s.category === 'Design');
    expect(designSubs.length).toBe(1);
    expect(designSubs[0].merchant_name).toBe('Figma');
  });

  it('correctly calculates pagination boundaries and slices items per page', () => {
    const totalItems = 14;
    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    expect(totalPages).toBe(2);

    // Page 1 calculation
    const page1Start = (1 - 1) * pageSize;
    const page1End = Math.min(page1Start + pageSize, totalItems);
    expect(page1Start + 1).toBe(1);
    expect(page1End).toBe(8);

    // Page 2 calculation
    const page2Start = (2 - 1) * pageSize;
    const page2End = Math.min(page2Start + pageSize, totalItems);
    expect(page2Start + 1).toBe(9);
    expect(page2End).toBe(14);
  });
});
