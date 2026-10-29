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
