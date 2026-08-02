import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { renderAdminLoginPage, renderAdminDashboardPage } from "./adminOversightPage";
import {
  renderTeamAdminLoginPage,
  renderTeamAdminDashboardPage,
  isTeamCustomerName,
  getTeamAdminPin,
  findTeamPageForName,
  TEAM_PAGES,
  type TeamPageConfig,
} from "./teamAdminPage";
import { teamAccountRegistry } from "./teamAccountRegistry";
import { inviteService } from "./inviteService";
import { loginSchema, transferSchema, type InsertUser } from "@shared/schema";
import { z } from "zod";
import { otcService } from "./otcService";
import { transferSecurityService } from "./security/transferSecurity";
import { isDeviceBlocked, addDeviceSession, isDeviceInPanicMode, isCustomerInPanicMode } from "./deviceSessions";
import { isAccountActiveOnOtherDevice, setUserDeviceSession, removeUserDeviceSession, getUserDeviceSession, isCurrentDeviceAuthorized } from "./deviceExclusiveAuth";
import { addUserSession, removeUserSession, sessionTrackingMiddleware, isSessionValid } from "./sessionManager";
import { sendTransferConfirmation, sendBankStatement, type TransferConfirmationDetails } from "./emailService";
import { generateTransferConfirmationPDF } from "./pdfService";
import { StatementService } from "./statementService";
import { generateAIChatReply, isAIChatEnabled } from "./aiChatService";
import Database from "@replit/database";

// ============================================================================
// TRANSFER RELIABILITY SYSTEM - Ensures transfers always complete
// ============================================================================

// Retry helper with exponential backoff for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxAttempts?: number; baseDelay?: number; operationName?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 100, operationName = 'operation' } = options;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ ${operationName} attempt ${attempt}/${maxAttempts} failed:`, error);
      
      if (attempt < maxAttempts) {
        // Exponential backoff with jitter: 100ms, 200ms, 400ms, etc.
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 50;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Idempotency key tracking to prevent duplicate transfers
const processedTransferKeys = new Map<string, { result: any; timestamp: number }>();
const IDEMPOTENCY_TTL = 30 * 1000; // 30 seconds - short to prevent stuck transfers

// Generate idempotency key from STABLE request values only
// If client provides an idempotencyToken, use it; otherwise hash stable request values
// No time bucket - the same request values will always get the same key
function generateIdempotencyKey(userId: number, accountId: number, amount: string, toAccount: string, clientToken?: string): string {
  if (clientToken) {
    // Client-supplied token (most reliable)
    return `transfer:client:${clientToken}`;
  }
  // Fallback: hash of stable values (catches accidental double-submits)
  return `transfer:${userId}:${accountId}:${amount}:${toAccount}`;
}

function checkIdempotency(key: string): { isDuplicate: boolean; previousResult?: any } {
  const existing = processedTransferKeys.get(key);
  if (existing && Date.now() - existing.timestamp < IDEMPOTENCY_TTL) {
    console.log(`🔒 Duplicate transfer detected, returning cached result for key: ${key}`);
    return { isDuplicate: true, previousResult: existing.result };
  }
  return { isDuplicate: false };
}

// Mark transfer as in-progress (prevents concurrent duplicate processing)
function markTransferInProgress(key: string): boolean {
  const existing = processedTransferKeys.get(key);
  if (existing) {
    // Check if entry is still valid (not expired)
    if (Date.now() - existing.timestamp < IDEMPOTENCY_TTL) {
      // Still valid - block as duplicate or in-progress
      return false;
    }
    // Entry expired - delete it and allow new transfer
    processedTransferKeys.delete(key);
  }
  // Mark as in-progress with null result
  processedTransferKeys.set(key, { result: null, timestamp: Date.now() });
  return true;
}

function recordTransfer(key: string, result: any): void {
  processedTransferKeys.set(key, { result, timestamp: Date.now() });
  
  // Cleanup old entries every 100 recordings
  if (processedTransferKeys.size % 100 === 0) {
    const now = Date.now();
    const keysToDelete: string[] = [];
    processedTransferKeys.forEach((v, k) => {
      if (now - v.timestamp > IDEMPOTENCY_TTL) {
        keysToDelete.push(k);
      }
    });
    keysToDelete.forEach(k => processedTransferKeys.delete(k));
  }
}

function clearTransferInProgress(key: string): void {
  const existing = processedTransferKeys.get(key);
  if (existing && existing.result === null) {
    processedTransferKeys.delete(key);
  }
}

// ============================================================================

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    user?: { id: number; name: string; email: string; customerNumber: string };
    userId?: number;
    customerNumber?: string;
    adminAuthenticated?: boolean;
    deviceSessionId?: string;
    lastHeartbeat?: string;
  }
}

// Initialize Replit Database for access codes
const db = new Database();

