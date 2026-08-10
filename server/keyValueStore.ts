// Small key/value store used for access codes and revocation flags.
//
// A JSON file on disk, which is all this needs to be — a handful of keys read
// on the access-code path. It lives under DATA_DIR, so on a host with a mounted
// disk it survives redeploys.
//
// The store matters more than its size suggests: access codes gate the whole
// app, and a store that silently returned nothing would lock every user out.

import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath } from './environment';

export interface KeyValueStore {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

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

export const keyValueStore: KeyValueStore = new FileKeyValueStore();

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
