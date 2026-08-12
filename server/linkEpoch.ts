// Per-customer link "epoch" and generation count.
//
// Generating a login link is meant to MOVE an account to that new link: the old
// phone should stop working immediately, exactly like deleting the customer
// logs them out — but without touching any of their data.
//
// Each customer has:
//   • epoch — a timestamp bumped every time a link is generated. A device
//     stamps the current epoch into its session when it claims a link; the
//     heartbeat logs out any device whose stamp is older than the current
//     epoch (i.e. any device from before the newest link). So each new link
//     logs out the previous one.
//   • count — how many links have ever been generated for this customer, shown
//     on the team pages.
//
// File-backed so it survives a restart (a redeploy, a sleeping container).

import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath } from './environment';

interface LinkRecord {
  epoch: number;
  count: number;
}

class LinkEpochStore {
  private records: Map<string, LinkRecord> = new Map();
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
          const v = raw[cn];
          if (typeof v === 'number') {
            // Legacy format: a bare epoch number.
            if (Number.isFinite(v)) this.records.set(cn, { epoch: v, count: v > 0 ? 1 : 0 });
          } else if (v && typeof v === 'object') {
            const epoch = Number(v.epoch) || 0;
            const count = Number(v.count) || 0;
            this.records.set(cn, { epoch, count });
          }
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
      const obj: Record<string, LinkRecord> = {};
      this.records.forEach((rec, cn) => { obj[cn] = rec; });
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Could not save link epochs:', error);
    }
  }

  /** The customer's current epoch (0 if none recorded yet). */
  get(customerNumber: string): number {
    this.load();
    return this.records.get(customerNumber)?.epoch || 0;
  }

  /** How many links have been generated for this customer. */
  getCount(customerNumber: string): number {
    this.load();
    return this.records.get(customerNumber)?.count || 0;
  }

  /**
   * Bump to now and count one more generation. Every device that claimed an
   * earlier link is now superseded. Monotonic — never goes backwards even if
   * two calls land in the same millisecond. Returns the new count.
   */
  bump(customerNumber: string): number {
    this.load();
    const prev = this.records.get(customerNumber);
    const epoch = Math.max(Date.now(), (prev?.epoch || 0) + 1);
    const count = (prev?.count || 0) + 1;
    this.records.set(customerNumber, { epoch, count });
    this.save();
    return count;
  }

  /** Forget a customer (used when their account is permanently erased). */
  clear(customerNumber: string): void {
    this.load();
    if (this.records.delete(customerNumber)) this.save();
  }
}

export const linkEpoch = new LinkEpochStore();
