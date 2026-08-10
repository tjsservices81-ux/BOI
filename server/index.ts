// SECURITY: Twilio credentials MUST be loaded from environment variables only
// DO NOT hard-code secrets here - set them in Replit Secrets
// Required secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logEnvironmentBanner, databaseUrl } from "./environment";
import { panicModeMiddleware } from "./panicMode";
import { ensureDefaultAccessCode } from "./keyValueStore";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const app = express();

// Apply panic mode check only - IP whitelist disabled
app.use(panicModeMiddleware);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Configure persistent PostgreSQL session store - NO EXPIRY
const PgSession = connectPgSimple(session);
app.use(session({
  secret: process.env.SESSION_SECRET || 'banking-app-secret-key-for-dev',
  store: new PgSession({
    // Use the same database this environment is running against, so sessions
    // live beside their data. Reading DATABASE_URL directly here would send
    // development sessions to the production database (or fail outright when
    // only DEV_DATABASE_URL is set).
    conString: databaseUrl(),
    tableName: 'user_sessions',
    createTableIfMissing: true,
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year TTL for permanent sessions
    disableTouch: false, // Allow session refresh
    pruneSessionInterval: false, // Never auto-prune sessions
    errorLog: (...args: any[]) => console.error('Session store error:', ...args)
  }),
  resave: true, // FIXED: Always save sessions to prevent loss
  saveUninitialized: false, // Don't create sessions for unauthenticated users
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year - needed for cookie to persist
    sameSite: 'lax'
  },
  rolling: false // No rolling sessions to prevent timeout resets
}));

// Security headers to prevent sharing and protect content
app.use((req, res, next) => {
  // Prevent content from being embedded in frames
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  // Content Security Policy to prevent sharing and inspection (allow service worker)
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self' wss: https:; " +
    "frame-ancestors 'none'; " +
    "object-src 'none'; " +
    "media-src 'none'; " +
    "worker-src 'self'; " +
    "child-src 'none'; " +
    "form-action 'self';"
  );
  
  // Prevent caching of sensitive content
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Additional security headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Make it unmistakable which environment's data is in use.
  logEnvironmentBanner();

  // Without a database the app starts, then fails on every request with a stack
  // trace buried in the log. Say plainly what is missing and stop.
  if (!databaseUrl()) {
    console.error('❌ No database configured — the app cannot start.\n');
    console.error('   Set DATABASE_URL to a PostgreSQL connection string, e.g.');
    console.error('     postgresql://user:password@host:5432/dbname\n');
    console.error('   On Render: Dashboard → your service → Environment →');
    console.error('   Add Environment Variable → DATABASE_URL.');
    console.error('   Either paste the connection string this app already uses,');
    console.error('   which keeps every existing customer, or create a Render');
    console.error('   PostgreSQL instance and run "npm run db:push" against it');
    console.error('   once to create the tables (it will start out empty).\n');
    process.exit(1);
  }

  // The access code gates the whole app, so it has to exist before the first
  // request arrives on a host that has never run this app before.
  await ensureDefaultAccessCode();

  // Register API routes first
  const server = await registerRoutes(app);

  // Serve service worker with no-cache headers for immediate updates
  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.resolve(process.cwd(), 'sw.js'));
  });

  // Serve offline.html with no-cache headers
  app.get('/offline.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.resolve(process.cwd(), 'offline.html'));
  });

  // Serve static assets last to avoid conflicts with API routes
  app.use(express.static('.'));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Hosts such as Render assign the port through the environment; Replit uses
  // 5000. Binding the wrong one means the platform never sees the app come up.
  const port = Number(process.env.PORT) || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    // Only helpful on Replit, and unsupported on some platforms — so it is not
    // requested in production, where it could stop the server binding at all.
    ...(process.env.NODE_ENV === 'production' ? {} : { reusePort: true }),
  }, () => {
    log(`serving on port ${port}`);
  });
})();
