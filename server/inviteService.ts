// One-person login links (invite tokens).
//
// An invite is a single-use, expiring token tied to ONE existing customer.
// The admin generates it from the oversight dashboard; the person opens it on
// their phone to claim the account onto that device. Kept in memory (like the
// OTC service) — pending invites are short-lived, so a server restart simply
// means the admin regenerates the link. Nothing here changes existing auth.

import crypto from 'crypto';

export interface InviteRecord {
  token: string;
  customerNumber: string;
  createdAt: number;
  expiresAt: number;
  claimedAt: number | null;
  claimedByDevice: string | null;
}

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

class InviteService {
  private invites: Map<string, InviteRecord> = new Map(); // token -> record

  // Create a fresh single-use invite for a customer. Any previous UNCLAIMED
  // invite for the same customer is discarded so only the newest link works.
  createInvite(customerNumber: string, ttlMs: number = DEFAULT_TTL_MS): InviteRecord {
    for (const [token, rec] of this.invites) {
      if (rec.customerNumber === customerNumber && !rec.claimedAt) {
        this.invites.delete(token);
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const record: InviteRecord = {
      token,
      customerNumber,
      createdAt: now,
      expiresAt: now + ttlMs,
      claimedAt: null,
      claimedByDevice: null,
    };
    this.invites.set(token, record);
    this.pruneExpired();
    return record;
  }

  // Look up an invite by token without consuming it. Returns a status string
  // the caller can turn into a friendly message.
  peek(token: string): { status: 'valid' | 'expired' | 'claimed' | 'unknown'; record?: InviteRecord } {
    const rec = this.invites.get(token);
    if (!rec) return { status: 'unknown' };
    if (rec.claimedAt) return { status: 'claimed', record: rec };
    if (Date.now() > rec.expiresAt) return { status: 'expired', record: rec };
    return { status: 'valid', record: rec };
  }

  // Consume an invite on successful claim. Returns the customerNumber if the
  // token was valid and now marked claimed, otherwise null.
  consume(token: string, deviceLabel: string): { ok: boolean; customerNumber?: string; reason?: string } {
    const rec = this.invites.get(token);
    if (!rec) return { ok: false, reason: 'unknown' };
    if (rec.claimedAt) return { ok: false, reason: 'claimed' };
    if (Date.now() > rec.expiresAt) return { ok: false, reason: 'expired' };

    rec.claimedAt = Date.now();
    rec.claimedByDevice = deviceLabel;
    return { ok: true, customerNumber: rec.customerNumber };
  }

  // Current pending (unclaimed, unexpired) invite for a customer, if any.
  getPendingForCustomer(customerNumber: string): InviteRecord | null {
    this.pruneExpired();
    for (const rec of this.invites.values()) {
      if (rec.customerNumber === customerNumber && !rec.claimedAt && Date.now() <= rec.expiresAt) {
        return rec;
      }
    }
    return null;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [token, rec] of this.invites) {
      // Keep claimed records briefly so a double-open shows "already used"
      // rather than "unknown"; drop long-expired ones.
      if (now > rec.expiresAt + 24 * 60 * 60 * 1000) {
        this.invites.delete(token);
      }
    }
  }
}

export const inviteService = new InviteService();
