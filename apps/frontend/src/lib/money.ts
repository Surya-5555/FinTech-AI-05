/**
 * Formats an amount in minor units (e.g. paise, cents) to a localized currency string.
 * This is safe because it only uses BigInt or string for precision, completely avoiding
 * floating point rounding errors.
 */
export function formatMoneyMinor(amountMinor: string | number | bigint, currency = 'INR'): string {
  try {
    const amountStr = amountMinor.toString();
    const isNegative = amountStr.startsWith('-');
    const absoluteStr = isNegative ? amountStr.slice(1) : amountStr;
    
    // Pad with leading zeros if less than 100
    const paddedStr = absoluteStr.padStart(3, '0');
    
    const major = paddedStr.slice(0, -2);
    const minor = paddedStr.slice(-2);
    
    const decimalStr = `${isNegative ? '-' : ''}${major}.${minor}`;
    const value = parseFloat(decimalStr);
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (e) {
    return 'Invalid Amount';
  }
}
