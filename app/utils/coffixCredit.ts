import { Transaction } from "@/app/dashboard/transactions/interface/transaction";

/**
 * Coffix credit reconciliation utilities.
 *
 * The user's stored coffix credit balance lives in `creditAvailable` on the user
 * document. Separately, every credit movement is recorded in the top-level
 * `transactions` collection. These helpers re-derive a user's balance purely from
 * their `paymentMethod === "coffixCredit"` transactions so the stored balance can
 * be reconciled against the transaction history.
 *
 * All amounts are treated as positive magnitudes; direction (add vs subtract) is
 * decided by transaction `type` via COFFIX_CREDIT_SIGN — so the math is robust
 * whether or not `amount` is already signed in the data.
 */

/**
 * Maps a transaction `type` to its effect on coffix credit:
 *   +1 → adds credit, -1 → subtracts credit, 0 (absent) → ignored.
 *
 * This is the single place to tune the add/subtract convention. Unknown / unlisted
 * types are intentionally IGNORED (treated as 0) rather than guessed, so an
 * unexpected type can never silently corrupt the accumulated total.
 *
 * Note: `gift` direction depends on whether the user sent or received it; that is
 * handled in signedCoffixAmount, not here.
 */
export const COFFIX_CREDIT_SIGN: Record<string, 1 | -1> = {
  // Adds credit
  topup: 1,
  refund: 1,
  referral: 1,
  credit: 1,
  // Subtracts credit
  order: -1,
  purchase: -1,
};

const EPSILON = 0.005; // half a cent — guards against float noise

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Signed contribution of a single transaction to `userId`'s coffix credit.
 * Returns 0 if the transaction's type is unknown or it doesn't affect this user.
 */
export function signedCoffixAmount(tx: Transaction, userId: string): number {
  const magnitude = Math.abs(tx.amount ?? 0);
  if (magnitude === 0) return 0;

  // Gift / transfer: direction depends on who the user is.
  if (tx.type === "gift") {
    if (tx.recipientCustomerId === userId) return magnitude; // received → +
    if (tx.customerId === userId) return -magnitude; // sent → -
    return 0;
  }

  const sign = COFFIX_CREDIT_SIGN[tx.type ?? ""];
  if (!sign) return 0; // unknown type → ignored
  return sign * magnitude;
}

/**
 * Sum of all coffix-credit transactions for `userId`, re-deriving the balance.
 * Only `paymentMethod === "coffixCredit"` transactions tied to the user (as
 * customer or gift recipient) are counted.
 */
export function accumulateCoffixCredit(
  transactions: Transaction[],
  userId: string
): number {
  let total = 0;
  for (const tx of transactions) {
    if (tx.paymentMethod !== "coffixCredit") continue;
    if (tx.customerId !== userId && tx.recipientCustomerId !== userId) continue;
    total += signedCoffixAmount(tx, userId);
  }
  return roundCents(total);
}

/**
 * Compares the stored balance against the transaction-derived total.
 * `matches` uses a half-cent epsilon to absorb floating-point noise.
 */
export function reconcileCoffixCredit(
  current: number,
  accumulated: number
): { matches: boolean; difference: number } {
  const difference = roundCents(current - accumulated);
  return { matches: Math.abs(difference) < EPSILON, difference };
}
