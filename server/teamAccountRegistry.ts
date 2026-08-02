// Persistent record of which Team Admin page each account belongs to.
//
// Membership is decided ONCE, when the account is created under a team name
// (admincustomer, admincustomer1, …). After that it is sticky: the account
// stays on that same page even if the person later changes their name in
// Personal Details. That's why this is a stored registry rather than a live
// name check.
//
// Deliberately file-backed (not a new database column) so it needs no schema
// migration — adding a column that the live database doesn't have yet would
// break every customer query and take the whole app down.

import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath } from './environment';

class TeamAccountRegistry {
  /** customerNumber -> page slug (e.g. "team-admin3") */
  private entries: Map<string, string> = new Map();
  private filePath: string;
  private loaded = false;

  constructor() {
    // Development uses data/teamAccounts.dev.json — kept apart from production.
    this.filePath = dataFilePath('teamAccounts.json');
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (Array.isArray(raw)) {
        // Legacy format: a plain list of numbers, all from the original page.
        raw.forEach((n) => { if (typeof n === 'string') this.entries.set(n, 'team-admin'); });
      } else if (raw && typeof raw === 'object') {
        Object.keys(raw).forEach((k) => {
          const v = raw[k];
          if (typeof v === 'string') this.entries.set(k, v);
        });
      }
    } catch (error) {
      console.warn('Could not read team account registry, starting empty:', error);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj: Record<string, string> = {};
      this.entries.forEach((slug, num) => { obj[num] = slug; });
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Could not save team account registry:', error);
    }
  }

  /** Bind an account to a team page. Idempotent. */
  add(customerNumber: string, slug: string): void {
    if (!customerNumber || !slug) return;
    this.load();
    if (this.entries.get(customerNumber) === slug) return;
    this.entries.set(customerNumber, slug);
    this.save();
  }

  /** Which page this account belongs to, or null if it isn't a team account. */
  slugFor(customerNumber: string): string | null {
    this.load();
    return this.entries.get(customerNumber) || null;
  }

  /** True when the account belongs to any team page. */
  has(customerNumber: string): boolean {
    return this.slugFor(customerNumber) !== null;
  }

  remove(customerNumber: string): void {
    this.load();
    if (this.entries.delete(customerNumber)) this.save();
  }
}

export const teamAccountRegistry = new TeamAccountRegistry();
