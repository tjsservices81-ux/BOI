// One-person login links (invite tokens).
//
// An invite is a single-use, expiring token tied to ONE existing customer.
// The admin generates it from the oversight dashboard; the person opens it on
// their phone to claim the account onto that device.
//
// Every call to createInvite mints a brand new token and discards any previous
// unclaimed link for that customer, so generating a link always produces a
// fresh one and only the newest works. Records are written to disk so a server
// restart (a redeploy, a sleeping container) does not invalidate links that
// have already been handed out — nor let a used one work again.

import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath } from './environment';

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
  private loaded = false;

  // Invites are written to disk because the server restarts often (a redeploy,
  // a sleeping container). Keeping them only in memory meant every restart
  // silently invalidated every link that had been handed out, and the person
  // opening it was told the link was not valid.
  private get filePath(): string {
    return dataFilePath('invites.json');
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (Array.isArray(raw)) {
        raw.forEach((rec: InviteRecord) => {
          if (rec && typeof rec.token === 'string') this.invites.set(rec.token, rec);
        });
      }
    } catch (error) {
      console.warn('Could not read stored invites, starting empty:', error);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.invites.values()), null, 2));
    } catch (error) {
      console.error('Could not save invites:', error);
    }
  }

  // Create a fresh single-use invite for a customer. Any previous UNCLAIMED
  // invite for the same customer is discarded so only the newest link works.
  createInvite(customerNumber: string, ttlMs: number = DEFAULT_TTL_MS): InviteRecord {
    this.load();
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
    this.save();
    return record;
  }

  // Look up an invite by token without consuming it. Returns a status string
  // the caller can turn into a friendly message.
  peek(token: string): { status: 'valid' | 'expired' | 'claimed' | 'unknown'; record?: InviteRecord } {
    this.load();
    const rec = this.invites.get(token);
    if (!rec) return { status: 'unknown' };
    if (rec.claimedAt) return { status: 'claimed', record: rec };
    if (Date.now() > rec.expiresAt) return { status: 'expired', record: rec };
    return { status: 'valid', record: rec };
  }

  // Consume an invite on successful claim. Returns the customerNumber if the
  // token was valid and now marked claimed, otherwise null.
  consume(token: string, deviceLabel: string): { ok: boolean; customerNumber?: string; reason?: string } {
    this.load();
    const rec = this.invites.get(token);
    if (!rec) return { ok: false, reason: 'unknown' };
    if (rec.claimedAt) return { ok: false, reason: 'claimed' };
    if (Date.now() > rec.expiresAt) return { ok: false, reason: 'expired' };

    rec.claimedAt = Date.now();
    rec.claimedByDevice = deviceLabel;
    // Persist immediately: without this a restart would forget the link had
    // been used and it would work a second time, which breaks single-use.
    this.save();
    return { ok: true, customerNumber: rec.customerNumber };
  }

  // All pending (unclaimed, unexpired) invites, newest first.
  getAllPending(): InviteRecord[] {
    this.load();
    this.pruneExpired();
    const now = Date.now();
    return Array.from(this.invites.values())
      .filter(rec => !rec.claimedAt && now <= rec.expiresAt)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Destroy every invite (pending or claimed) for a customer. Called when an
   * account is deleted so an outstanding link can never be used to claim an
   * account that no longer exists.
   */
  revokeForCustomer(customerNumber: string): number {
    this.load();
    let removed = 0;
    for (const [token, rec] of Array.from(this.invites)) {
      if (rec.customerNumber === customerNumber) {
        this.invites.delete(token);
        removed++;
      }
    }
    if (removed > 0) this.save();
    return removed;
  }

  // Current pending (unclaimed, unexpired) invite for a customer, if any.
  getPendingForCustomer(customerNumber: string): InviteRecord | null {
    this.load();
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
