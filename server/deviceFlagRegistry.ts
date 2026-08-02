// Tracks which devices each account has been used on, and flags any account
// seen on more than one.
//
// This only ever FLAGS — it never blocks a login or ends a session. Deleting
// the account is the only thing that signs anyone out.
//
// Devices are identified by the persistent id the client keeps in local storage
// (app_device_id), which survives app restarts and updates on the same phone.
// If that id isn't available we fall back to a coarse fingerprint so a second
// device is still noticed.
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

    // Prefer the client's persistent device id; fall back to a coarse
    // fingerprint so a missing id still distinguishes obvious second devices.
    const key = (device.deviceId && device.deviceId.trim())
      || `ua:${(device.model || 'unknown')}|${(device.userAgent || '').slice(0, 60)}`;

    const now = new Date().toISOString();
    const rec: DeviceRecord = this.records.get(customerNumber) || { devices: [] };
    const existing = rec.devices.find((d) => d.key === key);

    if (existing) {
      existing.lastSeen = now;
      if (device.ipAddress) existing.ipAddress = device.ipAddress;
      this.records.set(customerNumber, rec);
      this.save();
      return { deviceCount: rec.devices.length, newlyFlagged: false };
    }

    rec.devices.push({
      key,
      model: device.model || 'Unknown device',
      ipAddress: device.ipAddress || '',
      firstSeen: now,
      lastSeen: now,
    });

    const wasFlagged = !!rec.flaggedAt;
    const nowFlagged = rec.devices.length > 1;
    if (nowFlagged && !wasFlagged) rec.flaggedAt = now;

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
