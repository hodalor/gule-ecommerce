export const DEFAULT_CURRENCY = 'ZMW';
export const DEFAULT_LOCALE = 'en-ZM';

export function formatCurrency(amount, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE, options = {}) {
  const value = typeof amount === 'number' ? amount : Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  } catch (_e) {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatNumber(amount, locale = DEFAULT_LOCALE, options = {}) {
  const value = typeof amount === 'number' ? amount : Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (_e) {
    return String(value);
  }
}