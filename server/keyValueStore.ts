// Small key/value store used for access codes and revocation flags.
//
// On Replit this is backed by the Replit Database. Anywhere else (Render, a
// plain container, a local run) there is no Replit Database, and the client
// throws the moment it is constructed — which crashed the server on boot with
// "expected dbUrl, got undefined" and exited with status 1.
//
// So the Replit client is only used when REPLIT_DB_URL is actually present.
// Otherwise we fall back to a JSON file with the same tiny async interface.
// The fallback matters: access codes gate the whole app, so a store that
// silently returned nothing would lock every user out.

import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath } from './environment';

export interface KeyValueStore {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

/** JSON-file store used when there is no Replit Database. */
class FileKeyValueStore implements KeyValueStore {
  private data: Record<string, any> | null = null;

  private get filePath(): string {
    return dataFilePath('keyValue.json');
  }

  private load(): Record<string, any> {
    if (this.data) return this.data;
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) || {};
      } else {
        this.data = {};
      }
    } catch (error) {
      console.warn('Could not read key/value store, starting empty:', error);
      this.data = {};
    }
    return this.data!;
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data ?? {}, null, 2));
    } catch (error) {
      console.error('Could not save key/value store:', error);
    }
  }

  async get(key: string): Promise<any> {
    const store = this.load();
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  }

  async set(key: string, value: any): Promise<void> {
    const store = this.load();
    store[key] = value;
    this.persist();
  }
}

/** Wraps the Replit client so its return shape matches the file store. */
class ReplitKeyValueStore implements KeyValueStore {
  constructor(private client: any) {}

  async get(key: string): Promise<any> {
    const result = await this.client.get(key);
    // Newer @replit/database versions answer with { ok, value }.
    if (result && typeof result === 'object' && 'ok' in result) {
      return (result as any).ok ? (result as any).value : null;
    }
    return result ?? null;
  }

  async set(key: string, value: any): Promise<void> {
    await this.client.set(key, value);
  }
}

function build(): KeyValueStore {
  if (process.env.REPLIT_DB_URL) {
    try {
      // Required lazily so the package is never constructed off-Replit.
      const Database = require('@replit/database');
      const ctor = Database?.default || Database;
      console.log('🗝️  Key/value store: Replit Database');
      return new ReplitKeyValueStore(new ctor());
    } catch (error) {
      console.warn('Replit Database unavailable, using the file store instead:', error);
    }
  }
  console.log('🗝️  Key/value store: local file (no Replit Database on this host)');
  return new FileKeyValueStore();
}

export const keyValueStore: KeyValueStore = build();

/** The code that opens the app: /?access=<code> */
export function defaultAccessCode(): string {
  return process.env.APP_ACCESS_CODE || 'BOI777777';
}

/**
 * Make sure the app's access code exists in the store.
 *
 * The gate in client/index.html sends anyone whose code is not found straight
 * to google.com. On a brand new host the store starts empty, so without this
 * every person opening the link would be bounced — the app would look dead.
 *
 * Only writes when the key is missing, so a code that has been revoked
 * (valid: false) or has usage recorded against it is left exactly as it is.
 */
export async function ensureDefaultAccessCode(): Promise<void> {
  const code = defaultAccessCode();
  const key = `access_code_${code}`;
  try {
    const existing = await keyValueStore.get(key);
    if (existing) return;

    // Both usage shapes the routes read: /api/verify-code uses
    // usageCount/deviceLimits/totalUsage, /api/check-access uses usage.
    await keyValueStore.set(
      key,
      JSON.stringify({
        code,
        valid: true,
        used: false,
        createdAt: new Date().toISOString(),
        usageCount: { ios: 0, android: 0, other: 0 },
        deviceLimits: { ios: 2, android: 1, other: 1 },
        totalUsage: 0,
        usage: { ios: 0, nonIos: 0, totalUses: 0, devices: [] },
      }),
    );
    console.log(`🔑 Seeded access code ${code} (none was stored on this host)`);
  } catch (error) {
    console.error('Could not seed the default access code:', error);
  }
}
