/**
 * Offline behaviour of the transfer balance sync.
 *
 * A transfer must complete on the device even with no connection: the balance
 * change is queued and replayed once the app is online again. These tests pin
 * that down, because a regression here means money appearing to move and then
 * silently reverting when the server is next reached.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal localStorage so the module can run outside a browser.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  get length() { return this.store.size; }
}

const storage = new MemoryStorage();
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('window', {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: storage,
});

const KEY = 'pendingBalanceSyncs';

async function loadModule() {
  return await import('./transferUtils');
}

describe('transfer balance sync while offline', () => {
  beforeEach(() => {
    storage.clear();
    vi.resetModules();
  });

  it('queues the new balance when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { syncBalanceToServer } = await loadModule();

    syncBalanceToServer('7', '379.50');
    await new Promise((r) => setTimeout(r, 0));

    const queued = JSON.parse(storage.getItem(KEY) || '[]');
    expect(queued).toHaveLength(1);
    expect(queued[0].accountId).toBe('7');
    expect(queued[0].balance).toBe('379.50');
  });

  it('keeps only the latest balance per account, not a growing pile', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { syncBalanceToServer } = await loadModule();

    syncBalanceToServer('7', '400.00');
    await new Promise((r) => setTimeout(r, 0));
    syncBalanceToServer('7', '250.00');
    await new Promise((r) => setTimeout(r, 0));

    const queued = JSON.parse(storage.getItem(KEY) || '[]');
    expect(queued).toHaveLength(1);
    expect(queued[0].balance).toBe('250.00');
  });

  it('exposes queued balances so the UI shows the offline figure, not the stale server one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { syncBalanceToServer, getPendingBalanceSyncs } = await loadModule();

    syncBalanceToServer('3', '99.99');
    await new Promise((r) => setTimeout(r, 0));

    expect(getPendingBalanceSyncs()).toEqual({ '3': '99.99' });
  });

  it('clears the queue once the balance reaches the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { syncBalanceToServer, flushPendingBalanceSyncs, getPendingBalanceSyncs } = await loadModule();

    syncBalanceToServer('7', '379.50');
    await new Promise((r) => setTimeout(r, 0));
    expect(getPendingBalanceSyncs()).toEqual({ '7': '379.50' });

    // Back online.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    flushPendingBalanceSyncs();
    await new Promise((r) => setTimeout(r, 0));

    expect(JSON.parse(storage.getItem(KEY) || '[]')).toHaveLength(0);
  });

  it('leaves the queue intact if the retry also fails, so nothing is lost', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { syncBalanceToServer, flushPendingBalanceSyncs, getPendingBalanceSyncs } = await loadModule();

    syncBalanceToServer('7', '379.50');
    await new Promise((r) => setTimeout(r, 0));

    flushPendingBalanceSyncs();
    await new Promise((r) => setTimeout(r, 0));

    expect(getPendingBalanceSyncs()).toEqual({ '7': '379.50' });
  });
});
