// Set Twilio environment variables first
process.env.TWILIO_ACCOUNT_SID = 'ACfb6104431dc681bd562257cad773c58d';
process.env.TWILIO_AUTH_TOKEN = 'ff7bc789a8898b95f9968cb3a6ac1a89';
process.env.TWILIO_PHONE_NUMBER = '+14379803631';

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { panicModeMiddleware } from "./panicMode";
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
    conString: process.env.DATABASE_URL,
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
  
  // Content Security Policy to prevent sharing and inspection
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
    "worker-src 'none'; " +
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
  // Register API routes first
  const server = await registerRoutes(app);

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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
