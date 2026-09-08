// Tracks which devices each account has been used on, and flags any account
// seen on more than one.
//
// This only ever FLAGS — it never blocks a login or ends a session. Deleting
// the account is the only thing that signs anyone out.
//
// Devices are identified ONLY by the persistent id the client keeps in local
// storage (app_device_id), sent on every heartbeat/login. It survives restarts,
// updates and IP changes and is unique per phone/browser. IP addresses are NOT
// used to identify a device — behind the hosting proxy/carrier NAT many phones
// share one IP, which made IP-based detection both miss real second devices and
// invent false ones. IP is retained only as a "last seen from" display detail.
// If no device id is sent on a beat, nothing is recorded (no coarse fallback),
// so a missing id can never create a phantom device.
//
// File-backed and environment-scoped (data/deviceFlags.json, .dev.json in
// development) so it needs no database migration.

import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath } from './environment';

export interface KnownDevice {
  key: string;
  model: string;
  ipAddress: string;
  firstSeen: string;
  lastSeen: string;
}

export interface DeviceRecord {
  devices: KnownDevice[];
  flaggedAt?: string;
}

class DeviceFlagRegistry {
  private records: Map<string, DeviceRecord> = new Map();
  private filePath: string;
  private loaded = false;

  constructor() {
    this.filePath = dataFilePath('deviceFlags.json');
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (raw && typeof raw === 'object') {
        Object.keys(raw).forEach((num) => {
          const rec = raw[num];
          if (rec && Array.isArray(rec.devices)) this.records.set(num, rec);
        });
      }
    } catch (error) {
      console.warn('Could not read device flag registry:', error);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj: Record<string, DeviceRecord> = {};
      this.records.forEach((rec, num) => { obj[num] = rec; });
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Could not save device flag registry:', error);
    }
  }

  /**
   * Record a login. Returns true when this is a device we haven't seen for this
   * account before AND it takes them past one device (i.e. newly flagged).
   */
  recordLogin(
    customerNumber: string,
    device: { deviceId?: string; model?: string; ipAddress?: string; userAgent?: string },
  ): { deviceCount: number; newlyFlagged: boolean } {
    this.load();
    if (!customerNumber) return { deviceCount: 0, newlyFlagged: false };

    const now = new Date().toISOString();
    const rec: DeviceRecord = this.records.get(customerNumber) || { devices: [] };
    const wasFlagged = !!rec.flaggedAt;

    const model = device.model || 'Unknown device';
    const ip = (device.ipAddress || '').trim();
    const id = (device.deviceId && device.deviceId.trim()) || '';

    // IDENTITY = the persistent per-device id the browser keeps in localStorage
    // (app_device_id). It survives restarts, updates and IP changes, and is
    // unique per phone/browser — which is exactly what "is this account being
    // used on more than one device" needs. IP is NOT used to identify a device:
    // behind the hosting proxy/carrier NAT many phones share one IP (they all
    // looked like 127.0.0.1), so IP-based matching both merged different phones
    // and split one phone across WiFi/cellular. IP is kept only as a display
    // detail (last seen from).
    //
    // Purge any legacy IP-based fallback entries (their key was "model|ip").
    // Real device ids never contain "|", so this drops old artifacts without
    // touching genuine per-device records.
    rec.devices = rec.devices.filter((d) => !d.key.includes('|'));

    if (!id) {
      // No reliable identifier on this beat — never invent a device from IP/UA,
      // that's what caused false flags. Just reconcile the flag with what we have.
      const count = rec.devices.length;
      const flagged = count > 1;
      if (flagged && !wasFlagged) rec.flaggedAt = now;
      if (!flagged && wasFlagged) delete rec.flaggedAt;
      this.records.set(customerNumber, rec);
      this.save();
      return { deviceCount: count, newlyFlagged: false };
    }

    const existing = rec.devices.find((d) => d.key === id);
    if (existing) {
      existing.lastSeen = now;
      existing.model = model;        // refresh the human-readable label
      if (ip) existing.ipAddress = ip; // last-seen IP, informational only
    } else {
      rec.devices.push({ key: id, model, ipAddress: ip, firstSeen: now, lastSeen: now });
    }

    // Safety de-dup: one entry per device id.
    const byId = new Map<string, KnownDevice>();
    for (const d of rec.devices) {
      const seen = byId.get(d.key);
      if (!seen) { byId.set(d.key, d); continue; }
      if (new Date(d.firstSeen) < new Date(seen.firstSeen)) seen.firstSeen = d.firstSeen;
      if (new Date(d.lastSeen) > new Date(seen.lastSeen)) seen.lastSeen = d.lastSeen;
    }
    rec.devices = Array.from(byId.values());

    const nowFlagged = rec.devices.length > 1;
    if (nowFlagged && !wasFlagged) rec.flaggedAt = now;
    // If purging legacy artifacts brought a wrongly-flagged account back to a
    // single real device, drop the stale flag so it stops showing as flagged.
    if (!nowFlagged && wasFlagged) delete rec.flaggedAt;

    this.records.set(customerNumber, rec);
    this.save();

    return { deviceCount: rec.devices.length, newlyFlagged: nowFlagged && !wasFlagged };
  }

  get(customerNumber: string): DeviceRecord | null {
    this.load();
    return this.records.get(customerNumber) || null;
  }

  /** Summary for the admin list: how many devices, and whether flagged. */
  summary(customerNumber: string): { deviceCount: number; flagged: boolean; flaggedAt?: string; devices: KnownDevice[] } {
    const rec = this.get(customerNumber);
    if (!rec) return { deviceCount: 0, flagged: false, devices: [] };
    return {
      deviceCount: rec.devices.length,
      flagged: rec.devices.length > 1,
      flaggedAt: rec.flaggedAt,
      devices: rec.devices,
    };
  }

  /** Clear an account's device history (used when the account is deleted, and
   *  by the admin "reset" action after confirming a legitimate new phone). */
  reset(customerNumber: string): void {
    this.load();
    if (this.records.delete(customerNumber)) this.save();
  }
}

export const deviceFlagRegistry = new DeviceFlagRegistry();
