import { describe, it, expect } from 'vitest';
import { formatCurrency, getCurrencySymbol } from './currencyUtils';

// The formatter uses a non-breaking space between symbol and number in the
// en-IE locale, so we normalise whitespace before asserting.
const norm = (s: string) => s.replace(/ /g, ' ');

describe('getCurrencySymbol', () => {
  it('returns the euro symbol for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns the pound symbol for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('defaults to EUR', () => {
    expect(getCurrencySymbol()).toBe('€');
  });
});

describe('formatCurrency', () => {
  it('formats a number as euro with two decimals', () => {
    expect(norm(formatCurrency(4820.5, 'EUR'))).toBe('€4,820.50');
  });

  it('formats a numeric string as pounds', () => {
    expect(norm(formatCurrency('1234.5', 'GBP'))).toBe('£1,234.50');
  });

  it('always shows two decimal places', () => {
    expect(norm(formatCurrency(1000, 'EUR'))).toBe('€1,000.00');
  });

  it('handles zero', () => {
    expect(norm(formatCurrency(0, 'EUR'))).toBe('€0.00');
  });
});