export async function registerRoutes(app: Express): Promise<Server> {
  // Wait for storage to fully initialize from persistent data
  await storage.waitForInitialization();
  
  // Check for existing users
  const existingUsers = await storage.getAllUsers();
  console.log(`Found ${existingUsers.length} existing users in database`);

  // Dynamic manifest.json endpoint that includes access code in start_url
  app.get("/manifest.json", (req, res) => {
    // Multiple methods to detect access code for maximum compatibility
    let accessCode = null;
    
    // Method 1: Direct query parameter (most reliable)
    accessCode = req.query.access as string;
    
    // Method 2: Parse from referer header
    if (!accessCode) {
      const referer = req.get('Referer') || '';
      if (referer.includes('?access=')) {
        const urlParams = new URLSearchParams(referer.split('?')[1] || '');
        accessCode = urlParams.get('access');
      }
    }
    
    // Method 3: Parse from X-Access-Code header (for programmatic requests)
    if (!accessCode) {
      accessCode = req.get('X-Access-Code') as string;
    }

    // Invite links: when Add to Home Screen happens on /invite/<token> (iOS),
    // the icon must relaunch INTO the invite so the claim runs inside the
    // installed app's own storage box — a session made in Safari never reaches
    // it. Detected via ?invite= (set by index.html) or the Referer path.
    let inviteToken = (req.query.invite as string) || null;
    if (!inviteToken) {
      const referer = req.get('Referer') || '';
      const m = referer.match(/\/invite\/([A-Za-z0-9]+)/);
      if (m) inviteToken = m[1];
    }
    if (inviteToken && !/^[A-Za-z0-9]+$/.test(inviteToken)) inviteToken = null;

    // Generate start_url: invite takes priority, then access code
    const startUrl = inviteToken ? `/invite/${inviteToken}`
      : accessCode ? `/?access=${accessCode}` : '/';

    // Log for debugging
    console.log(`Manifest requested - Access code: ${accessCode || 'none'}, Invite: ${inviteToken ? 'yes' : 'no'}, Start URL: ${startUrl}`);
    
    const manifest = {
      "name": "BOI Mobile",
      "short_name": "BOI Mobile", 
      "description": "BOI Mobile Banking Application",
      "start_url": startUrl,
      "display": "standalone",
      "orientation": "portrait-primary",
      "theme_color": "#126987",
      "background_color": "#126987",
      "scope": "/",
      "lang": "en-IE",
      "icons": [
        {
          "src": "/boi_app_icon.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any maskable"
        },
        {
          "src": "/boi_app_icon.png", 
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any maskable"
        }
      ],
      "categories": ["finance", "banking"],
      "prefer_related_applications": false,
      "shortcuts": [
        {
          "name": "Make Transfer",
          "short_name": "Transfer",
          "description": "Send money quickly",
          "url": accessCode ? `/uk-transfer?access=${accessCode}` : "/uk-transfer",
          "icons": [{ "src": "/boi_app_icon.png", "sizes": "96x96" }]
        },
        {
          "name": "View Accounts", 
          "short_name": "Accounts",
          "description": "Check your balances",
          "url": accessCode ? `/dashboard?access=${accessCode}` : "/dashboard",
          "icons": [{ "src": "/boi_app_icon.png", "sizes": "96x96" }]
        }
      ]
    };
    
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(manifest);
  });

  // Health check endpoint for connectivity testing
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "Bank of Ireland API"
    });
  });

  // Helper function to process blacklist data
  const processBlacklist = (data: any): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.value && Array.isArray(data.value)) return data.value;
    return [];
  };

  // Direct revocation check endpoint for PWA apps
  app.post("/api/check-revocation", async (req, res) => {
    try {
      const { accessCode } = req.body;
      
      if (!accessCode) {
        return res.status(400).json({ error: "Access code required" });
      }
      
      // Check if this access code has been revoked or blacklisted
      
      const revokedFlag: any = await db.get(`revoked_${accessCode}`);
      const forceLogoutFlag: any = await db.get(`force_logout_${accessCode}`);
      const blacklistData = await db.get('permanent_blacklist');
      const pwaBlacklistData = await db.get('pwa_blacklist');
      const blacklist = processBlacklist(blacklistData);
      const pwaBlacklist = processBlacklist(pwaBlacklistData);
      const accessCodes: any = await db.get('access_codes') || {};
      const codeInfo: any = accessCodes[accessCode];
      
      const isRevoked = revokedFlag?.revoked || 
                       revokedFlag?.nuked || 
                       forceLogoutFlag?.forced ||
                       blacklist.includes(accessCode) ||
                       pwaBlacklist.includes(accessCode) ||
                       codeInfo?.revoked || 
                       codeInfo?.forceDisconnect;
      
      if (isRevoked) {
        console.log(`🔴 NUCLEAR REVOCATION CHECK: ${accessCode} is PERMANENTLY REVOKED`);
        return res.status(403).json({ 
          revoked: true,
          nuked: true,
          message: "Access code permanently destroyed",
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({ 
        revoked: false,
        valid: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Revocation check error:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Session heartbeat endpoint to maintain active sessions
  app.post("/api/auth/heartbeat", async (req, res) => {
    // This endpoint refreshes the session without requiring authentication
    // Sessions are maintained indefinitely until admin deletion
    if (req.session) {
      // Check if customer exists in customers table (auto-logout if deleted)
      const userId = (req.session as any).userId;
      const sessionCustomerNumber = (req.session as any).customerNumber;

      // Resolve which customer to validate. Prefer the server session, but fall
      // back to the customerNumber the client sends in the body. Many users are
      // "permanently logged in" on their device (Face ID / invite link) and have
      // NO server-side session identity — without this fallback their deletion
      // was never detected and they could keep using cached data indefinitely.
      let effectiveCustomerNumber: string | undefined = sessionCustomerNumber;
      try {
        if (!effectiveCustomerNumber && userId) {
          const u = await storage.getUserById(userId);
          if (u) effectiveCustomerNumber = u.customerNumber;
        }
      } catch (error) {
        console.error('Heartbeat userId lookup error:', error);
      }
      if (!effectiveCustomerNumber && req.body && typeof req.body.customerNumber === 'string') {
        effectiveCustomerNumber = req.body.customerNumber.trim();
      }

      if (effectiveCustomerNumber) {
        // Only logout if we're 100% certain they're deleted, not if the
        // database has a transient issue (checkCustomerExists fails safe = true).
        try {
          const customerExists = await checkCustomerExists(effectiveCustomerNumber);
          if (!customerExists) {
            // Distinguish a permanent erase (row gone) from a soft delete
            // (row present, isDeleted). This works even when the in-memory user
            // record has already been wiped, which is the whole point.
            const customerInDb = await storage.getCustomerByCustomerNumber(effectiveCustomerNumber, true);
            const isPermanentlyDeleted = !customerInDb;

            console.log(`🔒 CUSTOMER DELETED - FORCING LOGOUT VIA HEARTBEAT: ${effectiveCustomerNumber} (permanent: ${isPermanentlyDeleted})`);

            // Destroy session and force logout
            return await new Promise((resolve) => {
              req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);

                // Use 410 Gone for permanent deletion, 401 for soft deletion
                const statusCode = isPermanentlyDeleted ? 410 : 401;

                res.status(statusCode).json({
                  status: isPermanentlyDeleted ? "customer_permanently_deleted" : "customer_deleted",
                  message: isPermanentlyDeleted ? "Account has been permanently deleted" : "Account access has been revoked",
                  customerNumber: effectiveCustomerNumber,
                  logout: true,
                  forceDisconnect: true,
                  clearStorage: true,
                  permanentlyDeleted: isPermanentlyDeleted
                });
                resolve(undefined);
              });
            });
          }
        } catch (dbError) {
          // CRITICAL: If database check fails, DON'T logout the user
          // This prevents false logouts due to temporary database issues
          console.warn(`⚠️ Database check failed for ${effectiveCustomerNumber}, keeping session active:`, dbError);
          // Continue to success response - keep user logged in
        }
      }
      
      // REMOVED: Access code revocation check
      // Access code revocation should NOT force logout - it's not the same as admin deletion
      // Only customer deletion (checked above) should trigger forced logout
      // Access code issues are handled by OTC verification, not heartbeat
      
      req.session.touch(); // Refresh session expiry
      (req.session as any).lastHeartbeat = new Date().toISOString();
      
      res.json({ 
        status: "heartbeat_received", 
        timestamp: new Date().toISOString(),
        sessionActive: true
      });
    } else {
      res.json({ 
        status: "no_session", 
        timestamp: new Date().toISOString(),
        sessionActive: false
      });
    }
  });

  // Helper function to detect iOS devices
  function isIOSDevice(userAgent: string): boolean {
    if (!userAgent) return false;
    const iosPattern = /iPhone|iPad|iPod/i;
    return iosPattern.test(userAgent);
  }

  // Access code verification endpoint with device-specific usage limits
  app.post("/api/verify-code", async (req, res) => {
    try {
      const { code } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const isIOS = isIOSDevice(userAgent);
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid access code format" 
        });
      }

      // FIRST: Try OTC verification for registration/admin codes
      const otcValidation = otcService.validateOTC('', code); // Empty customerNumber for new registrations
      if (otcValidation.isValid) {
        console.log(`✅ OTC VERIFIED: ${code} - attempting to find associated user`);
        // Get the customer number from OTC
        const activeOTCs = otcService.getAllActiveOTCs();
        const otcEntry = activeOTCs.find((o: any) => o.code === code);
        
        if (otcEntry && otcEntry.customerNumber) {
          const user = await storage.getUserByCustomerNumber(otcEntry.customerNumber);
          if (user) {
            console.log(`🎉 USER FOUND FROM OTC: ${user.customerNumber}`);
            
            // Create session for user
            const userAgent = req.headers['user-agent'] || 'Unknown Device';
            const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
            
            // Create device session
            const deviceSessionId = addDeviceSession({
              deviceModel: userAgent.includes('iPhone') ? 'iPhone' : 'Other Device',
              ipAddress,
              userAgent,
              customerNumber: user.customerNumber
            });
            
            // Create persistent session
            (req.session as any).userId = user.id;
            (req.session as any).user = user;
            (req.session as any).deviceSessionId = deviceSessionId;
            (req.session as any).customerNumber = user.customerNumber;
            
            req.session.save((err) => {
              if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, error: 'Failed to create session' });
              }
              
              return res.json({
                success: true,
                message: "OTC verified - user logged in",
                user: user,
                sessionCreated: true
              });
            });
            return;
          }
        }
      }

      // Check permanent blacklist - codes that can never be used again
      const blacklistData = await db.get('permanent_blacklist');
      const pwaBlacklistData = await db.get('pwa_blacklist');
      const blacklist = processBlacklist(blacklistData);
      const pwaBlacklist = processBlacklist(pwaBlacklistData);
      const isBlacklisted = blacklist.includes(code) || pwaBlacklist.includes(code);
      
      if (isBlacklisted) {
        console.log(`🚫 BLACKLISTED CODE ATTEMPT: ${code} - PERMANENTLY DENIED`);
        return res.status(403).json({ 
          success: false, 
          error: "Access code permanently revoked",
          message: "This access code has been permanently disabled" 
        });
      }

      // Get access code data from database
      const codeData = await db.get(`access_code_${code}`);
      
      if (!codeData) {
        return res.status(404).json({ 
          success: false, 
          error: "Access code not found" 
        });
      }

      // Parse the stored data - handle nested JSON serialization
      let codeInfo;
      try {
        if (typeof codeData === 'string') {
          codeInfo = JSON.parse(codeData);
        } else if (codeData && typeof codeData === 'object' && codeData.value) {
          // Handle Replit Database wrapper format
          codeInfo = typeof codeData.value === 'string' ? JSON.parse(codeData.value) : codeData.value;
        } else {
          codeInfo = codeData;
        }
      } catch (parseError) {
        console.error('Error parsing code data:', parseError);
        return res.status(500).json({ 
          success: false, 
          error: "Code data corrupted" 
        });
      }
      
      // Check if code is invalid or revoked
      if (codeInfo && codeInfo.valid === false) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied or revoked",
          message: "Access denied or revoked" 
        });
      }

      // Initialize modern usage tracking if not present
      if (!codeInfo.usageCount) {
        codeInfo.usageCount = {
          ios: 0,
          android: 0,
          other: 0
        };
      }
      if (!codeInfo.deviceLimits) {
        codeInfo.deviceLimits = {
          ios: 2,
          android: 1,
          other: 1
        };
      }
      if (codeInfo.totalUsage === undefined) {
        codeInfo.totalUsage = 0;
      }

      // Determine device type
      const isAndroid = userAgent.toLowerCase().includes('android');
      let deviceType, currentUsage, deviceLimit;
      
      if (isIOS) {
        deviceType = 'ios';
        currentUsage = codeInfo.usageCount.ios;
        deviceLimit = codeInfo.deviceLimits.ios;
      } else if (isAndroid) {
        deviceType = 'android';
        currentUsage = codeInfo.usageCount.android;
        deviceLimit = codeInfo.deviceLimits.android;
      } else {
        deviceType = 'other';
        currentUsage = codeInfo.usageCount.other;
        deviceLimit = codeInfo.deviceLimits.other;
      }
      
      // Check if device has exceeded its limit
      if (currentUsage >= deviceLimit) {
        return res.status(409).json({ 
          success: false, 
          error: "Access Restricted – code already used",
          message: "Access Restricted – code already used" 
        });
      }

      // Record this usage
      codeInfo.usageCount[deviceType] += 1;
      codeInfo.totalUsage += 1;

      // Update the legacy used flag for backward compatibility
      codeInfo.used = true;
      codeInfo.lastUsedAt = new Date().toISOString();
      
      // Keep valid true unless manually revoked
      if (codeInfo.valid === undefined) {
        codeInfo.valid = true;
      }

      // Save updated code info
      await db.set(`access_code_${code}`, JSON.stringify(codeInfo));

      console.log(`Access granted for ${code} - iOS: ${isIOS}, Usage: iOS=${codeInfo.usageCount.ios}/${codeInfo.deviceLimits.ios}, Non-iOS=${codeInfo.usageCount.android + codeInfo.usageCount.other}/${codeInfo.deviceLimits.android + codeInfo.deviceLimits.other}`);

      res.json({ 
        success: true, 
        message: "Access granted",
        deviceType: deviceType,
        remainingUses: deviceLimit - codeInfo.usageCount[deviceType]
      });
      
    } catch (error) {
      console.error('Access code verification error:', error);
      res.status(500).json({ 
        success: false, 
        error: "Server error during verification" 
      });
    }
  });

  // Check if access is still valid (for users already in the app)
  app.post("/api/check-access", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: "Access code required" 
        });
      }

      // Get access code data from database
      const codeData = await db.get(`access_code_${code}`);
      
      if (!codeData) {
        return res.status(404).json({ 
          success: false, 
          error: "Access code not found" 
        });
      }

      // Parse the stored data
      let codeInfo;
      try {
        if (typeof codeData === 'string') {
          codeInfo = JSON.parse(codeData);
        } else if (codeData && typeof codeData === 'object' && codeData.value) {
          codeInfo = typeof codeData.value === 'string' ? JSON.parse(codeData.value) : codeData.value;
        } else {
          codeInfo = codeData;
        }
      } catch (parseError) {
        return res.status(500).json({ 
          success: false, 
          error: "Code data corrupted" 
        });
      }

      // Check if access has been revoked
      if (codeInfo && codeInfo.valid === false) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied or revoked",
          message: "Access denied or revoked" 
        });
      }

      // Initialize usage tracking if not present (for backward compatibility)
      if (!codeInfo.usage) {
        codeInfo.usage = {
          ios: 0,
          nonIos: 0,
          totalUses: 0,
          devices: []
        };
      }

      // Get user agent and detect device type
      const userAgent = req.headers['user-agent'] || '';
      const isIOS = isIOSDevice(userAgent);

      // Check device-specific usage limits
      const iosLimit = 2;
      const nonIosLimit = 1;
      
      let hasValidAccess = true;
      let remainingUses = 0;
      
      if (isIOS) {
        hasValidAccess = codeInfo.usage.ios < iosLimit;
        remainingUses = iosLimit - codeInfo.usage.ios;
      } else {
        hasValidAccess = codeInfo.usage.nonIos < nonIosLimit;
        remainingUses = nonIosLimit - codeInfo.usage.nonIos;
      }

      if (!hasValidAccess) {
        return res.status(409).json({ 
          success: false, 
          error: "Access Restricted – code already used",
          message: "Access Restricted – code already used" 
        });
      }

      res.json({ 
        success: true, 
        valid: codeInfo?.valid !== false,
        deviceType: isIOS ? 'iOS' : 'other',
        remainingUses: remainingUses,
        usageInfo: {
          ios: codeInfo.usage.ios,
          nonIos: codeInfo.usage.nonIos,
          totalUses: codeInfo.usage.totalUses
        }
      });
      
    } catch (error) {
      console.error('Access check error:', error);
      res.status(500).json({ 
        success: false, 
        error: "Server error during access check" 
      });
    }
  });

  // Add session tracking middleware
  app.use(sessionTrackingMiddleware);

  // Helper function to check if customer exists and is properly linked to user data
  // SAFE: Returns true on database errors to prevent false logouts
  // Only returns false if customer is CONFIRMED deleted or data is mismatched
  const checkCustomerExists = async (customerNumber: string): Promise<boolean> => {
    try {
      // Validate customer number format (8 digits)
      if (!customerNumber || !/^\d{8}$/.test(customerNumber)) {
        console.error(`⚠️ INVALID CUSTOMER NUMBER FORMAT: ${customerNumber} (must be 8 digits)`);
        return false;
      }

      // PostgreSQL (customers table) is the sole source of truth for existence/deletion.
      // The in-memory `users` Map is backed by a git-committed JSON snapshot and can be
      // stale after a redeploy, so it must never be able to force a "deleted" result.
      const customer = await storage.getCustomerByCustomerNumber(customerNumber);
      if (!customer) {
        console.log(`❌ CUSTOMER NOT FOUND IN POSTGRESQL: ${customerNumber}`);
        return false; // Customer doesn't exist in database
      }

      // getCustomerByCustomerNumber already excludes soft-deleted rows by default,
      // but check explicitly in case that ever changes.
      if (customer.isDeleted) {
        console.log(`🗑️ CUSTOMER SOFT-DELETED: ${customerNumber}`);
        return false; // Customer is marked as deleted
      }

      return true;
      
    } catch (error) {
      // On database errors, assume customer exists to prevent false logout
      console.error(`⚠️ DATABASE ERROR in checkCustomerExists for ${customerNumber}:`, error);
      console.log(`✅ FAIL-SAFE: Assuming customer ${customerNumber} exists due to DB error`);
      return true; // SAFE: Don't logout on DB errors
    }
  };

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session && req.session.userId) {
      // Check if device session is blocked - return error without destroying session
      if (req.session.deviceSessionId && isDeviceBlocked(req.session.deviceSessionId)) {
        console.log(`🚫 BLOCKED DEVICE ACCESS ATTEMPT: Session ${req.session.deviceSessionId}`);
        return res.status(403).json({ message: "Device access has been blocked by administrator" });
      }
      
      // Check if device is in panic mode - return error without destroying session
      if (req.session.deviceSessionId && isDeviceInPanicMode(req.session.deviceSessionId)) {
        console.log(`🚨 PANIC MODE ACCESS ATTEMPT: Session ${req.session.deviceSessionId}`);
        return res.status(403).json({ message: "System temporarily unavailable" });
      }
      
      // Set req.user from session for downstream handlers
      req.user = req.session.user;
      
      // Refresh session on each authenticated request
      req.session.touch();
      return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
  };

  // User registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const registerSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email format"),
        dateOfBirth: z.string().min(1, "Date of birth is required"),
        pin: z.string().length(4, "PIN must be 4 digits")
      });

      const userData = registerSchema.parse(req.body);
      
      // Generate customer number (8 digits starting with 2)
      const customerNumber = '2' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      
      // STEP 1: Create customer in PostgreSQL FIRST to get the ID
      let postgresCustomerId: number;
      const fullName = `${userData.firstName} ${userData.lastName}`;

      // Registering under a team name (admincustomer, admincustomer1, …) routes
      // the login code to that page, so that page's cap applies here too.
      const regTeamPage = findTeamPageForName(fullName);
      if (regTeamPage) {
        if (await countTeamSlotsInUse(regTeamPage) >= regTeamPage.limit) {
          return res.status(409).json({
            message: `${regTeamPage.title} is full (${regTeamPage.limit}). Delete one there first.`,
          });
        }
        // Sticky from here on — renaming in Personal Details won't move them off
        // that page.
        teamAccountRegistry.add(customerNumber, regTeamPage.slug);
      }

      try {
        const newCustomer = await storage.createCustomer({
          customerNumber,
          name: fullName,
          email: userData.email,
          phone: '',
          dateOfBirth: userData.dateOfBirth || '',
          joinDate: new Date().toISOString()
        });
        postgresCustomerId = newCustomer.id;
        console.log(`📊 CUSTOMER ADDED TO DATABASE: ${newCustomer.name} (${newCustomer.customerNumber}) with ID: ${postgresCustomerId}`);
      } catch (customerError) {
        console.error('Failed to add customer to database:', customerError);
        return res.status(500).json({ message: "Registration failed - database error" });
      }
      
      // STEP 2: Create user in memory using PostgreSQL ID
      const newUser = await storage.createUser({
        customerNumber,
        name: fullName,
        email: userData.email,
        pin: userData.pin,
        phone: '',
        address: '',
        dateOfBirth: userData.dateOfBirth,
        joinDate: new Date().toISOString(),
        isDisabled: false
      }, postgresCustomerId); // Use PostgreSQL ID for in-memory user

      console.log(`✅ USER REGISTERED with matching ID: ${newUser.id} (${newUser.customerNumber})`);
      
      // Generate OTC for registration verification
      const otc = await otcService.processNewAccount({
        customerNumber: newUser.customerNumber,
        name: fullName,
        email: userData.email,
        phone: ''
      });
      
      console.log(`📱 OTC Generated for registration: ${otc}`);
      
      res.status(201).json({ 
        success: true, 
        customerNumber: newUser.customerNumber,
        userId: newUser.id,
        message: "Registration successful - please verify with OTC"
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { customerNumber, pin } = loginSchema.parse(req.body);
      const user = await storage.getUserByCredentials(customerNumber, pin);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Sent by the client as navigator.maxTouchPoints; used to recognise a
      // touch device (iPhone/iPad) even when its User-Agent reports "Macintosh".
      const isTouchDevice = Number(req.body?.maxTouchPoints) > 0;

      // DISABLED: Panic mode should not prevent initial login
      // Users can only be blocked AFTER they're logged in via heartbeat/session check
      // if (isCustomerInPanicMode(user.customerNumber)) {
      //   console.log(`🚨 PANIC MODE LOGIN BLOCKED: Customer ${user.customerNumber} attempted login but their device is in panic mode`);
      //   return res.status(503).json({ 
      //     message: "System temporarily unavailable. Please try again later." 
      //   });
      // }

      // Get device information from request headers
      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
      
      // Extract device model from user agent with enhanced detection
      let deviceModel = 'Unknown Device';
      
      console.log('User Agent:', userAgent);
      
      if (userAgent.includes('iPhone')) {
        // Extract iPhone model (iPhone 15 Pro, iPhone 14, etc.)
        const iphoneMatch = userAgent.match(/iPhone OS (\d+)_(\d+)/);
        const modelMatch = userAgent.match(/iPhone(\d+,\d+)/);
        
        if (iphoneMatch) {
          const majorVersion = parseInt(iphoneMatch[1]);
          if (majorVersion >= 17) deviceModel = 'iPhone 15 Pro';
          else if (majorVersion >= 16) deviceModel = 'iPhone 14 Pro';
          else if (majorVersion >= 15) deviceModel = 'iPhone 13 Pro';
          else if (majorVersion >= 14) deviceModel = 'iPhone 12 Pro';
          else deviceModel = 'iPhone';
        } else {
          deviceModel = 'iPhone';
        }
      } else if (userAgent.includes('iPad')) {
        // Extract iPad model
        const ipadMatch = userAgent.match(/OS (\d+)_(\d+)/);
        if (ipadMatch) {
          const majorVersion = parseInt(ipadMatch[1]);
          if (majorVersion >= 17) deviceModel = 'iPad Pro';
          else if (majorVersion >= 15) deviceModel = 'iPad Air';
          else deviceModel = 'iPad';
        } else {
          deviceModel = 'iPad';
        }
      } else if (userAgent.includes('Android')) {
        // Extract Android device model
        const androidMatch = userAgent.match(/Android (\d+)/);
        const modelMatch = userAgent.match(/; ([^;)]+)\)/);
        
        if (modelMatch && modelMatch[1]) {
          const model = modelMatch[1].trim();
          if (model.includes('SM-S9')) deviceModel = 'Samsung Galaxy S24';
          else if (model.includes('SM-S8')) deviceModel = 'Samsung Galaxy S23';
          else if (model.includes('Pixel')) deviceModel = 'Google Pixel';
          else if (model.includes('OnePlus')) deviceModel = 'OnePlus';
          else if (model.includes('Xiaomi')) deviceModel = 'Xiaomi';
          else deviceModel = `Android - ${model}`;
        } else if (androidMatch) {
          deviceModel = `Android ${androidMatch[1]}`;
        } else {
          deviceModel = 'Android Device';
        }
      } else if (userAgent.includes('Chrome') && userAgent.includes('Windows')) {
        deviceModel = 'Windows PC - Chrome';
      } else if (userAgent.includes('Safari') && userAgent.includes('Mac')) {
        deviceModel = 'Mac - Safari';
      } else if (userAgent.includes('Edge')) {
        deviceModel = 'Windows PC - Edge';
      } else if (userAgent.includes('Firefox')) {
        deviceModel = 'Desktop - Firefox';
      } else {
        deviceModel = 'Web Browser';
      }

      // Check if this device is authorized for this account
      if (!isCurrentDeviceAuthorized(user.id, userAgent, isTouchDevice)) {
        const existingSession = getUserDeviceSession(user.id);
        console.log(`🚫 UNAUTHORIZED DEVICE: User ${user.id} attempted login from ${deviceModel}, but account is permanently locked to ${existingSession?.deviceModel}`);
        return res.status(403).json({ 
          message: "This account is already active on another device." 
        });
      }

      // DISABLED: Panic mode should not prevent initial login
      // Panic mode is enforced via heartbeat, not at login
      // const existingSession = getUserDeviceSession(user.id);
      // if (existingSession && existingSession.deviceSessionId && isDeviceInPanicMode(existingSession.deviceSessionId)) {
      //   console.log(`🚨 PANIC MODE LOGIN BLOCKED: User ${user.id} attempted login, but device ${existingSession.deviceModel} is in panic mode`);
      //   return res.status(503).json({ 
      //     message: "System temporarily unavailable. Please try again later." 
      //   });
      // }

      // Create device session only after confirming no existing session
      const deviceSessionId = addDeviceSession({
        deviceModel,
        ipAddress,
        userAgent,
        customerNumber: user.customerNumber
      });

      // Lock this account to the current device permanently
      setUserDeviceSession({
        userId: user.id,
        deviceSessionId,
        deviceModel,
        ipAddress,
        loginTime: new Date().toISOString(),
        userAgent,
        isTouchDevice,
        permanentLock: true
      });

      // Store user and device session in session (include customerNumber for heartbeat checks)
      (req as any).session.userId = user.id;
      (req as any).session.customerNumber = user.customerNumber;
      (req as any).session.user = { id: user.id, name: user.name, email: user.email, customerNumber: user.customerNumber };
      (req as any).session.deviceSessionId = deviceSessionId;

      // Register session for tracking and invalidation
      addUserSession(req.sessionID, user.customerNumber, user.id);

      console.log(`📱 NEW DEVICE SESSION: ${deviceModel} (${ipAddress}) - Session: ${deviceSessionId}`);
      console.log(`🔒 ACCOUNT LOCKED TO DEVICE: User ${user.id} locked to ${deviceModel}`);

      // Save session to persist userId
      (req as any).session.save((err: any) => {
        if (err) {
          console.error('Session save error:', err);
        }
        res.json({ user: { id: user.id, name: user.name, email: user.email, customerNumber: user.customerNumber } });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== One-person login links (invite tokens) — additive, does not change
  // the existing login/session/device-lock behaviour for current users. =====

  // Admin: generate a single-use login link for a customer, and (matching the
  // existing oversight fields) save the admin alias/notes and app-replacement
  // level 0-5 at the same time.
  app.post("/api/admin/invite/create", async (req, res) => {
    try {
      const { customerNumber, adminAlias, appReplacement } = req.body || {};
      if (!customerNumber) {
        return res.status(400).json({ success: false, message: "customerNumber is required" });
      }
      const customer = await storage.getCustomerByCustomerNumber(customerNumber, true);
      if (!customer) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }

      const updates: any = {};
      if (adminAlias !== undefined) updates.adminAlias = adminAlias;
      if (appReplacement !== undefined) {
        const val = parseInt(appReplacement);
        if (!isNaN(val) && val >= 0 && val <= 5) updates.appReplacement = val;
      }
      if (Object.keys(updates).length > 0) {
        await storage.updateCustomer(customerNumber, updates);
      }

      const record = inviteService.createInvite(customerNumber);
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.get('host');
      const link = `${proto}://${host}/invite/${record.token}`;

      res.json({
        success: true,
        link,
        token: record.token,
        expiresAt: new Date(record.expiresAt).toISOString(),
        customerNumber,
      });
    } catch (error) {
      console.error('Error creating invite link:', error);
      res.status(500).json({ success: false, message: "Failed to create invite link" });
    }
  });

  // Admin: create a BRAND-NEW person (minimal) and return a one-person link.
  // Builds the customer + login user + an empty starter account, saves the admin
  // alias/notes and replacement level, then generates the invite. Balance starts
  // at 0.00 — set it later from the customer panel.
  app.post("/api/admin/customers/create-with-link", async (req, res) => {
    try {
      const { name, adminAlias, appReplacement } = req.body || {};
      const profileName = String(name || '').trim();
      if (!profileName) {
        return res.status(400).json({ success: false, message: "A name is required" });
      }

      let created: { customerNumber: string; id: number } | null = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const customerNumber = '2' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        const existing = await storage.getCustomerByCustomerNumber(customerNumber, true);
        if (existing) continue;

        const email = `${customerNumber}@training.local`;
        const joinDate = new Date().toISOString();
        try {
          const newCustomer = await storage.createCustomer({
            customerNumber, name: profileName, email, phone: '', dateOfBirth: '', joinDate,
          });
          // Random PIN — they log in with the simulated Face ID; the PIN is only a fallback credential.
          const pin = Math.floor(1000 + Math.random() * 9000).toString();
          const newUser = await storage.createUser({
            customerNumber, name: profileName, email, pin, phone: '', address: '',
            dateOfBirth: '', joinDate, isDisabled: false,
          }, newCustomer.id);

          // Empty starter current account so the dashboard has something to show.
          const accountNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
          const sortCode = '90-78-68';
          const iban = `IE${Math.floor(10 + Math.random() * 90)}BOFI${sortCode.replace(/-/g, '')}${accountNumber}`;
          await storage.createAccount({
            userId: newUser.id, accountType: 'current', accountNumber, sortCode,
            bic: 'BOFIIE2D', iban, balance: '0.00', displayName: 'Current Account',
          });

          created = { customerNumber, id: newCustomer.id };
        } catch (e) {
          console.warn('create-with-link attempt failed, retrying:', (e as any)?.message);
        }
      }

      if (!created) {
        return res.status(500).json({ success: false, message: "Could not create the account. Please try again." });
      }

      const updates: any = {};
      if (adminAlias !== undefined && adminAlias !== '') updates.adminAlias = adminAlias;
      if (appReplacement !== undefined) {
        const val = parseInt(appReplacement);
        if (!isNaN(val) && val >= 0 && val <= 5) updates.appReplacement = val;
      }
      if (Object.keys(updates).length > 0) {
        await storage.updateCustomer(created.customerNumber, updates);
      }

      const record = inviteService.createInvite(created.customerNumber);
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.get('host');
      const link = `${proto}://${host}/invite/${record.token}`;

      res.json({
        success: true,
        link,
        expiresAt: new Date(record.expiresAt).toISOString(),
        customerNumber: created.customerNumber,
        name: profileName,
      });
    } catch (error) {
      console.error('Error creating new person with link:', error);
      res.status(500).json({ success: false, message: "Failed to create new person" });
    }
  });

  // Admin: permanently erase ALL soft-deleted customers in one go (Deleted tab
  // bulk action). Only touches customers with isDeleted=true — active customers
  // are never affected. Reports per-customer failures instead of stopping.
  app.delete("/api/admin/customers/erase-all-deleted", async (req, res) => {
    try {
      const all = await storage.getAllCustomers(true);
      const softDeleted = all.filter(c => c.isDeleted);

      if (softDeleted.length === 0) {
        return res.json({ success: true, erased: 0, failed: [], message: "No soft-deleted customers to erase" });
      }

      let erased = 0;
      const failed: Array<{ customerNumber: string; name: string; reason: string }> = [];

      for (const customer of softDeleted) {
        try {
          const result = await storage.permanentlyEraseCustomer(customer.customerNumber);
          if (result.success) {
            try { await storage.deleteUser(customer.customerNumber); } catch {}
            erased++;
            console.log(`🔥 BULK ERASE: ${customer.customerNumber} (${customer.name})`);
          } else {
            failed.push({ customerNumber: customer.customerNumber, name: customer.name, reason: result.detail || 'unknown' });
          }
        } catch (e: any) {
          failed.push({ customerNumber: customer.customerNumber, name: customer.name, reason: e?.message || 'unknown' });
        }
      }

      console.log(`🔥 BULK ERASE COMPLETE: ${erased} erased, ${failed.length} failed`);
      res.json({ success: failed.length === 0, erased, failed });
    } catch (error: any) {
      console.error('Error bulk-erasing deleted customers:', error);
      res.status(500).json({ success: false, message: `Bulk erase failed: ${error?.message || 'unknown error'}` });
    }
  });

  // Admin: list all active (pending, unexpired) invite links with the customer
  // name, for the Links tab and the "Active Links" summary card.
  app.get("/api/admin/invite/active", async (req, res) => {
    try {
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.get('host');
      const pending = inviteService.getAllPending();
      const items = await Promise.all(pending.map(async (rec) => {
        let name = '';
        try {
          const c = await storage.getCustomerByCustomerNumber(rec.customerNumber, true);
          name = c?.name || '';
        } catch {}
        return {
          customerNumber: rec.customerNumber,
          name,
          link: `${proto}://${host}/invite/${rec.token}`,
          createdAt: new Date(rec.createdAt).toISOString(),
          expiresAt: new Date(rec.expiresAt).toISOString(),
        };
      }));
      res.json({ count: items.length, links: items });
    } catch (error: any) {
      console.error('Error listing active invites:', error);
      res.status(500).json({ count: 0, links: [], message: error?.message || 'error' });
    }
  });

  // Public: check an invite's status (used by the invite landing page).
  app.get("/api/invite/status/:token", (req, res) => {
    const { status, record } = inviteService.peek(req.params.token);
    res.json({ status, expiresAt: record ? new Date(record.expiresAt).toISOString() : null });
  });

  // Public: claim an invite. Establishes the session + device lock on THIS
  // device just like a normal login, then returns the customer's profile so the
  // app can seed local state and switch on Face ID.
  app.post("/api/invite/claim", async (req, res) => {
    try {
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ success: false, message: "token required" });

      const peek = inviteService.peek(token);
      if (peek.status !== 'valid') {
        return res.status(410).json({
          success: false,
          reason: peek.status,
          message:
            peek.status === 'claimed' ? "This link has already been used." :
            peek.status === 'expired' ? "This link has expired." :
            "This link is not valid.",
        });
      }

      const customerNumber = peek.record!.customerNumber;
      const user = await storage.getUserByCustomerNumber(customerNumber);
      if (!user) {
        return res.status(404).json({ success: false, message: "Account not found" });
      }

      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const ipAddress = req.ip || (req.connection as any)?.remoteAddress || 'Unknown IP';
      const isTouchDevice = Number(req.body?.maxTouchPoints) > 0;
      let deviceModel = 'Browser';
      if (userAgent.includes('iPhone')) deviceModel = 'iPhone';
      else if (userAgent.includes('iPad')) deviceModel = 'iPad';
      else if (userAgent.includes('Android')) deviceModel = 'Android Device';

      // Admin-authorised (re)bind: clear any previous device lock, then lock to
      // this device — this is how the invite authorises a new phone.
      removeUserDeviceSession(user.id);
      const deviceSessionId = addDeviceSession({ deviceModel, ipAddress, userAgent, customerNumber: user.customerNumber });
      setUserDeviceSession({
        userId: user.id,
        deviceSessionId,
        deviceModel,
        ipAddress,
        loginTime: new Date().toISOString(),
        userAgent,
        isTouchDevice,
        permanentLock: true,
      });

      inviteService.consume(token, deviceModel);

      (req as any).session.userId = user.id;
      (req as any).session.customerNumber = user.customerNumber;
      (req as any).session.user = { id: user.id, name: user.name, email: user.email, customerNumber: user.customerNumber };
      (req as any).session.deviceSessionId = deviceSessionId;
      addUserSession(req.sessionID, user.customerNumber, user.id);

      (req as any).session.save((err: any) => {
        if (err) console.error('Invite claim session save error:', err);
        res.json({
          success: true,
          user: { id: user.id, name: user.name, email: user.email, customerNumber: user.customerNumber },
        });
      });
    } catch (error) {
      console.error('Error claiming invite:', error);
      res.status(500).json({ success: false, message: "Failed to claim link" });
    }
  });

  // Check authentication status
  app.get("/api/auth/user", async (req, res) => {
    console.log('User check - Session ID:', req.sessionID);
    console.log('User check - Session user:', (req as any).session?.user);
    console.log('User check - Session userId:', (req as any).session?.userId);
    console.log('User check - Full session:', (req as any).session);
    
    if ((req as any).session && (req as any).session.user) {
      // Check if customer exists in database (deleted customer check)
      const userId = (req as any).session.userId;
      if (userId) {
        try {
          const user = await storage.getUserById(userId);
          if (user) {
            try {
              const customerExists = await checkCustomerExists(user.customerNumber);
              if (!customerExists) {
                console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${user.customerNumber} tried to access customer panel`);
                
                // Return 403 without logout flags - heartbeat will handle the logout
                return res.status(403).json({ 
                  message: "Account access revoked"
                });
              }
            } catch (dbError) {
              // If database check fails, keep user logged in (don't force logout on database error)
              console.warn(`⚠️ Database check failed for ${user.customerNumber} in auth check, keeping session active:`, dbError);
            }
          }
        } catch (error) {
          console.error('User lookup error in auth check:', error);
        }
      }
      
      // Refresh session on successful auth check
      (req as any).session.touch();
      res.json((req as any).session.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Logout - DISABLED: Users can only be logged out via admin deletion
  app.post("/api/auth/logout", (req, res) => {
    // Logout functionality disabled - users stay logged in permanently
    // Only admin deletion should remove user sessions
    console.warn('Logout attempt blocked - users can only be logged out via admin deletion');
    res.status(403).json({ message: "Logout disabled - users can only be logged out via admin deletion" });
  });

  // Get current user's accounts (uses session)
  app.get("/api/accounts", requireAuth, async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Check if customer exists in database (deleted customer check)
      const customerExists = await checkCustomerExists(sessionUser.customerNumber);
      if (!customerExists) {
        console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${sessionUser.customerNumber} tried to view accounts`);
        return res.status(403).json({ message: "Account access revoked" });
      }
      
      let accounts = await storage.getAccountsByUserId(sessionUser.id);
      
      // Auto-create Current Account if user has no accounts
      if (accounts.length === 0) {
        console.log(`🏦 Creating Current Account for user ${sessionUser.customerNumber} (id: ${sessionUser.id})`);
        
        // Generate unique 8-digit account number
        const accountNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
        const sortCode = '90-78-68';
        const bic = 'BOFIIE2D';
        const iban = `IE${Math.floor(10 + Math.random() * 90)}BOFI${sortCode.replace(/-/g, '')}${accountNumber}`;
        
        const newAccount = await storage.createAccount({
          userId: sessionUser.id,
          accountType: 'current',
          accountNumber: accountNumber,
          sortCode: sortCode,
          bic: bic,
          iban: iban,
          balance: '0.00',
          displayName: 'Current Account'
        });
        
        accounts = [newAccount];
        console.log(`✅ Created Current Account ${accountNumber} for ${sessionUser.customerNumber}`);
      }
      
      console.log(`💳 Loaded ${accounts.length} account(s) for user ${sessionUser.customerNumber}`);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user accounts by userId (legacy endpoint)
  app.get("/api/accounts/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if customer exists in database (deleted customer check)
      const user = await storage.getUserById(userId);
      if (user) {
        const customerExists = await checkCustomerExists(user.customerNumber);
        if (!customerExists) {
          console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${user.customerNumber} tried to view accounts`);
          
          // Return 403 without logout flags - heartbeat will handle the logout
          return res.status(403).json({ 
            message: "Account access revoked"
          });
        }
      }
      
      const accounts = await storage.getAccountsByUserId(userId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new account with full banking details (like the auto-created Current Account)
  app.post("/api/accounts", requireAuth, async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { accountType, displayName, balance } = req.body;

      if (!accountType) {
        return res.status(400).json({ message: "Account type is required" });
      }

      // Check maximum account limit (5 accounts per customer)
      const MAX_ACCOUNTS = 5;
      const existingAccounts = await storage.getAccountsByUserId(sessionUser.id);
      if (existingAccounts.length >= MAX_ACCOUNTS) {
        return res.status(400).json({ 
          message: `Maximum of ${MAX_ACCOUNTS} accounts allowed. Please delete an existing account first.`,
          code: 'MAX_ACCOUNTS_REACHED'
        });
      }

      // Generate proper banking details - exactly like registration
      const accountNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
      const sortCode = '90-78-68';
      const bic = 'BOFIIE2D';
      const iban = `IE${Math.floor(10 + Math.random() * 90)}BOFI${sortCode.replace(/-/g, '')}${accountNumber}`;

      // Map account type to display name if not provided
      const typeDisplayNames: Record<string, string> = {
        'current': 'Current Account',
        'savings': 'Savings Account',
        'credit': 'Credit Card',
        'loan': 'Loan Account',
        'deposit': 'Deposit Account'
      };

      const finalDisplayName = displayName?.trim() || typeDisplayNames[accountType] || 'New Account';
      const initialBalance = balance ? parseFloat(balance).toFixed(2) : '0.00';

      // Create account in PostgreSQL
      const newAccount = await storage.createAccount({
        userId: sessionUser.id,
        accountType: accountType,
        accountNumber: accountNumber,
        sortCode: sortCode,
        bic: bic,
        iban: iban,
        balance: initialBalance,
        displayName: finalDisplayName
      });

      console.log(`🏦 New ${accountType} account created: ${accountNumber} for user ${sessionUser.customerNumber}`);

      res.json({
        success: true,
        account: newAccount
      });
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Update account balance and/or displayName (for Customer Panel and transfers)
  app.put("/api/accounts/:accountId/balance", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { balance, displayName } = req.body;
      const sessionUser = (req as any).user;
      
      if ((balance === undefined || balance === null) && !displayName) {
        return res.status(400).json({ message: "Balance or displayName is required" });
      }
      
      if (!sessionUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Load accounts for this user from PostgreSQL (ensures fresh data)
      const userAccounts = await storage.getAccountsByUserId(sessionUser.id);
      const account = userAccounts.find(a => a.id === accountId);
      
      // Verify the account belongs to the authenticated user
      if (!account) {
        return res.status(403).json({ message: "Account not found or access denied" });
      }
      
      // Update balance if provided
      let newBalance = account.balance;
      if (balance !== undefined && balance !== null) {
        newBalance = parseFloat(balance).toFixed(2);
        await storage.updateAccountBalance(accountId, newBalance);
        console.log(`💰 Balance updated via API: Account ID=${accountId}, New Balance=${newBalance}`);
      }
      
      // Update displayName if provided
      let newDisplayName = account.displayName;
      if (displayName && displayName.trim()) {
        newDisplayName = displayName.trim();
        await storage.updateAccountDisplayName(accountId, newDisplayName);
        console.log(`📝 Display name updated via API: Account ID=${accountId}, New Name=${newDisplayName}`);
      }
      
      res.json({ 
        success: true, 
        accountId, 
        newBalance,
        displayName: newDisplayName,
        message: "Account updated successfully" 
      });
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  // Clear all transactions for the authenticated user (reset to defaults)
  app.delete("/api/transactions/clear-all", requireAuth, async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      
      if (!sessionUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Clear all transactions for this user from database
      const cleared = await storage.clearAllTransactionsForUser(sessionUser.id);
      
      if (cleared) {
        console.log(`🗑️ All transactions cleared for user ${sessionUser.customerNumber} (ID: ${sessionUser.id})`);
        res.json({ 
          success: true, 
          message: "All transactions cleared successfully" 
        });
      } else {
        res.status(500).json({ message: "Failed to clear transactions" });
      }
    } catch (error) {
      console.error('Error clearing transactions:', error);
      res.status(500).json({ message: "Failed to clear transactions" });
    }
  });

  // Delete an account
  app.delete("/api/accounts/:accountId", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const sessionUser = (req as any).user;
      
      if (!sessionUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Load accounts for this user to verify ownership
      const userAccounts = await storage.getAccountsByUserId(sessionUser.id);
      const account = userAccounts.find(a => a.id === accountId);
      
      // Verify the account belongs to the authenticated user
      if (!account) {
        return res.status(403).json({ message: "Account not found or access denied" });
      }
      
      // Prevent deleting the last account
      if (userAccounts.length <= 1) {
        return res.status(400).json({ message: "Cannot delete your only account. You must have at least one account." });
      }
      
      // Delete the account and its transactions
      const deleted = await storage.deleteAccount(accountId);
      
      if (deleted) {
        console.log(`🗑️ Account ${accountId} (${account.displayName}) deleted by user ${sessionUser.customerNumber}`);
        res.json({ 
          success: true, 
          message: `${account.displayName} has been deleted` 
        });
      } else {
        res.status(500).json({ message: "Failed to delete account" });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Get account transactions
  app.get("/api/transactions/:accountId", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      console.log('Getting transactions for account ID:', accountId);
      
      // Check if customer exists in database (deleted customer check)
      const account = await storage.getAccountById(accountId);
      if (account) {
        const user = await storage.getUserById(account.userId);
        if (user) {
          const customerExists = await checkCustomerExists(user.customerNumber);
          if (!customerExists) {
            console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${user.customerNumber} tried to view transactions`);
            
            // Return 403 without logout flags - heartbeat will handle the logout
            return res.status(403).json({ 
              message: "Account access revoked"
            });
          }
        }
      }
      
      const transactions = await storage.getTransactionsByAccountId(accountId);
      console.log('Found transactions:', transactions.length);
      res.json(transactions);
    } catch (error) {
      console.error('Transaction error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create sample/custom transaction (also updates balance)
  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { accountId, amount, description, category, type, timestamp, paymentMethod } = req.body;

      if (!accountId || amount === undefined || !description || !category || !type) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify account belongs to user
      const account = await storage.getAccountById(accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      if (account.userId !== sessionUser.id) {
        return res.status(403).json({ message: "Not authorized to add transactions to this account" });
      }

      // Parse the amount - handle both "+100.00" and "-100.00" formats
      const amountStr = String(amount);
      const numericAmount = parseFloat(amountStr.replace('+', ''));

      // Create the transaction in PostgreSQL
      const transaction = await storage.createTransaction({
        accountId,
        amount: amountStr,
        description,
        category,
        type,
        paymentMethod: paymentMethod || (type === 'credit' ? 'Deposit' : 'Purchase'),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        reference: null,
        recipientName: null,
        iban: null,
        bicCode: null,
        recipientAccountNumber: null,
        recipientSortCode: null,
        recipientIban: null,
        exchangeRate: null,
        convertedAmount: null,
        convertedCurrency: null
      });

      // Update the account balance
      const currentBalance = parseFloat(account.balance);
      const balanceChange = type === 'credit' ? Math.abs(numericAmount) : -Math.abs(numericAmount);
      const newBalance = (currentBalance + balanceChange).toFixed(2);
      
      await storage.updateAccountBalance(accountId, newBalance);

      console.log(`💳 Sample transaction created: ${description}, Amount: ${amountStr}, New Balance: ${newBalance}`);

      res.json({ 
        success: true, 
        transaction,
        newBalance 
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Delete a single transaction by ID
  app.delete("/api/transactions/:transactionId", requireAuth, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const sessionUser = (req as any).user;
      
      if (!sessionUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get the transaction to verify ownership and get amount for balance adjustment
      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Get the account to verify ownership
      const account = await storage.getAccountById(transaction.accountId);
      if (!account || account.userId !== sessionUser.id) {
        return res.status(403).json({ message: "Not authorized to delete this transaction" });
      }

      // Delete the transaction row and adjust the balance atomically in the DB.
      const result = await storage.deleteTransaction(transactionId);

      if (result.success) {
        console.log(`🗑️ Transaction ${transactionId} deleted by user ${sessionUser.customerNumber}, balance adjusted to ${result.newBalance}`);
        res.json({
          success: true,
          message: "Transaction deleted successfully",
          newBalance: result.newBalance
        });
      } else {
        res.status(500).json({ message: "Failed to delete transaction" });
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Create transfer - ROBUST VERSION with retry, idempotency, and rollback
  app.post("/api/transfer", async (req, res) => {
    console.log('💸 Transfer request received');
    
    try {
      const transferData = transferSchema.parse(req.body);
      const account = await storage.getAccountById(transferData.fromAccountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Check if customer exists in database (deleted customer check)
      const accountUser = await storage.getUserById(account.userId);
      if (accountUser) {
        const customerExists = await checkCustomerExists(accountUser.customerNumber);
        if (!customerExists) {
          console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${accountUser.customerNumber} tried to transfer`);
          return res.status(403).json({ message: "Account access revoked" });
        }
      }

      const amount = parseFloat(transferData.amount);
      const currentBalance = parseFloat(account.balance);
      
      if (amount > currentBalance) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Check for duplicate request FIRST using stable values only
      const idempotencyKey = generateIdempotencyKey(
        account.userId, 
        transferData.fromAccountId, 
        transferData.amount, 
        transferData.toAccount, // Use recipient name, not generated reference
        transferData.idempotencyToken // Client-supplied token if available
      );

      // Check if already processed
      const { isDuplicate, previousResult } = checkIdempotency(idempotencyKey);
      if (isDuplicate && previousResult) {
        console.log('🔒 Returning cached transfer result (duplicate prevention)');
        return res.json(previousResult);
      }

      // Mark as in-progress to prevent concurrent processing
      if (!markTransferInProgress(idempotencyKey)) {
        console.log('🔒 Transfer already in progress, blocking concurrent request');
        return res.status(409).json({ message: "Transfer already being processed. Please wait." });
      }

      // Use try/finally to GUARANTEE in-progress marker is always cleared
      let transferSucceeded = false;
      let createdTransaction: any = null;
      let successResult: any = null;
      
      try {
        // Generate reference AFTER idempotency check
        const transactionReference = transferData.reference || `TXN${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const newBalance = (currentBalance - amount).toFixed(2);

        // Step 1: Create transaction (no retry - not idempotent)
        console.log('💳 Creating debit transaction...');
        createdTransaction = await storage.createTransaction({
          accountId: transferData.fromAccountId,
          amount: `-${amount}`,
          description: `Transfer to ${transferData.toAccount}`,
          category: "transfer",
          type: "debit",
          paymentMethod: "Online Transfer",
          reference: transactionReference,
          recipientName: transferData.toAccount,
          recipientAccountNumber: transferData.recipientDetails?.accountNumber,
          recipientSortCode: transferData.recipientDetails?.sortCode,
          timestamp: new Date()
        });
        
        // Step 2: Update balance (with retry - this IS idempotent, sets specific value)
        console.log('💳 Updating account balance...');
        await withRetry(
          () => storage.updateAccountBalance(transferData.fromAccountId, newBalance),
          { maxAttempts: 3, operationName: 'Update balance' }
        );
        
        // Prepare success result
        successResult = { 
          message: "Transfer completed successfully", 
          transaction: createdTransaction,
          newBalance 
        };
        
        // Record successful transfer for idempotency
        recordTransfer(idempotencyKey, successResult);
        
        // ONLY set transferSucceeded AFTER recordTransfer completes - ensures cleanup on any error
        transferSucceeded = true;

        // Send email notification (non-critical, don't block response)
        const user = accountUser;
        if (user && user.email) {
          // Fire and forget - don't await
          sendTransferConfirmation(user.email, {
            recipientName: transferData.toAccount,
            amount: amount.toFixed(2),
            currency: (user.currency === 'GBP' ? '£' : '€'),
            dateTime: new Date().toLocaleString('en-GB', {
              dateStyle: 'short',
              timeStyle: 'short',
              timeZone: 'Europe/Dublin'
            }),
            transactionReference: transactionReference,
            transactionId: createdTransaction.id.toString(),
            senderName: user.name,
            accountInfo: `${account.displayName} (${account.accountNumber.slice(-4)})`
          }).catch(err => console.error('📧 Email notification failed (non-critical):', err));
        }

        console.log(`✅ Transfer completed: ${amount} to ${transferData.toAccount}`);
        
      } catch (error) {
        console.error('❌ Transfer failed:', error);
        // If transaction was created but balance update failed, attempt to restore
        if (createdTransaction) {
          console.log('🔄 Attempting to restore original balance...');
          try {
            await storage.updateAccountBalance(transferData.fromAccountId, currentBalance.toFixed(2));
          } catch (restoreError) {
            console.error('⚠️ Failed to restore balance:', restoreError);
          }
        }
      } finally {
        // ALWAYS clear in-progress marker - this guarantees transfer never gets stuck
        if (!transferSucceeded) {
          clearTransferInProgress(idempotencyKey);
        }
      }
      
      // Return response outside try/finally
      if (transferSucceeded) {
        return res.json(successResult);
      } else {
        return res.status(500).json({ message: "Transfer failed. Please try again." });
      }
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('❌ Transfer error:', error);
      res.status(500).json({ message: "Transfer failed. Please try again." });
    }
  });

  // Lookup account by sort code and account number (for UK internal transfers)
  app.post("/api/lookup-account/uk", requireAuth, async (req, res) => {
    try {
      const { sortCode, accountNumber } = req.body;
      
      if (!sortCode || !accountNumber) {
        return res.status(400).json({ message: "Sort code and account number are required" });
      }
      
      const account = await storage.getAccountBySortCodeAndNumber(sortCode, accountNumber);
      
      if (account) {
        // Get account owner info
        const owner = await storage.getUserById(account.userId);
        
        res.json({
          found: true,
          isInternal: true,
          accountId: account.id,
          accountType: account.accountType,
          displayName: account.displayName,
          ownerName: owner?.name || 'Unknown',
          message: "Internal BOI account found"
        });
      } else {
        res.json({
          found: false,
          isInternal: false,
          message: "External account - standard transfer"
        });
      }
    } catch (error) {
      console.error('Error looking up UK account:', error);
      res.status(500).json({ message: "Failed to lookup account" });
    }
  });

  // Lookup account by BIC and IBAN (for SEPA internal transfers)
  app.post("/api/lookup-account/sepa", requireAuth, async (req, res) => {
    try {
      const { bic, iban } = req.body;
      
      if (!bic || !iban) {
        return res.status(400).json({ message: "BIC and IBAN are required" });
      }
      
      const account = await storage.getAccountByBicAndIban(bic, iban);
      
      if (account) {
        // Get account owner info
        const owner = await storage.getUserById(account.userId);
        
        res.json({
          found: true,
          isInternal: true,
          accountId: account.id,
          accountType: account.accountType,
          displayName: account.displayName,
          ownerName: owner?.name || 'Unknown',
          message: "Internal BOI account found"
        });
      } else {
        res.json({
          found: false,
          isInternal: false,
          message: "External account - standard SEPA transfer"
        });
      }
    } catch (error) {
      console.error('Error looking up SEPA account:', error);
      res.status(500).json({ message: "Failed to lookup account" });
    }
  });

  // Process internal transfer between BOI customers - ROBUST VERSION
  app.post("/api/internal-transfer", requireAuth, async (req, res) => {
    console.log('💸 Internal transfer request received');
    
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Check if sender customer exists (deleted customer check)
      const senderCustomerExists = await checkCustomerExists(sessionUser.customerNumber);
      if (!senderCustomerExists) {
        console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${sessionUser.customerNumber} tried to make internal transfer`);
        return res.status(403).json({ message: "Account access revoked" });
      }
      
      const { 
        fromAccountId, 
        toAccountId, 
        amount, 
        reference, 
        recipientName,
        transferType // 'uk' or 'sepa'
      } = req.body;
      
      // Validate required fields
      if (!fromAccountId || !toAccountId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate amount is a positive number
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount - must be a positive number" });
      }
      
      // Prevent transfers to same account
      if (fromAccountId === toAccountId) {
        return res.status(400).json({ message: "Cannot transfer to the same account" });
      }
      
      // Get sender's account
      const senderAccount = await storage.getAccountById(parseInt(fromAccountId));
      if (!senderAccount) {
        return res.status(404).json({ message: "Sender account not found" });
      }
      
      // Verify sender owns the account
      if (senderAccount.userId !== sessionUser.id) {
        return res.status(403).json({ message: "You don't own this account" });
      }
      
      // Check sufficient funds
      const senderBalance = parseFloat(senderAccount.balance);
      if (numericAmount > senderBalance) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
      
      // Get recipient's account
      const recipientAccount = await storage.getAccountById(parseInt(toAccountId));
      if (!recipientAccount) {
        return res.status(404).json({ message: "Recipient account not found" });
      }
      
      // Verify recipient customer exists (not soft-deleted)
      const recipientUser = await storage.getUserById(recipientAccount.userId);
      if (recipientUser) {
        const recipientCustomerExists = await checkCustomerExists(recipientUser.customerNumber);
        if (!recipientCustomerExists) {
          return res.status(400).json({ message: "Recipient account is not active" });
        }
      }
      
      const recipientFullName = recipientName || recipientUser?.name || 'Unknown';
      
      // Check for duplicate request FIRST using stable values only
      const idempotencyKey = generateIdempotencyKey(
        sessionUser.id, 
        fromAccountId, 
        amount, 
        String(toAccountId) // Use recipient account ID, not generated reference
      );
      
      // Check if already processed
      const { isDuplicate, previousResult } = checkIdempotency(idempotencyKey);
      if (isDuplicate && previousResult) {
        console.log('🔒 Returning cached internal transfer result (duplicate prevention)');
        return res.json(previousResult);
      }
      
      // Mark as in-progress to prevent concurrent processing
      if (!markTransferInProgress(idempotencyKey)) {
        console.log('🔒 Internal transfer already in progress, blocking concurrent request');
        return res.status(409).json({ message: "Transfer already being processed. Please wait." });
      }
      
      // Use try/finally to GUARANTEE in-progress marker is always cleared
      let transferSucceeded = false;
      let debitTransaction: any = null;
      let creditTransaction: any = null;
      let successResult: any = null;
      
      // Calculate values needed for restoration
      const recipientBalance = parseFloat(recipientAccount.balance);
      
      try {
        // Generate reference AFTER idempotency check
        const transactionRef = reference || `INT${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const paymentMethod = transferType === 'sepa' ? 'SEPA Transfer' : 'UK Transfer';
        
        // Get sender info for transactions
        const senderUser = await storage.getUserById(senderAccount.userId);
        const senderName = senderUser?.name || 'Unknown';
        
        // Calculate new balances
        const newSenderBalance = (senderBalance - numericAmount).toFixed(2);
        const newRecipientBalance = (recipientBalance + numericAmount).toFixed(2);

        // Step 1: Create debit transaction (no retry - not idempotent)
        console.log('💳 Creating debit transaction (sender)...');
        debitTransaction = await storage.createTransaction({
          accountId: fromAccountId,
          amount: `-${numericAmount.toFixed(2)}`,
          description: `Transfer to ${recipientFullName}`,
          category: "transfer",
          type: "debit",
          paymentMethod: paymentMethod,
          reference: transactionRef,
          recipientName: recipientFullName,
          recipientAccountNumber: recipientAccount.accountNumber,
          recipientSortCode: recipientAccount.sortCode,
          recipientIban: recipientAccount.iban,
          timestamp: new Date()
        });
        
        // Step 2: Create credit transaction (no retry - not idempotent)
        console.log('💳 Creating credit transaction (recipient)...');
        creditTransaction = await storage.createTransaction({
          accountId: toAccountId,
          amount: `+${numericAmount.toFixed(2)}`,
          description: `Transfer from ${senderName}`,
          category: "transfer",
          type: "credit",
          paymentMethod: paymentMethod,
          reference: transactionRef,
          recipientName: senderName,
          recipientAccountNumber: senderAccount.accountNumber,
          recipientSortCode: senderAccount.sortCode,
          recipientIban: senderAccount.iban,
          timestamp: new Date()
        });
        
        // Step 3: Update sender balance (with retry - idempotent)
        console.log('💳 Updating sender balance...');
        await withRetry(
          () => storage.updateAccountBalance(fromAccountId, newSenderBalance),
          { maxAttempts: 3, operationName: 'Update sender balance' }
        );
        
        // Step 4: Update recipient balance (with retry - idempotent)
        console.log('💳 Updating recipient balance...');
        await withRetry(
          () => storage.updateAccountBalance(toAccountId, newRecipientBalance),
          { maxAttempts: 3, operationName: 'Update recipient balance' }
        );
        
        // Prepare success result
        successResult = {
          success: true,
          message: "Internal transfer completed successfully",
          transaction: debitTransaction,
          reference: transactionRef,
          newBalance: newSenderBalance
        };
        
        // Record successful transfer for idempotency
        recordTransfer(idempotencyKey, successResult);
        
        // ONLY set transferSucceeded AFTER recordTransfer completes - ensures cleanup on any error
        transferSucceeded = true;
        
        console.log(`✅ Internal transfer completed: ${senderName} → ${recipientFullName}, Amount: ${numericAmount.toFixed(2)}`);
        
      } catch (error) {
        console.error('❌ Internal transfer failed:', error);
        // Attempt to restore balances if transactions were created
        if (debitTransaction || creditTransaction) {
          console.log('🔄 Attempting to restore balances...');
          try {
            await storage.updateAccountBalance(fromAccountId, senderBalance.toFixed(2));
            await storage.updateAccountBalance(toAccountId, recipientBalance.toFixed(2));
          } catch (restoreError) {
            console.error('⚠️ Failed to restore balances:', restoreError);
          }
        }
      } finally {
        // ALWAYS clear in-progress marker - this guarantees transfer never gets stuck
        if (!transferSucceeded) {
          clearTransferInProgress(idempotencyKey);
        }
      }
      
      // Return response outside try/finally
      if (transferSucceeded) {
        return res.json(successResult);
      } else {
        return res.status(500).json({ message: "Transfer failed. Please try again." });
      }
    } catch (error) {
      console.error('❌ Error processing internal transfer:', error);
      res.status(500).json({ message: "Transfer failed. Please try again." });
    }
  });

  // Get payees
  app.get("/api/payees/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const payees = await storage.getPayeesByUserId(userId);
      res.json(payees);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get scheduled payments
  app.get("/api/scheduled-payments/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const payments = await storage.getScheduledPaymentsByUserId(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send transfer confirmation email (called by frontend after processing transfer locally)
  app.post("/api/send-transfer-email", async (req, res) => {
    console.log('🔵 EMAIL API ENDPOINT CALLED - /api/send-transfer-email');
    console.log('🔵 Request body:', req.body);
    
    try {
      const emailSchema = z.object({
        userEmail: z.string().email(),
        senderName: z.string(),
        recipientName: z.string(),
        amount: z.string(),
        currency: z.string(),
        transactionReference: z.string(),
        accountInfo: z.string().optional(),
        transferData: z.any().optional(),
        userCurrency: z.enum(['EUR', 'GBP']).optional(),
        emailsEnabled: z.boolean().optional(),
        recipientEmail: z.union([z.string().email(), z.literal(''), z.undefined()]).optional()
      });
      
      const emailData = emailSchema.parse(req.body);
      console.log('🔵 Email data parsed:', emailData);
      
      // If emails are disabled, return success early (graceful skip)
      if (emailData.emailsEnabled === false) {
        console.log('📧 Emails disabled - skipping transfer confirmation email');
        return res.json({ success: true, message: "Email skipped (disabled in settings)", emailSkipped: true });
      }
      
      const confirmationDetails: TransferConfirmationDetails = {
        senderName: emailData.senderName,
        recipientName: emailData.recipientName,
        amount: emailData.amount,
        currency: emailData.currency,
        dateTime: new Date().toLocaleString('en-GB', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Europe/Dublin'
        }),
        transactionReference: emailData.transactionReference,
        transactionId: emailData.transferData?.id?.toString() || emailData.transactionReference,
        accountInfo: emailData.accountInfo || "Current Account"
      };
      
      // Send to user
      const success = await sendTransferConfirmation(
        emailData.userEmail, 
        confirmationDetails, 
        emailData.transferData, 
        emailData.userCurrency,
        true // Always true here since we checked above
      );
      
      // Also send to recipient if email provided
      let recipientSuccess = true;
      if (emailData.recipientEmail) {
        console.log('📧 Sending copy to recipient:', emailData.recipientEmail);
        recipientSuccess = await sendTransferConfirmation(
          emailData.recipientEmail, 
          confirmationDetails, 
          emailData.transferData, 
          emailData.userCurrency,
          true,
          true // isRecipient flag - sends minimal email with just PDF
        );
      }
      
      if (success && recipientSuccess) {
        res.json({ success: true, message: "Transfer confirmation email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send transfer confirmation email" });
      }
    } catch (error) {
      console.error('Transfer email error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Generate transfer confirmation PDF (without email)
  app.post("/api/generate-transfer-confirmation", async (req, res) => {
    try {
      const { transaction, senderName, accountInfo, userCurrency } = req.body;
      
      console.log('🔵 Generating transfer confirmation PDF for transaction:', transaction.id);
      
      const confirmationDetails: TransferConfirmationDetails = {
        senderName: senderName || 'Customer',
        recipientName: transaction.recipientName || 'Recipient',
        amount: transaction.amount.replace('-', ''),
        currency: userCurrency === 'GBP' ? '£' : '€',
        dateTime: new Date(transaction.timestamp).toLocaleString('en-GB', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Europe/Dublin'
        }),
        transactionReference: transaction.reference || transaction.id.toString(),
        transactionId: transaction.id.toString(),
        accountInfo: accountInfo || "Account"
      };
      
      const pdfBuffer = await generateTransferConfirmationPDF(
        confirmationDetails.senderName,
        confirmationDetails.recipientName,
        confirmationDetails.amount,
        confirmationDetails.currency,
        confirmationDetails.transactionReference,
        confirmationDetails.accountInfo,
        transaction,
        userCurrency
      );
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="TransferConfirmation-${transaction.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Transfer confirmation PDF generation error:', error);
      res.status(500).json({ success: false, message: "Failed to generate transfer confirmation" });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email, name, amount, recipient, currency } = req.body;
      
      const testDetails: TransferConfirmationDetails = {
        senderName: name || "Test User",
        recipientName: recipient || "John Smith",
        amount: amount || "250.00",
        currency: currency || "£",
        dateTime: new Date().toLocaleString('en-GB', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Europe/Dublin'
        }),
        transactionReference: `TXN${Date.now()}_TEST123`,
        transactionId: `TEST${Date.now()}`,
        accountInfo: "Current Account (1234)"
      };
      
      const success = await sendTransferConfirmation(email, testDetails);
      
      if (success) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test email" });
      }
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Get statements
  app.get("/api/statements/:accountId", async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const statements = await storage.getStatementsByAccountId(accountId);
      res.json(statements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PIN verification endpoint (separate from complex login flow)
  app.post("/api/auth/verify-pin", async (req, res) => {
    try {
      const verifySchema = z.object({
        customerNumber: z.string(),
        pin: z.string().min(4)
      });

      const { customerNumber, pin } = verifySchema.parse(req.body);
      
      // Find user by customer number and verify PIN
      const user = await storage.getUserByCredentials(customerNumber, pin);
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid customer number or PIN" 
        });
      }

      console.log(`✅ PIN VERIFICATION SUCCESSFUL: ${user.name} (${user.customerNumber})`);
      
      res.json({ 
        success: true,
        user: {
          id: user.id,
          customerNumber: user.customerNumber,
          name: user.name,
          email: user.email
        },
        message: "PIN verification successful" 
      });
    } catch (error) {
      console.error('PIN verification error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: error.errors[0].message 
        });
      }
      res.status(500).json({ 
        success: false,
        message: "PIN verification failed" 
      });
    }
  });

  // Create new user with PIN
  app.post("/api/users/create", async (req, res) => {
    try {
      const createUserSchema = z.object({
        customerNumber: z.string(),
        name: z.string(),
        email: z.string().email(),
        phone: z.string(),
        pin: z.string().length(4),
        address: z.string().optional(),
        dateOfBirth: z.string().optional(),
        joinDate: z.string().optional(),
        dateCreated: z.string().optional()
      });

      const userData = createUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByCustomerNumber(userData.customerNumber);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create user in database with proper date conversion
      const { dateCreated, address, dateOfBirth, joinDate, ...userDataCore } = userData;
      const newUser = await storage.createUser({
        ...userDataCore,
        address: address || '',
        dateOfBirth: dateOfBirth || '',
        joinDate: joinDate || new Date().toISOString(),
        isDisabled: false,
        dateCreated: dateCreated ? new Date(dateCreated) : new Date()
      });
      
      console.log(`✅ NEW USER CREATED: ${newUser.name} (${newUser.customerNumber}) with PIN: ${newUser.pin}`);
      
      res.status(201).json({ 
        success: true, 
        user: newUser,
        message: "User created successfully" 
      });
    } catch (error) {
      console.error('User creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get user profile
  app.get("/api/profile/:customerNumber", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      
      // Check if customer exists and is not soft-deleted
      const customer = await storage.getCustomerByCustomerNumber(customerNumber, true);
      
      if (!customer) {
        console.log(`🔒 CUSTOMER NOT FOUND: ${customerNumber}`);
        return res.status(404).json({ 
          message: "Account not found"
        });
      }
      
      if (customer.isDeleted) {
        console.log(`🔒 CUSTOMER SOFT-DELETED - PROFILE BLOCKED: ${customerNumber}`);
        // Return specific deletion status to trigger aggressive client-side blocking
        return res.status(410).json({ 
          message: "Account Deleted",
          accountDeleted: true,
          forceDisconnect: true,
          blockAllFunctions: true
        });
      }
      
      let user = await storage.getUserByCustomerNumber(customerNumber);
      
      // If user doesn't exist in in-memory storage, return 404
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user profile
  app.put("/api/profile/:customerNumber", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      
      // Check if customer exists in customers table (auto-logout if deleted)
      const customerExists = await checkCustomerExists(customerNumber);
      if (!customerExists) {
        console.log(`🔒 CUSTOMER DELETED - PROFILE BLOCKED: ${customerNumber}`);
        // Return specific deletion status to trigger aggressive client-side blocking
        return res.status(410).json({ 
          message: "Account Deleted",
          accountDeleted: true,
          forceDisconnect: true,
          blockAllFunctions: true
        });
      }
      
      const profileUpdateSchema = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        dateOfBirth: z.string().optional(),
        joinDate: z.string().optional(),
        currency: z.enum(['EUR', 'GBP']).optional()
      });
      
      const updates = profileUpdateSchema.parse(req.body);
      
      // First try to update existing user
      let updatedUser = await storage.updateUserProfile(customerNumber, updates);
      
      // If user doesn't exist, create them with the provided data
      if (!updatedUser) {
        const newUser = await storage.createUser({
          customerNumber,
          name: updates.name || "User",
          email: updates.email || "user@example.com",
          phone: updates.phone || "",
          address: updates.address || "",
          dateOfBirth: updates.dateOfBirth || "",
          pin: "000000", // Default PIN, user can change later
          joinDate: updates.joinDate || new Date().toISOString(),
          isDisabled: false
        });
        updatedUser = newUser;
      }

      // If email was updated, ensure it's synchronized across all user records
      if (updates.email && updatedUser) {
        try {
          // Verify the email was properly stored in the database
          const verificationUser = await storage.getUserByCustomerNumber(customerNumber);
          if (verificationUser && verificationUser.email === updates.email) {
            console.log(`✅ Email synchronized and verified for customer ${customerNumber}: ${updates.email}`);
          } else {
            console.error(`❌ Email synchronization failed for customer ${customerNumber}`);
          }
        } catch (emailSyncError) {
          console.error('Failed to synchronize email across systems:', emailSyncError);
        }
      }
      
      // Notify admin panel of profile update by logging the change
      console.log(`✅ Profile updated for customer ${customerNumber}:`, {
        name: updates.name,
        email: updates.email,
        dateOfBirth: updates.dateOfBirth
      });
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Profile update error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user location
  app.post("/api/user/location", async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const locationSchema = z.object({
        latitude: z.number(),
        longitude: z.number()
      });

      const { latitude, longitude } = locationSchema.parse(req.body);
      const customerNumber = req.session.user.customerNumber;

      // Update location in database
      await storage.updateUserLocation(customerNumber, latitude, longitude);

      console.log(`📍 Location updated for ${customerNumber}: ${latitude}, ${longitude}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Location update error:', error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Admin-only profile update endpoint with real-time propagation
  app.put("/api/admin/profile/:customerNumber", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      const adminUpdateSchema = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        dateOfBirth: z.string().optional(),
        joinDate: z.string().optional(),
        balance: z.string().optional(),
        sortCode: z.string().optional()
      });
      
      const updates = adminUpdateSchema.parse(req.body);
      
      // Update user profile in database
      let updatedUser = await storage.updateUserProfile(customerNumber, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return success with updated user data
      res.json({
        success: true,
        user: updatedUser,
        message: "Profile updated successfully by admin"
      });
    } catch (error) {
      console.error('Admin profile update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // OTC generation for new account creation
  app.post("/api/admin/generate-otc", async (req, res) => {
    try {
      const accountDataSchema = z.object({
        customerNumber: z.string(),
        name: z.string(),
        email: z.string().email(),
        phone: z.string()
      });

      const accountData = accountDataSchema.parse(req.body);

      // Naming the customer "admincustomer", "admincustomer1", … here (the
      // 5-taps-on-the-logo signup) routes the code to that team page instead of
      // the main panel. That page's cap applies, counting codes not yet used.
      const otcTeamPage = findTeamPageForName(accountData.name);
      if (otcTeamPage) {
        const inUse = await countTeamSlotsInUse(otcTeamPage);
        if (inUse >= otcTeamPage.limit) {
          return res.status(409).json({
            success: false,
            message: `${otcTeamPage.title} is full (${otcTeamPage.limit}). Delete one there first.`,
          });
        }
        teamAccountRegistry.add(accountData.customerNumber, otcTeamPage.slug);
      }

      // Generate OTC (no email sent - displayed in admin panel)
      const otc = await otcService.processNewAccount(accountData);
      
      // Log for security audit
      console.log(`OTC generated for admin panel account creation: ${accountData.customerNumber}`);
      
      res.json({ 
        success: true, 
        message: "OTC generated and displayed in admin panel",
        customerNumber: accountData.customerNumber,
        otc: otc
      });
    } catch (error) {
      console.error('OTC generation failed:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data format" });
      }
      res.status(500).json({ message: "Failed to generate OTC" });
    }
  });

  // Get all active OTC codes for admin panel display
  app.get("/api/admin/active-otcs", async (req, res) => {
    try {
      // Codes for accounts named "admincustomer" are routed to the Team Admin
      // page instead, so they're excluded here rather than showing in both.
      const activeOTCs = otcService.getAllActiveOTCs().filter((o) => {
        const name = o.accountData && o.accountData.name;
        return !isTeamCustomerName(name) && !teamAccountRegistry.has(o.customerNumber);
      });
      res.json({ otcs: activeOTCs });
    } catch (error) {
      console.error('Failed to retrieve active OTCs:', error);
      res.status(500).json({ message: "Failed to retrieve OTC codes" });
    }
  });

  // OTC validation endpoint
  app.post("/api/admin/validate-otc", async (req, res) => {
    try {
      const validationSchema = z.object({
        customerNumber: z.string(),
        code: z.string().length(6)
      });

      const { customerNumber, code } = validationSchema.parse(req.body);
      const validation = otcService.validateOTC(customerNumber, code);

      if (validation.isValid && validation.accountData) {
        // Create the user in the database with their actual data
        const userData = validation.accountData;

        // Accounts created under a team name belong to that Team Admin page.
        // Recorded now, at creation, so it sticks even if they rename
        // themselves in Personal Details later.
        const valTeamPage = findTeamPageForName(userData.name);
        if (valTeamPage) {
          teamAccountRegistry.add(userData.customerNumber, valTeamPage.slug);
        }

        try {
          // STEP 1: Create customer in PostgreSQL FIRST to get the ID
          let postgresCustomerId: number;
          try {
            const newCustomer = await storage.createCustomer({
              customerNumber: userData.customerNumber,
              name: userData.name,
              email: userData.email,
              phone: userData.phone || '',
              dateOfBirth: userData.dateOfBirth || '',
              joinDate: userData.joinDate || 'Member since 2018',
              currency: userData.currency || 'EUR'
            });
            postgresCustomerId = newCustomer.id;
            console.log(`📊 CUSTOMER ADDED TO DATABASE: ${newCustomer.name} (${newCustomer.customerNumber}) with ID: ${postgresCustomerId}`);
          } catch (customerError) {
            console.error('Failed to add customer to database:', customerError);
            throw new Error('Failed to create customer in database');
          }

          // STEP 2: Create user in memory using PostgreSQL customer ID (keeps IDs in sync)
          const newUser = await storage.createUser({
            customerNumber: userData.customerNumber,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            address: userData.address || "",
            dateOfBirth: userData.dateOfBirth || "",
            pin: "000000", // Default PIN
            joinDate: userData.joinDate || new Date().toISOString(),
            isDisabled: false
          }, postgresCustomerId);

          console.log(`✅ USER CREATED: ${newUser.name} (ID: ${newUser.id}, customerNumber: ${newUser.customerNumber})`);

          // Generate unique 8-digit account number (check database for uniqueness)
          const generateUniqueAccountNumber = async (): Promise<string> => {
            const existingAccounts = await storage.getAllAccounts();
            const existingNumbers = new Set(existingAccounts.map(a => a.accountNumber));
            
            let accountNum: string;
            let attempts = 0;
            do {
              // Generate random 8-digit number (10000000 to 99999999)
              accountNum = String(Math.floor(10000000 + Math.random() * 90000000));
              attempts++;
              if (attempts > 100) throw new Error('Could not generate unique account number');
            } while (existingNumbers.has(accountNum));
            
            return accountNum;
          };

          // Generate valid Irish IBAN using MOD-97 algorithm
          const generateIrishIBAN = (accountNum: string, sortCode: string): string => {
            // Bank of Ireland BIC identifier (first 4 chars)
            const bankId = 'BOFI';
            // Sort code without hyphens (6 digits)
            const sortCodeNum = sortCode.replace(/-/g, '');
            // BBAN = bank identifier + sort code + account number
            const bban = bankId + sortCodeNum + accountNum;
            
            // Calculate IBAN check digits using MOD-97
            // Move 'IE00' to end and convert letters to numbers (A=10, B=11, etc.)
            const rearranged = bban + 'IE00';
            let numStr = '';
            for (const char of rearranged) {
              if (char >= 'A' && char <= 'Z') {
                numStr += (char.charCodeAt(0) - 55).toString();
              } else {
                numStr += char;
              }
            }
            
            // Calculate MOD-97 on the numeric string
            let remainder = 0;
            for (let i = 0; i < numStr.length; i++) {
              remainder = (remainder * 10 + parseInt(numStr[i])) % 97;
            }
            const checkDigits = String(98 - remainder).padStart(2, '0');
            
            return 'IE' + checkDigits + bban;
          };

          const accountNumber = await generateUniqueAccountNumber();
          const sortCode = "90-78-68";
          const bic = "BOFIIE2D";
          const iban = generateIrishIBAN(accountNumber, sortCode);

          console.log(`🏦 Generated banking details: Account=${accountNumber}, IBAN=${iban}, BIC=${bic}`);

          // Create single current account for the new user
          const currentAccount = {
            userId: newUser.id,
            accountType: "current" as const,
            accountNumber: accountNumber,
            balance: "0.00",
            displayName: "Current Account",
            sortCode: sortCode,
            bic: bic,
            iban: iban
          };

          // Create the account in the database
          await storage.createAccount(currentAccount);

          console.log(`💳 Created Current Account for customer ${userData.customerNumber}`);

          console.log('User and accounts created in database:', newUser);

          // Set up session for OTC login (critical for auto-logout to work)
          (req as any).session.userId = newUser.id;
          (req as any).session.customerNumber = newUser.customerNumber;
          (req as any).session.user = { id: newUser.id, name: newUser.name, email: newUser.email, customerNumber: newUser.customerNumber };
          console.log(`🔐 SESSION CREATED FOR OTC USER: ${newUser.customerNumber} (userId: ${newUser.id})`);

          // Save session to persist userId
          (req as any).session.save((err: any) => {
            if (err) {
              console.error('Session save error:', err);
            }
            res.json({ 
              success: true, 
              message: "OTC validated successfully and account created",
              accountData: validation.accountData,
              user: newUser
            });
          });
        } catch (dbError) {
          console.error('Failed to create user in database:', dbError);
          res.status(500).json({ 
            success: false, 
            message: "OTC valid but failed to create account" 
          });
        }
      } else {
        res.status(400).json({ 
          success: false, 
          message: "Invalid or expired OTC code" 
        });
      }
    } catch (error) {
      console.error('OTC validation failed:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid validation data format" });
      }
      res.status(500).json({ message: "Failed to validate OTC" });
    }
  });

  // Security API endpoints for voice call confirmation
  app.post("/api/security/initiate-transfer", async (req, res) => {
    try {
      const securityRequestSchema = z.object({
        amount: z.string(),
        recipientName: z.string(),
        userPhoneNumber: z.string(),
        transferId: z.string(),
        transferType: z.enum(['UK', 'IBAN'])
      });

      const securityRequest = securityRequestSchema.parse(req.body);
      const result = await transferSecurityService.initiateTransferSecurity(securityRequest);

      if (result.success) {
        res.json({ success: true, callSid: result.callSid });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Security initiation failed:', error);
      res.status(500).json({ success: false, error: "Failed to initiate security call" });
    }
  });

  // TwiML endpoint for voice response
  app.get("/api/security/voice-response", (req, res) => {
    const transferId = req.query.transferId as string;
    const twimlResponse = transferSecurityService.generateVoiceResponse(transferId);
    
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);
  });

  // Handle user DTMF response
  app.post("/api/security/handle-response", async (req, res) => {
    try {
      const transferId = req.query.transferId as string;
      const digits = req.body.Digits;

      const result = await transferSecurityService.handleUserResponse(transferId, digits);
      
      let twimlResponse = '';
      if (result.action === 'confirmed') {
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Thank you. Your transfer has been confirmed and will be processed shortly.</Say>
            <Hangup/>
          </Response>`;
      } else {
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Your transfer has been cancelled for security. Contact customer service if this was not intended.</Say>
            <Hangup/>
          </Response>`;
      }

      res.set('Content-Type', 'text/xml');
      res.send(twimlResponse);
    } catch (error) {
      console.error('Failed to handle user response:', error);
      const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">An error occurred. Please contact customer service.</Say>
          <Hangup/>
        </Response>`;
      res.set('Content-Type', 'text/xml');
      res.send(errorResponse);
    }
  });

  // Check transfer confirmation status
  app.get("/api/security/status/:transferId", (req, res) => {
    const transferId = req.params.transferId;
    const isConfirmed = transferSecurityService.isTransferConfirmed(transferId);
    const status = transferSecurityService.getConfirmationStatus(transferId);
    
    res.json({ 
      transferId, 
      confirmed: isConfirmed, 
      status: status || null 
    });
  });

  // AI-powered live-chat reply. Returns { ok, text } when a reply was
  // generated, or { ok: false, fallback: true } when AI isn't configured /
  // failed — the client then uses its local rule-based engine instead, so the
  // chat always works even with no API key or no network.
  app.post("/api/chat/ai", async (req, res) => {
    try {
      if (!isAIChatEnabled()) {
        return res.json({ ok: false, fallback: true });
      }

      const aiSchema = z.object({
        message: z.string().min(1),
        agentName: z.string().optional(),
        history: z
          .array(z.object({ text: z.string(), isUser: z.boolean() }))
          .optional(),
        context: z.any().optional(),
      });

      const parsed = aiSchema.parse(req.body);
      const text = await generateAIChatReply({
        message: parsed.message,
        history: parsed.history || [],
        agentName: parsed.agentName || "Alex",
        context: parsed.context,
      });

      res.json({ ok: true, text });
    } catch (error) {
      // Any failure (bad key, rate limit, network) → let the client fall back
      // to the local engine rather than showing an error.
      console.error("AI chat reply failed, falling back to local engine:", error);
      res.json({ ok: false, fallback: true });
    }
  });

  // Chat API endpoints
  app.get("/api/chat/messages/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const messages = await storage.getChatMessagesBySessionId(sessionId);
      res.json(messages);
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      res.status(500).json({ message: "Failed to retrieve chat messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const messageSchema = z.object({
        sessionId: z.string(),
        text: z.string(),
        isUser: z.boolean(),
        userId: z.number().optional(),
        agentName: z.string().optional()
      });

      const messageData = messageSchema.parse(req.body);
      const message = await storage.createChatMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error('Failed to create chat message:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data" });
      }
      res.status(500).json({ message: "Failed to create chat message" });
    }
  });

  app.get("/api/chat/session/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getChatSession(sessionId);
      res.json(session);
    } catch (error) {
      console.error('Failed to get chat session:', error);
      res.status(500).json({ message: "Failed to retrieve chat session" });
    }
  });

  app.post("/api/chat/session", async (req, res) => {
    try {
      const sessionSchema = z.object({
        sessionId: z.string(),
        agentName: z.string(),
        userId: z.number().optional(),
        isActive: z.boolean().default(true)
      });

      const sessionData = sessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error('Failed to create chat session:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data" });
      }
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.post("/api/chat/session/:sessionId/end", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      await storage.endChatSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to end chat session:', error);
      res.status(500).json({ message: "Failed to end chat session" });
    }
  });

  app.get("/api/chat/responses", async (req, res) => {
    try {
      const responses = await storage.getChatResponses();
      res.json(responses);
    } catch (error) {
      console.error('Failed to get chat responses:', error);
      res.status(500).json({ message: "Failed to retrieve chat responses" });
    }
  });

  app.post("/api/chat/responses", async (req, res) => {
    try {
      const responseSchema = z.object({
        category: z.string(),
        triggers: z.array(z.string()),
        responses: z.array(z.string()),
        isActive: z.boolean().default(true)
      });

      const responseData = responseSchema.parse(req.body);
      const response = await storage.createChatResponse(responseData);
      res.json(response);
    } catch (error) {
      console.error('Failed to create chat response:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data" });
      }
      res.status(500).json({ message: "Failed to create chat response" });
    }
  });

  app.put("/api/chat/responses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateSchema = z.object({
        category: z.string().optional(),
        triggers: z.array(z.string()).optional(),
        responses: z.array(z.string()).optional(),
        isActive: z.boolean().optional()
      });

      const updates = updateSchema.parse(req.body);
      const response = await storage.updateChatResponse(id, updates);
      
      if (!response) {
        return res.status(404).json({ message: "Chat response not found" });
      }
      
      res.json(response);
    } catch (error) {
      console.error('Failed to update chat response:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data" });
      }
      res.status(500).json({ message: "Failed to update chat response" });
    }
  });

  app.delete("/api/chat/responses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChatResponse(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete chat response:', error);
      res.status(500).json({ message: "Failed to delete chat response" });
    }
  });

  // SECURE endpoint - get only the authenticated user's data
  app.get("/api/users/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      const user = await storage.getUserById(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Return only the authenticated user's data
      const userData = {
        customerNumber: user.customerNumber,
        name: user.name,
        email: user.email,
        phone: user.phone,
        currency: 'EUR',
        dateOfBirth: user.dateOfBirth,
        joinDate: user.joinDate
      };
      
      res.json({ success: true, user: userData });
    } catch (error) {
      console.error('Failed to get user data:', error);
      res.status(500).json({ success: false, message: "Failed to load user data" });
    }
  });

  // Admin API endpoints
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const { isUserDisabled } = await import('./userDisableManager');
      
      // Add disabled status to each user
      const usersWithStatus = users.map(user => ({
        ...user,
        isDisabled: isUserDisabled(user.id)
      }));
      
      res.json({ success: true, users: usersWithStatus });
    } catch (error) {
      console.error('Failed to get users:', error);
      res.status(500).json({ success: false, message: "Failed to load users" });
    }
  });

  app.get("/api/admin/device-sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllDeviceSessions();
      res.json({ success: true, sessions });
    } catch (error) {
      console.error('Failed to get device sessions:', error);
      res.status(500).json({ success: false, message: "Failed to load device sessions" });
    }
  });

  app.post("/api/admin/device-sessions/:sessionId/block", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.blockDeviceSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to block device:', error);
      res.status(500).json({ success: false, message: "Failed to block device" });
    }
  });

  app.post("/api/admin/device-sessions/:sessionId/unblock", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.unblockDeviceSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to unblock device:', error);
      res.status(500).json({ success: false, message: "Failed to unblock device" });
    }
  });

  app.post("/api/admin/device-sessions/:sessionId/panic-enable", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.enableDevicePanicMode(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to enable panic mode:', error);
      res.status(500).json({ success: false, message: "Failed to enable panic mode" });
    }
  });

  app.post("/api/admin/device-sessions/:sessionId/panic-disable", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.disableDevicePanicMode(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to disable panic mode:', error);
      res.status(500).json({ success: false, message: "Failed to disable panic mode" });
    }
  });

  app.post("/api/admin/users/:userId/disable", async (req, res) => {
    try {
      const { userId } = req.params;
      const { setUserDisabled } = await import('./userDisableManager');
      setUserDisabled(parseInt(userId), true);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to disable user:', error);
      res.status(500).json({ success: false, message: "Failed to disable user" });
    }
  });

  app.post("/api/admin/users/:userId/enable", async (req, res) => {
    try {
      const { userId } = req.params;
      const { setUserDisabled } = await import('./userDisableManager');
      setUserDisabled(parseInt(userId), false);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to enable user:', error);
      res.status(500).json({ success: false, message: "Failed to enable user" });
    }
  });

  // Clear a wrongly-locked account's device lock without restarting the server.
  // Accepts either a numeric userId or a customerNumber in the URL param.
  app.post("/api/admin/users/:userId/clear-device-lock", async (req, res) => {
    try {
      const { userId } = req.params;
      let numericUserId = parseInt(userId, 10);

      if (Number.isNaN(numericUserId)) {
        const user = await storage.getUserByCustomerNumber(userId);
        if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
        }
        numericUserId = user.id;
      }

      const cleared = removeUserDeviceSession(numericUserId);
      res.json({ success: true, cleared });
    } catch (error) {
      console.error('Failed to clear device lock:', error);
      res.status(500).json({ success: false, message: "Failed to clear device lock" });
    }
  });

  // User validation endpoint for login security
  app.get("/api/auth/validate/:customerNumber", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      
      // Check if user exists in database
      const user = await storage.getUser(customerNumber);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          exists: false, 
          message: "This account no longer exists." 
        });
      }

      // Check if user is disabled by admin
      const { isUserDisabled } = await import('./userDisableManager');
      if (isUserDisabled(user.id)) {
        return res.status(403).json({ 
          success: false, 
          exists: true, 
          disabled: true,
          message: "This account has been temporarily suspended." 
        });
      }

      // User exists and is active
      res.json({ 
        success: true, 
        exists: true, 
        disabled: false,
        user: {
          id: user.id,
          customerNumber: user.customerNumber,
          name: user.name
        }
      });
    } catch (error) {
      console.error('Failed to validate user:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to validate account status" 
      });
    }
  });

  // Bank Statement Generation API - Now accepts real transaction data and emails automatically
  app.post("/api/generate-statement", async (req, res) => {
    try {
      const statementSchema = z.object({
        accountId: z.union([z.string(), z.number()]).transform(val => String(val)),
        startDate: z.string(),
        endDate: z.string(),
        dateRange: z.string(),
        // Accept real user transactions from frontend
        userTransactions: z.array(z.object({
          id: z.union([z.string(), z.number()]),
          accountId: z.union([z.string(), z.number()]).transform(val => Number(val)),
          amount: z.string(),
          description: z.string(),
          category: z.string(),
          type: z.string(),
          reference: z.string().optional().nullable(),
          timestamp: z.string(),
          recipientName: z.string().optional().nullable(),
          paymentMethod: z.string().optional().nullable(),
          recipientAccountNumber: z.string().optional().nullable(),
          recipientSortCode: z.string().optional().nullable(),
          iban: z.string().optional().nullable(),
          bicCode: z.string().optional().nullable(),
          isSample: z.boolean().optional().nullable(),
          deleted: z.boolean().optional().nullable(),
          exchangeRate: z.union([z.string(), z.number()]).optional().nullable(),
          convertedAmount: z.union([z.string(), z.number()]).optional().nullable(),
          convertedCurrency: z.string().optional().nullable(),
          confirmationPdfData: z.string().optional().nullable()
        }).passthrough()).optional(),
        // Accept real user account data from frontend
        userAccounts: z.array(z.object({
          id: z.union([z.string(), z.number()]).transform(val => Number(val)),
          displayName: z.string(),
          accountNumber: z.string(),
          balance: z.string(),
          accountType: z.string(),
          sortCode: z.string().optional().nullable(),
          bic: z.string().optional().nullable(),
          iban: z.string().optional().nullable(),
          userId: z.number().optional().nullable()
        }).passthrough()).optional(),
        // User information for email delivery and address
        userEmail: z.string().email().optional(),
        customerName: z.string().optional(),
        userAddress: z.string().optional(),
        userCurrency: z.enum(['EUR', 'GBP']).optional(),
        emailsEnabled: z.boolean().optional()
      });

      const statementRequest = statementSchema.parse(req.body);
      const statementService = new StatementService();
      
      // Generate PDF statement with real transaction data
      const pdfBuffer = await statementService.generateStatement(statementRequest as any);
      
      // If user email provided and emails enabled, automatically send email
      const shouldSendEmail = statementRequest.userEmail && 
                              statementRequest.customerName && 
                              statementRequest.emailsEnabled !== false;
      
      if (shouldSendEmail) {
        try {
          // Find the selected account for email details
          const selectedAccount = statementRequest.userAccounts?.find(
            acc => String(acc.id) === statementRequest.accountId
          );
          
          const accountName = selectedAccount?.displayName || "Current Account";
          const statementPeriod = `${statementRequest.startDate} to ${statementRequest.endDate}`;
          
          console.log('🔵 Sending bank statement email automatically...');
          const emailSuccess = await sendBankStatement(
            statementRequest.userEmail!,
            statementRequest.customerName!,
            accountName,
            statementPeriod,
            pdfBuffer
          );
          
          if (emailSuccess) {
            console.log('✅ Bank statement email sent successfully');
          } else {
            console.log('⚠️ Bank statement email failed, but PDF still generated');
          }
        } catch (emailError) {
          console.error('Email sending error (non-blocking):', emailError);
          // Continue with PDF download even if email fails
        }
      } else if (statementRequest.emailsEnabled === false) {
        console.log('📧 Emails disabled - skipping bank statement email');
      }
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="BOI_Statement_${statementRequest.accountId}_${statementRequest.dateRange}.pdf"`);
      
      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Statement generation failed:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid statement request data" });
      }
      res.status(500).json({ message: "Failed to generate statement" });
    }
  });

  // Admin login endpoint - uses token instead of session
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (pin === "JohnDoe321!") {
        // Redirect with auth token in URL. The extra timestamp makes the
        // dashboard URL unique per login, so no browser/proxy cache can ever
        // serve a stale copy of the (fixed-URL, server-rendered) admin page.
        res.redirect(`/admin-oversight?auth=verified&v=${Date.now()}`);
      } else {
        res.redirect('/admin-oversight?error=invalid');
      }
    } catch (error) {
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  // Admin logout endpoint
  app.post("/api/admin/logout", async (req, res) => {
    req.session.adminAuthenticated = false;
    res.json({ success: true });
  });

  // Delete ALL customers (destructive, irreversible)
  app.delete("/api/admin/delete-all-customers", async (req, res) => {
    try {
      console.log('🚨 DELETE ALL CUSTOMERS INITIATED');
      
      // Get all customers and users
      const allCustomers = await storage.getAllCustomers(true); // Include soft-deleted
      const allUsers = await storage.getAllUsers();
      
      let customersDeleted = 0;
      let usersDeleted = 0;
      
      // Delete all customers from PostgreSQL
      for (const customer of allCustomers) {
        try {
          await storage.permanentlyEraseCustomer(customer.customerNumber);
          customersDeleted++;
        } catch (error) {
          console.error(`Failed to delete customer ${customer.customerNumber}:`, error);
        }
      }
      
      // Delete all users from Replit Database
      for (const user of allUsers) {
        try {
          await storage.deleteUser(user.customerNumber);
          usersDeleted++;
        } catch (error) {
          console.error(`Failed to delete user ${user.customerNumber}:`, error);
        }
      }
      
      console.log(`🔥 ALL CUSTOMERS DELETED - Customers: ${customersDeleted}, Users: ${usersDeleted}`);
      
      res.json({
        success: true,
        customersDeleted,
        usersDeleted,
        message: "All customers permanently deleted"
      });
    } catch (error) {
      console.error('Delete all customers failed:', error);
      res.status(500).json({ success: false, error: "Failed to delete all customers" });
    }
  });

  // ==========================================================================
  // TEAM ADMIN PAGES — separate, limited oversight pages for the other admins.
  //
  // One page per team name (see TEAM_PAGES): /team-admin holds 2 accounts,
  // /team-admin1 … /team-admin10 hold 1 each. A page only ever exposes accounts
  // bound to it, so real customers — and other pages' accounts — are invisible
  // and cannot be touched from here.
  // ==========================================================================

  /** Active (non-deleted) accounts bound to one page. */
  const getTeamCustomers = async (cfg: TeamPageConfig) => {
    const all = await storage.getAllCustomers(false);
    return all.filter((c) => {
      const slug = teamAccountRegistry.slugFor(c.customerNumber);
      if (slug) return slug === cfg.slug;
      // Not registered yet: bind it now if its name matches a page. Covers
      // accounts created before the registry existed.
      const page = findTeamPageForName(c.name);
      if (page) {
        teamAccountRegistry.add(c.customerNumber, page.slug);
        return page.slug === cfg.slug;
      }
      return false;
    });
  };

  /**
   * Codes generated for this page's accounts that don't exist as customers yet
   * — i.e. the 5-taps-on-the-logo signup, where the code comes first and the
   * account only exists once the code is entered.
   */
  const getPendingTeamOTCs = (cfg: TeamPageConfig) => {
    return otcService.getAllActiveOTCs().filter((o) => {
      const slug = teamAccountRegistry.slugFor(o.customerNumber);
      if (slug) return slug === cfg.slug;
      const page = findTeamPageForName(o.accountData && o.accountData.name);
      return !!page && page.slug === cfg.slug;
    });
  };

  /** Slots in use on a page = its accounts + its codes waiting to be used. */
  const countTeamSlotsInUse = async (cfg: TeamPageConfig) => {
    const customers = await getTeamCustomers(cfg);
    const taken = new Set(customers.map((c) => c.customerNumber));
    getPendingTeamOTCs(cfg).forEach((o) => taken.add(o.customerNumber));
    return taken.size;
  };

  /** Guard: resolve a customer, but only if it belongs to THIS page. */
  const getTeamCustomerOr404 = async (cfg: TeamPageConfig, customerNumber: string, res: any) => {
    const customer = await storage.getCustomerByCustomerNumber(customerNumber, true);
    if (customer) {
      const slug = teamAccountRegistry.slugFor(customer.customerNumber)
        || (findTeamPageForName(customer.name) || { slug: null }).slug;
      if (slug === cfg.slug) return customer;
    }
    res.status(404).json({ success: false, message: "That account isn't managed from this page." });
    return null;
  };

  // Build the identical set of routes for every team page.
  TEAM_PAGES.forEach((cfg) => {
    app.get(`/${cfg.slug}`, async (req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      const isAuthenticated = req.query.auth === 'verified';
      const hasError = req.query.error === 'invalid';
      if (!isAuthenticated) {
        return res.send(renderTeamAdminLoginPage(cfg, hasError));
      }
      res.send(renderTeamAdminDashboardPage(cfg));
    });

    app.post(`/api/${cfg.slug}/login`, async (req, res) => {
      try {
        const { pin } = req.body || {};
        if (pin === getTeamAdminPin(cfg)) {
          res.redirect(`/${cfg.slug}?auth=verified&v=${Date.now()}`);
        } else {
          res.redirect(`/${cfg.slug}?error=invalid`);
        }
      } catch (error) {
        res.status(500).json({ success: false, error: "Login failed" });
      }
    });

    app.post(`/api/${cfg.slug}/logout`, async (_req, res) => {
      res.json({ success: true });
    });

    // This page's accounts plus any active login code for each.
    app.get(`/api/${cfg.slug}/data`, async (_req, res) => {
      try {
        const customers = await getTeamCustomers(cfg);
        const activeOTCs = otcService.getAllActiveOTCs();

        const payload = customers.map((c) => {
          const otc = activeOTCs.find((o) => o.customerNumber === c.customerNumber);
          let created = '';
          try {
            created = c.createdAt
              ? new Date(c.createdAt as any).toLocaleDateString('en-IE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
              : '';
          } catch { /* leave blank */ }

          return {
            customerNumber: c.customerNumber,
            name: c.name,
            adminAlias: c.adminAlias || '',
            created,
            pending: false,
            otc: otc ? { code: otc.code, timeRemaining: otc.timeRemaining } : null,
          };
        });

        // Codes from the 5-tap signup, where the account doesn't exist yet.
        const existing = new Set(customers.map((c) => c.customerNumber));
        const pending = getPendingTeamOTCs(cfg)
          .filter((o) => !existing.has(o.customerNumber))
          .map((o) => ({
            customerNumber: o.customerNumber,
            name: (o.accountData && o.accountData.name) || cfg.customerName,
            adminAlias: '',
            created: '',
            pending: true,
            otc: { code: o.code, timeRemaining: o.timeRemaining },
          }));

        res.json({
          success: true,
          limit: cfg.limit,
          customers: pending.concat(payload as any),
        });
      } catch (error) {
        console.error(`${cfg.slug} data failed:`, error);
        res.status(500).json({ success: false, message: "Failed to load accounts" });
      }
    });

    // Permanently delete one of this page's accounts, freeing the slot.
    app.delete(`/api/${cfg.slug}/customers/:customerNumber`, async (req, res) => {
      try {
        const { customerNumber } = req.params;
        const customer = await getTeamCustomerOr404(cfg, customerNumber, res);
        if (!customer) return;

        // Same one-step permanent erase the main Admin Oversight page uses, so
        // it works whether the account is active or already soft-deleted.
        const result = await storage.permanentlyEraseCustomer(customerNumber);
        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: result.detail
              ? `Failed to permanently erase account: ${result.detail}`
              : "Failed to permanently erase account",
          });
        }

        // Safety: also drop the in-memory/JSON user if anything is still present.
        try { await storage.deleteUser(customerNumber); } catch { /* best effort */ }

        // Clear the registry entry AND any pending login code, otherwise a
        // still-valid code would leave the account showing as "waiting" here
        // after it's been deleted.
        teamAccountRegistry.remove(customerNumber);
        otcService.clearOTC(customerNumber);

        console.log(`🔥 ${cfg.slug} PERMANENTLY ERASED: ${customerNumber}`);
        res.json({
          success: true,
          message: "Account permanently erased",
          customerNumber,
          forceDisconnect: true, // Trigger complete PWA wipe on their device
          logout: true,
        });
      } catch (error) {
        console.error(`${cfg.slug} delete failed:`, error);
        res.status(500).json({ success: false, message: "Failed to delete the account" });
      }
    });

    // Fresh login code for one of this page's existing accounts.
    app.post(`/api/${cfg.slug}/customers/:customerNumber/otc`, async (req, res) => {
      try {
        const { customerNumber } = req.params;
        const customer = await getTeamCustomerOr404(cfg, customerNumber, res);
        if (!customer) return;

        const otc = await otcService.processNewAccount({
          customerNumber,
          name: customer.name,
          email: customer.email || `${customerNumber}@training.local`,
          phone: customer.phone || '',
        });
        res.json({ success: true, otc });
      } catch (error) {
        console.error(`${cfg.slug} OTC failed:`, error);
        res.status(500).json({ success: false, message: "Failed to generate a code" });
      }
    });
  });

  // Which environment and database this page is reading. Lets an admin tell at
  // a glance whether they're looking at development or production data — the
  // reason the two can show different customer counts.
  app.get("/api/admin/environment", async (_req, res) => {
    try {
      const { environmentName, databaseFingerprint, isSharingProductionDatabase } =
        await import('./environment');
      res.json({
        environment: environmentName(),
        database: databaseFingerprint(),
        sharingProductionDatabase: isSharingProductionDatabase(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to read environment" });
    }
  });

  // Admin Oversight - iPhone Optimized
  app.get("/admin-oversight", async (req, res) => {
    // Never cache the admin page (browser or PWA), so a redeploy is always
    // visible immediately instead of showing a stale cached version.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const isAuthenticated = req.query.auth === 'verified';
    const hasError = req.query.error === 'invalid';
    if (!isAuthenticated) {
      return res.send(renderAdminLoginPage(hasError));
    }
    res.send(renderAdminDashboardPage());
  });

  // API endpoint to get all customers (including soft-deleted for admin UI)
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers(true); // Include soft-deleted
      
      // Fetch account data for each customer
      const customersWithAccounts = await Promise.all(
        customers.map(async (customer: any) => {
          try {
            // Get user by customer number to get userId
            const user = await storage.getUser(customer.customerNumber);
            if (user) {
              const accounts = await storage.getAccountsByUserId(user.id);
              return {
                ...customer,
                accounts: accounts.map(acc => ({
                  accountNumber: acc.accountNumber,
                  sortCode: acc.sortCode,
                  bic: acc.bic,
                  iban: acc.iban,
                  balance: acc.balance,
                  accountType: acc.accountType,
                  displayName: acc.displayName
                }))
              };
            }
            return { ...customer, accounts: [] };
          } catch (e) {
            return { ...customer, accounts: [] };
          }
        })
      );
      
      res.json(customersWithAccounts);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      // Surface the real reason (e.g. a missing DATABASE_URL or an unreachable
      // database) so the admin page can show what actually needs fixing
      // instead of a dead-end "could not load".
      res.status(500).json({
        message: error?.message
          ? `Failed to fetch customers: ${error.message}`
          : "Failed to fetch customers",
      });
    }
  });

  // API endpoint to check if a customer exists (and their deletion status)
  app.get("/api/customers/:customerNumber/exists", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      
      // Check for permanently deleted (customer record doesn't exist at all)
      const customerIncludingDeleted = await storage.getCustomerByCustomerNumber(customerNumber, true);
      
      if (!customerIncludingDeleted) {
        // Permanently deleted - no record exists
        return res.status(410).json({
          exists: false,
          isDeleted: true,
          permanentlyDeleted: true,
          customerNumber
        });
      }
      
      // Check if soft-deleted
      if (customerIncludingDeleted.isDeleted) {
        return res.json({
          exists: false,
          isDeleted: true,
          permanentlyDeleted: false,
          customerNumber
        });
      }
      
      // Customer exists and is active
      res.json({
        exists: true,
        isDeleted: false,
        permanentlyDeleted: false,
        customerNumber
      });
    } catch (error) {
      console.error('Error checking customer existence:', error);
      res.status(500).json({ 
        exists: true, // Fail-safe: assume exists on error
        isDeleted: false,
        error: "Failed to check customer status" 
      });
    }
  });

  // API endpoint to SOFT-DELETE a customer (safe, reversible)
  app.delete("/api/customers/:customerNumber", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      const { reason } = req.body;
      
      // Get customer data before deletion for response
      const customer = await storage.getCustomerByCustomerNumber(customerNumber);
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: "Customer not found" 
        });
      }
      
      // Atomic soft-delete operation in PostgreSQL
      const deleted = await storage.deleteCustomer(customerNumber, reason);
      
      if (deleted) {
        console.log(`🗑️  CUSTOMER SOFT-DELETED IN POSTGRESQL: ${customerNumber} - Reason: ${reason || 'Deleted by admin'}`);

        // A soft-deleted account drops off the Team Admin page automatically
        // (it lists non-deleted customers), but a still-valid login code would
        // keep it showing there as "waiting" — so clear that too.
        otcService.clearOTC(customerNumber);

        // Get user info BEFORE deletion for cleanup
        const user = await storage.getUser(customerNumber);
        
        // Remove device sessions
        if (user) {
          const { removeDeviceSession } = await import('./deviceSessions');
          removeDeviceSession(user.id.toString());
        }
        
        // Invalidate all sessions for this customer
        const { invalidateAllUserSessions } = await import('./sessionManager');
        invalidateAllUserSessions(customerNumber);
        
        // CRITICAL: Delete user from BOTH tables to keep them in sync
        // This prevents mismatches between users table (memory) and customers table (PostgreSQL)
        const userDeleted = await storage.deleteUser(customerNumber);
        if (userDeleted) {
          console.log(`🗑️  USER DELETED FROM MEMORY: ${customerNumber}`);
        }
        
        res.json({ 
          success: true, 
          message: "Customer soft-deleted successfully",
          customerNumber: customer.customerNumber,
          name: customer.name
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "Customer not found" 
        });
      }
    } catch (error) {
      console.error('Error soft-deleting customer:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete customer" 
      });
    }
  });

  // API endpoint to PERMANENTLY ERASE a customer (destructive, irreversible)
  app.delete("/api/customers/:customerNumber/permanent", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      
      const customer = await storage.getCustomerByCustomerNumber(customerNumber, true);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      // One-step permanent erase — no longer requires a soft-delete first, so it
      // always works whether the customer is active or already in the Deleted tab.
      const result = await storage.permanentlyEraseCustomer(customerNumber);

      if (result.success) {
        // Safety: also drop the in-memory/JSON user if anything is still present.
        try { await storage.deleteUser(customerNumber); } catch {}

        // If this was a team account, clear it off the Team Admin page too.
        teamAccountRegistry.remove(customerNumber);
        otcService.clearOTC(customerNumber);

        console.log(`🔥 CUSTOMER PERMANENTLY ERASED: ${customerNumber}`);
        res.json({
          success: true,
          message: "Customer permanently erased",
          customerNumber: customerNumber,
          name: customer.name,
          forceDisconnect: true, // Trigger complete PWA wipe
          logout: true // Force logout
        });
      } else {
        // Surface the real reason so the admin knows what actually failed.
        res.status(500).json({
          success: false,
          message: result.detail
            ? `Failed to permanently erase customer: ${result.detail}`
            : "Failed to permanently erase customer"
        });
      }
    } catch (error: any) {
      console.error('Error permanently erasing customer:', error);
      res.status(500).json({
        success: false,
        message: `Failed to permanently erase customer: ${error?.message || 'unknown error'}`
      });
    }
  });

  // API endpoint to RESTORE a soft-deleted customer
  app.post("/api/customers/:customerNumber/restore", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      
      // Restore customer in PostgreSQL (sets isDeleted = false)
      const restored = await storage.restoreCustomer(customerNumber);
      
      if (restored) {
        console.log(`♻️  CUSTOMER RESTORED IN POSTGRESQL: ${customerNumber}`);
        
        // CRITICAL: Recreate user in BOTH tables to keep them in sync
        // User was deleted from memory during soft-delete, so we must recreate it
        const customer = await storage.getCustomerByCustomerNumber(customerNumber);
        if (customer) {
          const user = await storage.getUser(customerNumber);
          if (!user) {
            // User doesn't exist in memory - recreate it (this is expected after soft-delete)
            const newUser: InsertUser = {
              customerNumber: customer.customerNumber,
              pin: '', // PIN not stored in PostgreSQL - user will need to reset on next login
              name: customer.name,
              email: customer.email,
              phone: customer.phone || '',
              dateOfBirth: customer.dateOfBirth || '',
              address: '',
              joinDate: customer.joinDate,
              isDisabled: false
            };
            
            // Use original user ID if available (for session continuity), otherwise use PostgreSQL ID
            const restoreUserId = customer.originalUserId || customer.id;
            const createdUser = await storage.createUser(newUser, restoreUserId);
            if (createdUser) {
              console.log(`♻️  USER RECREATED IN MEMORY with original ID ${createdUser.id}: ${customerNumber}`);
            }
          } else {
            // User somehow still exists - just re-enable them
            await storage.enableUser(user.id);
            console.log(`♻️  USER RE-ENABLED IN MEMORY: ${customerNumber}`);
          }
        }
        
        res.json({ 
          success: true, 
          message: "Customer restored successfully",
          customerNumber: customer?.customerNumber,
          name: customer?.name
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "Customer not found" 
        });
      }
    } catch (error) {
      console.error('Error restoring customer:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to restore customer" 
      });
    }
  });

  // Update customer location
  app.post("/api/customers/update-location", async (req, res) => {
    try {
      const { customerNumber, latitude, longitude } = req.body;
      
      if (!customerNumber || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }
      
      const updated = await storage.updateCustomerLocation(customerNumber, latitude, longitude);
      
      if (updated) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: "Customer not found" });
      }
    } catch (error) {
      console.error('Error updating customer location:', error);
      res.status(500).json({ success: false, message: "Failed to update location" });
    }
  });

  // Set notifications flag for a user
  app.post("/api/set-notifications-flag", async (req, res) => {
    try {
      const { userId, notifications_enabled } = req.body;
      
      if (!userId || typeof notifications_enabled !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          message: "userId and notifications_enabled (boolean) are required" 
        });
      }
      
      // Update customer notification preference in database
      const updated = await storage.updateCustomer(userId, {
        notificationsEnabled: notifications_enabled
      });
      
      if (updated) {
        console.log(`Notifications ${notifications_enabled ? 'enabled' : 'disabled'} for user ${userId}`);
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: "User not found" });
      }
    } catch (error) {
      console.error('Error setting notifications flag:', error);
      res.status(500).json({ success: false, message: "Failed to update notification preference" });
    }
  });

  // Flag account for notification violation (attempted login without notifications) - NO DELETION
  app.post("/api/customers/notification-violation", async (req, res) => {
    try {
      const { customerNumber } = req.body;
      
      if (!customerNumber) {
        return res.status(400).json({ 
          success: false, 
          message: "Customer number required" 
        });
      }
      
      // Get current customer
      const customer = await storage.getCustomerByCustomerNumber(customerNumber);
      
      if (!customer) {
        // Customer doesn't exist in database - this is fine, just log it
        console.log(`⚠️ NOTIFICATION VIOLATION ATTEMPT: Unknown customer ${customerNumber} tried to login without notifications`);
        return res.json({ success: true, message: "Violation logged" });
      }
      
      // Flag the account for notification violation - DO NOT DELETE
      const flagged = await storage.updateCustomer(customerNumber, {
        notificationViolationFlagged: true,
        notificationViolationAt: new Date()
      });
      
      if (flagged) {
        console.log(`🚨 NOTIFICATION VIOLATION: Customer ${customerNumber} (${customer.name}) attempted login without notifications - FLAGGED FOR REVIEW (account NOT deleted)`);
        
        res.json({ 
          success: true, 
          message: "Account flagged for review - notification violation",
          flagged: true
        });
      } else {
        res.status(500).json({ success: false, message: "Failed to flag account" });
      }
    } catch (error) {
      console.error('Error flagging notification violation:', error);
      res.status(500).json({ success: false, message: "Failed to process violation" });
    }
  });

  // Track profile page clicks
  app.post("/api/customers/track-profile-click", async (req, res) => {
    try {
      const { customerNumber } = req.body;
      
      if (!customerNumber) {
        return res.status(400).json({ 
          success: false, 
          message: "Customer number required" 
        });
      }
      
      // Get current customer
      const customer = await storage.getCustomerByCustomerNumber(customerNumber);
      
      if (!customer) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }
      
      // Get existing click history or initialize empty array
      let clickHistory: string[] = [];
      if (customer.profileClickHistory && Array.isArray(customer.profileClickHistory)) {
        clickHistory = customer.profileClickHistory as string[];
      }
      
      // Add current timestamp to the beginning
      clickHistory.unshift(new Date().toISOString());
      
      // Keep only last 3 clicks
      clickHistory = clickHistory.slice(0, 3);
      
      // Update customer with new click history
      const updated = await storage.updateCustomer(customerNumber, {
        profileClickHistory: clickHistory
      });
      
      if (updated) {
        res.json({ success: true, clickHistory });
      } else {
        res.status(500).json({ success: false, message: "Failed to update click history" });
      }
    } catch (error) {
      console.error('Error tracking profile click:', error);
      res.status(500).json({ success: false, message: "Failed to track click" });
    }
  });

  // Update admin-specific fields for a customer
  app.patch("/api/customers/:customerNumber/admin", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      const { adminAlias, adminPhone, appReplacement } = req.body;
      
      const updates: any = {};
      if (adminAlias !== undefined) updates.adminAlias = adminAlias;
      if (adminPhone !== undefined) updates.adminPhone = adminPhone;
      if (appReplacement !== undefined) {
        // Validate appReplacement is between 0-5
        const val = parseInt(appReplacement);
        if (val >= 0 && val <= 5) {
          updates.appReplacement = val;
        } else {
          return res.status(400).json({ 
            success: false, 
            message: "App replacement must be between 0-5" 
          });
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No valid updates provided" 
        });
      }
      
      const updated = await storage.updateCustomer(customerNumber, updates);
      
      if (updated) {
        res.json({ 
          success: true, 
          customer: updated 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "Customer not found" 
        });
      }
    } catch (error) {
      console.error('Error updating customer admin fields:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update customer" 
      });
    }
  });

  // Admin endpoint to check and sync users and customers tables
  app.get("/api/admin/check-sync", async (req, res) => {
    try {
      // Get all users from memory
      const allUsers = await storage.getAllUsers();
      const userCustomerNumbers = allUsers.map(u => u.customerNumber).sort();
      
      // Get all active customers from PostgreSQL  
      const allCustomers = await storage.getAllCustomers(false); // Only active
      const customerNumbers = allCustomers.map(c => c.customerNumber).sort();
      
      // Find mismatches
      const usersNotInCustomers = userCustomerNumbers.filter(u => !customerNumbers.includes(u));
      const customersNotInUsers = customerNumbers.filter(c => !userCustomerNumbers.includes(c));
      
      res.json({
        totalUsers: allUsers.length,
        totalCustomers: allCustomers.length,
        usersNotInCustomers: usersNotInCustomers.length > 0 ? usersNotInCustomers : [],
        customersNotInUsers: customersNotInUsers.length > 0 ? customersNotInUsers : [],
        inSync: usersNotInCustomers.length === 0 && customersNotInUsers.length === 0
      });
    } catch (error) {
      console.error('Error checking sync:', error);
      res.status(500).json({ message: "Failed to check sync" });
    }
  });

  // Admin endpoint to restore users from memory to PostgreSQL
  app.post("/api/admin/restore-to-postgres", async (req, res) => {
    try {
      // Get all users from memory
      const allUsers = await storage.getAllUsers();
      
      // Get all active customers from PostgreSQL
      const allCustomers = await storage.getAllCustomers(false);
      const customerNumbers = allCustomers.map(c => c.customerNumber);
      
      // Find users that don't have customer records
      const usersToMigrate = allUsers.filter(u => !customerNumbers.includes(u.customerNumber));
      
      // Create customer records for each user
      let migrated = 0;
      const migratedCustomers = [];
      
      for (const user of usersToMigrate) {
        try {
          const newCustomer = await storage.createCustomer({
            customerNumber: user.customerNumber,
            name: user.name,
            email: user.email,
            joinDate: new Date().toISOString().split('T')[0], // Set to today's date
            currency: 'EUR',
            adminAlias: null,
            appReplacement: 0
          });
          migrated++;
          migratedCustomers.push({
            customerNumber: newCustomer.customerNumber,
            name: newCustomer.name
          });
          console.log(`✅ Migrated user to PostgreSQL: ${user.customerNumber} (${user.name})`);
        } catch (error) {
          console.error(`❌ Failed to migrate user ${user.customerNumber}:`, error);
        }
      }
      
      res.json({
        success: true,
        usersMigrated: migrated,
        totalUsers: allUsers.length,
        migratedCustomers: migratedCustomers
      });
    } catch (error) {
      console.error('Error restoring to PostgreSQL:', error);
      res.status(500).json({ message: "Failed to restore to PostgreSQL" });
    }
  });

  // Admin endpoint to fix sync by removing orphaned users
  app.post("/api/admin/fix-sync", async (req, res) => {
    try {
      // Get all users from memory
      const allUsers = await storage.getAllUsers();
      
      // Get all active customers from PostgreSQL
      const allCustomers = await storage.getAllCustomers(false);
      const customerNumbers = allCustomers.map(c => c.customerNumber);
      
      // Find orphaned users (users without corresponding customers)
      const orphanedUsers = allUsers.filter(u => !customerNumbers.includes(u.customerNumber));
      
      // Delete orphaned users
      let deleted = 0;
      for (const user of orphanedUsers) {
        const success = await storage.deleteUser(user.customerNumber);
        if (success) {
          deleted++;
          console.log(`🗑️  Removed orphaned user: ${user.customerNumber} (${user.name})`);
        }
      }
      
      res.json({
        success: true,
        orphanedUsersRemoved: deleted,
        removedUsers: orphanedUsers.map(u => ({ 
          customerNumber: u.customerNumber, 
          name: u.name 
        }))
      });
    } catch (error) {
      console.error('Error fixing sync:', error);
      res.status(500).json({ message: "Failed to fix sync" });
    }
  });

  const httpServer = createServer(app);
  
  // Check sync between users and customers on startup
  (async () => {
    try {
      const allUsers = await storage.getAllUsers();
      const allCustomers = await storage.getAllCustomers(false);
      const userCustomerNumbers = allUsers.map(u => u.customerNumber).sort();
      const customerNumbers = allCustomers.map(c => c.customerNumber).sort();
      
      const usersNotInCustomers = userCustomerNumbers.filter(u => !customerNumbers.includes(u));
      const customersNotInUsers = customerNumbers.filter(c => !userCustomerNumbers.includes(c));
      
      if (usersNotInCustomers.length > 0 || customersNotInUsers.length > 0) {
        console.log('\n⚠️  SYNC CHECK: Users and Customers tables are OUT OF SYNC');
        console.log(`   Total users: ${allUsers.length}, Total customers: ${allCustomers.length}`);
        
        if (usersNotInCustomers.length > 0) {
          console.log(`   🔴 ${usersNotInCustomers.length} users WITHOUT matching customers:`);
          for (const cn of usersNotInCustomers) {
            const user = allUsers.find(u => u.customerNumber === cn);
            console.log(`      - ${cn} (${user?.name || 'Unknown'})`);
          }
        }
        
        if (customersNotInUsers.length > 0) {
          console.log(`   🔴 ${customersNotInUsers.length} customers WITHOUT matching users:`);
          for (const cn of customersNotInUsers) {
            const customer = allCustomers.find(c => c.customerNumber === cn);
            console.log(`      - ${cn} (${customer?.name || 'Unknown'})`);
          }
        }
        
        console.log('   💡 Run POST /api/admin/fix-sync to remove orphaned users\n');
      } else {
        console.log(`✅ SYNC CHECK: All ${allUsers.length} users match ${allCustomers.length} customers\n`);
      }
    } catch (error) {
      console.error('Error checking sync:', error);
    }
  })();
  
  return httpServer;
}
