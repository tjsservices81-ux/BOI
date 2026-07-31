// Persistent record of which accounts belong to the Team Admin page.
//
// Membership is decided ONCE, when the account is created with the customer
// name "admincustomer". After that it is sticky: the account stays on the team
// page even if the person later changes their name in Personal Details. That's
// why this is a stored registry rather than a live name check.
//
// Deliberately file-backed (not a new database column) so it needs no schema
// migration — adding a column that the live database doesn't have yet would
// break every customer query and take the whole app down.

import * as fs from 'fs';
import * as path from 'path';

class TeamAccountRegistry {
  private numbers: Set<string> = new Set();
  private filePath: string;
  private loaded = false;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'teamAccounts.json');
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach((n) => { if (typeof n === 'string') this.numbers.add(n); });
        }
      }
    } catch (error) {
      console.warn('Could not read team account registry, starting empty:', error);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.numbers), null, 2));
    } catch (error) {
      console.error('Could not save team account registry:', error);
    }
  }

  /** Mark an account as belonging to the team page. Idempotent. */
  add(customerNumber: string): void {
    if (!customerNumber) return;
    this.load();
    if (this.numbers.has(customerNumber)) return;
    this.numbers.add(customerNumber);
    this.save();
  }

  has(customerNumber: string): boolean {
    this.load();
    return this.numbers.has(customerNumber);
  }

  remove(customerNumber: string): void {
    this.load();
    if (this.numbers.delete(customerNumber)) this.save();
  }

  all(): string[] {
    this.load();
    return Array.from(this.numbers);
  }
}

export const teamAccountRegistry = new TeamAccountRegistry();
