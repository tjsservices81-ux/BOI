import { describe, it, expect } from 'vitest';
import { signedTransactionDelta, balanceAfterReversal } from './balanceMath';

describe('signedTransactionDelta', () => {
  it('treats a credit as adding money', () => {
    expect(signedTransactionDelta('250.00', 'credit')).toBe(250);
  });

  it('treats a debit as removing money', () => {
    expect(signedTransactionDelta('250.00', 'debit')).toBe(-250);
  });

  it('infers a debit from a negative signed amount when no type is given', () => {
    expect(signedTransactionDelta('-63.47')).toBe(-63.47);
  });

  it('infers a credit from a positive amount when no type is given', () => {
    expect(signedTransactionDelta('2900.00')).toBe(2900);
  });

  it('returns 0 for a non-numeric amount', () => {
    expect(signedTransactionDelta('not-a-number')).toBe(0);
  });
});

describe('balanceAfterReversal', () => {
  it('deleting a debit adds the amount back to the balance', () => {
    // Balance 4820.50, remove a 250 debit -> 5070.50
    expect(balanceAfterReversal('4820.50', '250.00', 'debit')).toBe('5070.50');
  });

  it('deleting a credit subtracts the amount from the balance', () => {
    // Balance 4820.50, remove a 2900 credit -> 1920.50
    expect(balanceAfterReversal('4820.50', '2900.00', 'credit')).toBe('1920.50');
  });

  it('matches the client convention: a negative signed amount is a debit', () => {
    // Client stores debits as "-250.00" and passes no explicit type
    expect(balanceAfterReversal('4820.50', '-250.00')).toBe('5070.50');
  });

  it('matches the client convention: a positive amount is a credit', () => {
    expect(balanceAfterReversal('4820.50', '2900.00')).toBe('1920.50');
  });

  it('accepts numeric inputs and always returns 2 decimals', () => {
    expect(balanceAfterReversal(100, 0.1, 'debit')).toBe('100.10');
  });

  it('can produce a negative balance (does not clamp)', () => {
    expect(balanceAfterReversal('100.00', '250.00', 'credit')).toBe('-150.00');
  });

  it('treats a missing/invalid current balance as zero', () => {
    expect(balanceAfterReversal('', '250.00', 'debit')).toBe('250.00');
  });
});
