import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { databaseUrl, isProduction } from "./environment";

neonConfig.webSocketConstructor = ws;

// Development uses DEV_DATABASE_URL when it's set, so development and
// production never share a database. See server/environment.ts.
const connectionString = databaseUrl();

if (!connectionString) {
  throw new Error(
    isProduction()
      ? "DATABASE_URL must be set. Did you forget to provision a database?"
      : "No database configured. Set DEV_DATABASE_URL (preferred for development) or DATABASE_URL.",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
