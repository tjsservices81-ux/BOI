// Per-customer "link epoch".
//
// Generating a login link is meant to MOVE an account to that new link: the
// old phone should stop working immediately, exactly like deleting the customer
// logs them out — but without touching any of their data.
//
// Each customer has an epoch (a timestamp). Generating a link bumps it. When a
// device claims a link, the current epoch is stamped into that device's session.
// The heartbeat then logs out any device whose stamped epoch is older than the
// customer's current one — i.e. any device from before the newest link.
//
// File-backed so it survives a restart (a redeploy, a sleeping container);
// otherwise a restart would forget which devices had been superseded.

import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath } from './environment';

class LinkEpochStore {
  private epochs: Map<string, number> = new Map();
  private loaded = false;

  private get filePath(): string {
    return dataFilePath('linkEpoch.json');
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (raw && typeof raw === 'object') {
        Object.keys(raw).forEach((cn) => {
          const v = Number(raw[cn]);
          if (Number.isFinite(v)) this.epochs.set(cn, v);
        });
      }
    } catch (error) {
      console.warn('Could not read link epochs:', error);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj: Record<string, number> = {};
      this.epochs.forEach((v, cn) => { obj[cn] = v; });
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Could not save link epochs:', error);
    }
  }

  /** The customer's current epoch (0 if none recorded yet). */
  get(customerNumber: string): number {
    this.load();
    return this.epochs.get(customerNumber) || 0;
  }

  /**
   * Bump to now and return the new value. Called when a link is generated, so
   * every device that claimed an earlier link is now considered superseded.
   * Monotonic — never goes backwards even if two calls land in the same ms.
   */
  bump(customerNumber: string): number {
    this.load();
    const next = Math.max(Date.now(), this.get(customerNumber) + 1);
    this.epochs.set(customerNumber, next);
    this.save();
    return next;
  }

  /** Forget a customer (used when their account is permanently erased). */
  clear(customerNumber: string): void {
    this.load();
    if (this.epochs.delete(customerNumber)) this.save();
  }
}

export const linkEpoch = new LinkEpochStore();
