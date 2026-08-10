// Development / production separation.
//
// The two environments must never share data: creating or deleting a test
// account while developing must not touch a real customer. Everything that
// persists is therefore scoped by environment:
//
//   • Database  — development uses DEV_DATABASE_URL when it is set, so the two
//                 point at different Postgres databases. (see server/db.ts)
//   • JSON      — data/storage.json (production) vs data/storage.dev.json
//   • Registry  — data/teamAccounts.json vs data/teamAccounts.dev.json
//
// Anything held only in memory (invite links, one-time codes, sessions) is
// already per-process and so separate by definition.

import * as path from 'path';

/** True when running the built app (npm run start / a deployment). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function environmentName(): string {
  return isProduction() ? 'production' : 'development';
}

/**
 * Where the JSON data files live.
 *
 * Defaults to ./data next to the app. Hosts whose filesystem is wiped on every
 * deploy (Render, most containers) can point DATA_DIR at a mounted persistent
 * disk instead — e.g. DATA_DIR=/var/data — and invites, team registrations and
 * the storage snapshot then survive a redeploy.
 */
export function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

/**
 * Path to a data file for the CURRENT environment. Development files get a
 * ".dev" suffix so the two environments can never read or write each other's.
 */
export function dataFilePath(baseName: string): string {
  const dir = dataDir();
  if (isProduction()) return path.join(dir, baseName);
  const dot = baseName.lastIndexOf('.');
  const devName = dot === -1
    ? `${baseName}.dev`
    : `${baseName.slice(0, dot)}.dev${baseName.slice(dot)}`;
  return path.join(dir, devName);
}

/**
 * Which database URL this environment should use. Development prefers
 * DEV_DATABASE_URL so it can point at a throwaway database; if that isn't set
 * it falls back to DATABASE_URL (shared, and warned about loudly at startup).
 */
export function databaseUrl(): string | undefined {
  if (!isProduction() && process.env.DEV_DATABASE_URL) {
    return process.env.DEV_DATABASE_URL;
  }
  return process.env.DATABASE_URL;
}

/**
 * A safe, human-readable label for the database currently in use — host and
 * database name only. Never includes the username or password, so it's safe to
 * show in the admin UI. Two environments showing different fingerprints are
 * reading different databases, which is why their customer counts can differ.
 */
export function databaseFingerprint(): string {
  const url = databaseUrl();
  if (!url) return 'none configured';
  try {
    const u = new URL(url);
    const dbName = (u.pathname || '').replace(/^\//, '') || 'default';
    const host = u.hostname || 'unknown-host';
    // Shorten long managed-host names so the badge stays readable.
    const shortHost = host.length > 34 ? `${host.slice(0, 31)}…` : host;
    return `${shortHost}/${dbName}`;
  } catch {
    return 'unrecognised URL';
  }
}

/** True when development is falling back to the production database. */
export function isSharingProductionDatabase(): boolean {
  return !isProduction() && !process.env.DEV_DATABASE_URL && !!process.env.DATABASE_URL;
}

/** One clear line at startup so it's never a mystery which data is in use. */
export function logEnvironmentBanner(): void {
  console.log(`\n🌍 Environment: ${environmentName().toUpperCase()}`);
  if (isProduction()) {
    console.log('   Database: DATABASE_URL   Data file: data/storage.json');
  } else if (process.env.DEV_DATABASE_URL) {
    console.log('   Database: DEV_DATABASE_URL (separate from production)');
    console.log('   Data file: data/storage.dev.json');
  } else {
    console.log('   ⚠️  DEV_DATABASE_URL is not set — development is using the');
    console.log('      PRODUCTION database. Anything you delete here is deleted');
    console.log('      for real. Set DEV_DATABASE_URL to keep them separate.');
    console.log('   Data file: data/storage.dev.json');
  }
  console.log('');
}
