// Database connection.
//
// Two drivers, chosen from the connection string:
//
//   • Neon (…neon.tech) uses @neondatabase/serverless, which talks over a
//     WebSocket — that is the only way to reach a Neon endpoint.
//   • Anything else (Render Postgres, a container, a local server) uses
//     node-postgres over a normal TCP connection.
//
// Picking the wrong one fails at connect time rather than at start-up: pointing
// the Neon driver at a standard Postgres makes it try a WebSocket to :443 and
// every query dies, which is what a host change would otherwise run into.

import * as schema from "@shared/schema";
import { databaseUrl, isProduction } from "./environment";

const connectionString = databaseUrl();

if (!connectionString) {
  throw new Error(
    isProduction()
      ? "DATABASE_URL must be set. Did you forget to provision a database?"
      : "No database configured. Set DEV_DATABASE_URL (preferred for development) or DATABASE_URL.",
  );
}

/** Neon must be reached with its own WebSocket driver. */
function isNeon(url: string): boolean {
  try {
    return /neon\.tech$/i.test(new URL(url).hostname);
  } catch {
    return /neon\.tech/i.test(url);
  }
}

let pool: any;
let db: any;

if (isNeon(connectionString)) {
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = (await import('ws')).default;
  neonConfig.webSocketConstructor = ws as any;
  pool = new Pool({ connectionString });
  db = drizzle({ client: pool, schema });
  console.log('🗄️  Database driver: Neon (WebSocket)');
} else {
  const pg = (await import('pg')).default;
  const { drizzle } = await import('drizzle-orm/node-postgres');
  pool = new pg.Pool({
    connectionString,
    // Managed Postgres (Render and friends) requires TLS but presents a
    // certificate the default settings reject.
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
  });
  db = drizzle(pool, { schema });
  console.log('🗄️  Database driver: node-postgres (TCP)');
}

export { pool, db };
