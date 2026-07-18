// Canonical money math shared by the server and the client so a balance is
// always adjusted the same way in both places. Kept dependency-free and pure
// (no I/O, no globals) so it is trivially unit-testable — this is the exact
// logic that caused the "balance hop" bug, so it is worth pinning down.

export type TransactionType = 'credit' | 'debit';

// The signed amount a transaction originally applied to its account balance.
// A credit adds money (+), a debit removes money (-). When `type` is omitted
// (client transactions store a signed amount string like "-250.00"), the sign
// of the amount is used instead.
export function signedTransactionDelta(
  amount: string | number,
  type?: TransactionType
): number {
  const magnitude = Math.abs(parseFloat(String(amount)));
  if (!Number.isFinite(magnitude)) return 0;
  const isDebit = type ? type === 'debit' : String(amount).trim().startsWith('-');
  return isDebit ? -magnitude : magnitude;
}

// The account balance after a transaction is removed: undo the effect the
// transaction originally had (subtract the signed delta it applied). Returns a
// fixed 2-decimal string, matching how balances are stored.
export function balanceAfterReversal(
  currentBalance: string | number,
  amount: string | number,
  type?: TransactionType
): string {
  const balance = parseFloat(String(currentBalance));
  const safeBalance = Number.isFinite(balance) ? balance : 0;
  return (safeBalance - signedTransactionDelta(amount, type)).toFixed(2);
}
