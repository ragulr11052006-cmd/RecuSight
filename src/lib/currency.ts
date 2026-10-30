import { Currency, CURRENCY_SYMBOLS } from '../types';
import { convertCurrency, EXCHANGE_RATES } from './ocrParser';

export { convertCurrency, EXCHANGE_RATES, CURRENCY_SYMBOLS };

/**
 * Format any currency value according to the user's preferred currency.
 * Automatically converts if fromCurrency !== preferredCurrency.
 */
export function formatCurrencyAmount(
  amount: number,
  preferredCurrency: Currency = 'USD',
  fromCurrency: Currency = 'USD',
  options?: {
    decimals?: number;
    showSymbol?: boolean;
    compact?: boolean;
  }
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${CURRENCY_SYMBOLS[preferredCurrency] || '$'}0.00`;
  }

  const converted = convertCurrency(amount, fromCurrency, preferredCurrency);
  const symbol = options?.showSymbol !== false ? (CURRENCY_SYMBOLS[preferredCurrency] || '$') : '';
  
  // Decide decimal places: default to 2, or 0 if whole number in INR
  let maxDecimals = options?.decimals !== undefined 
    ? options.decimals 
    : (preferredCurrency === 'INR' && converted >= 100 && Number.isInteger(converted) ? 0 : 2);

  const formatted = new Intl.NumberFormat(preferredCurrency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(converted);

  return `${symbol}${formatted}`;
}

/**
 * Hook-friendly helper returning format function bound to user currency
 */
export function getCurrencyFormatter(preferredCurrency: Currency = 'USD') {
  return (amount: number, fromCurrency: Currency = 'USD', decimals?: number) => {
    return formatCurrencyAmount(amount, preferredCurrency, fromCurrency, { decimals });
  };
}

/**
 * Accurately normalize any subscription amount into its true monthly commitment
 * based on billing unit (e.g. yearly plans / 12, weekly plans * 52 / 12)
 */
export function calculateNormalizedMonthly(
  amount: number,
  unit?: string,
  interval: number = 1
): number {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  const safeInterval = interval && interval > 0 ? interval : 1;
  const cleanUnit = (unit || 'months').toLowerCase();

  if (cleanUnit.startsWith('year') || cleanUnit === 'annually' || cleanUnit === 'annual') {
    return amount / (12 * safeInterval);
  }
  if (cleanUnit === 'quarterly' || cleanUnit.startsWith('quarter')) {
    return amount / (3 * safeInterval);
  }
  if (cleanUnit.startsWith('week')) {
    return (amount * 52) / (12 * safeInterval);
  }
  if (cleanUnit.startsWith('day')) {
    return (amount * 30.41) / safeInterval;
  }
  // Default: monthly
  return amount / safeInterval;
}

/**
 * Accurately calculate annual run rate from monthly equivalent
 */
export function calculateNormalizedAnnual(
  amount: number,
  unit?: string,
  interval: number = 1
): number {
  return calculateNormalizedMonthly(amount, unit, interval) * 12;
}
