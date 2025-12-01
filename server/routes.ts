import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, transferSchema, type InsertUser } from "@shared/schema";
import { z } from "zod";
import { otcService } from "./otcService";
import { transferSecurityService } from "./security/transferSecurity";
import { generateChatResponse } from "./openai";
import { isDeviceBlocked, addDeviceSession, isDeviceInPanicMode, isCustomerInPanicMode } from "./deviceSessions";
import { isAccountActiveOnOtherDevice, setUserDeviceSession, removeUserDeviceSession, getUserDeviceSession, isCurrentDeviceAuthorized } from "./deviceExclusiveAuth";
import { addUserSession, removeUserSession, sessionTrackingMiddleware, isSessionValid } from "./sessionManager";
import { sendTransferConfirmation, sendBankStatement, type TransferConfirmationDetails } from "./emailService";
import { generateTransferConfirmationPDF } from "./pdfService";
import { StatementService } from "./statementService";
import Database from "@replit/database";

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
  console.log("Found " + existingUsers.length + " existing users in database");

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
    
    // Generate start_url with access code if present
    const startUrl = accessCode ? `/?access=${accessCode}` : '/';
    
    // Log for debugging
    console.log("Manifest requested - Access code: " + (accessCode || "none") + ", Start URL: " + startUrl);
    
    const manifest = {
      "name": "BOI Mobile",
      "short_name": "BOI Mobile", 
      "description": "BOI Mobile Banking Application",
      "start_url": startUrl,
      "display": "standalone",
      "orientation": "portrait-primary",
      "theme_color": "#0047ab",
      "background_color": "#ffffff",
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
        console.log("[REVOKED] NUCLEAR REVOCATION CHECK: " + accessCode + " is PERMANENTLY REVOKED");
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
      const customerNumber = (req.session as any).customerNumber;
      
      // Try to get user info from session (either userId or customerNumber)
      if (userId || customerNumber) {
        try {
          let user;
          if (userId) {
            user = await storage.getUserById(userId);
          } else if (customerNumber) {
            user = await storage.getUserByCustomerNumber(customerNumber);
          }
          
          if (user) {
            // Check if customer was explicitly deleted (soft-delete check)
            // Only logout if we're 100% certain they're deleted, not if database has issues
            try {
              const customerExists = await checkCustomerExists(user.customerNumber);
              if (!customerExists) {
                console.log("[LOCK] CUSTOMER DELETED - FORCING LOGOUT VIA HEARTBEAT: " + user.customerNumber);
                
                // Destroy session and force logout
                return new Promise((resolve) => {
                  req.session.destroy((err) => {
                    if (err) console.error('Session destruction error:', err);
                    res.status(401).json({ 
                      status: "customer_deleted",
                      message: "Account access has been revoked",
                      logout: true,
                      forceDisconnect: true,
                      clearStorage: true
                    });
                    resolve(undefined);
                  });
                });
              }
            } catch (dbError) {
              // CRITICAL: If database check fails, DON'T logout the user
              // This prevents false logouts due to temporary database issues
              console.warn(`⚠️ Database check failed for ${user.customerNumber}, keeping session active:`, dbError);
              // Continue to success response - keep user logged in
            }
          }
        } catch (error) {
          // If we can't get user info, keep session alive (don't force logout)
          console.error('Heartbeat user lookup error:', error);
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

      // Check permanent blacklist - codes that can never be used again
      const blacklistData = await db.get('permanent_blacklist');
      const pwaBlacklistData = await db.get('pwa_blacklist');
      const blacklist = processBlacklist(blacklistData);
      const pwaBlacklist = processBlacklist(pwaBlacklistData);
      const isBlacklisted = blacklist.includes(code) || pwaBlacklist.includes(code);
      
      if (isBlacklisted) {
        console.log("[BLOCK] BLACKLISTED CODE ATTEMPT: " + code + " - PERMANENTLY DENIED");
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

      console.log("Access granted for " + code + " - iOS: " + isIOS + ", Usage: iOS=" + codeInfo.usageCount.ios + "/" + codeInfo.deviceLimits.ios + ", Non-iOS=" + (codeInfo.usageCount.android + codeInfo.usageCount.other) + "/" + (codeInfo.deviceLimits.android + codeInfo.deviceLimits.other));

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
        console.error("[WARN] INVALID CUSTOMER NUMBER FORMAT: " + customerNumber + " (must be 8 digits)");
        return false;
      }

      // 1. Check user exists in memory (users table)
      const user = await storage.getUserByCustomerNumber(customerNumber);
      if (!user) {
        console.log("[ERR] USER NOT FOUND IN MEMORY: " + customerNumber);
        return false; // User doesn't exist in memory
      }

      // 2. Check customer exists in PostgreSQL (customers table)
      const customer = await storage.getCustomerByCustomerNumber(customerNumber);
      if (!customer) {
        console.log("[ERR] CUSTOMER NOT FOUND IN POSTGRESQL: " + customerNumber);
        return false; // Customer doesn't exist in database
      }

      // 3. Verify they match (same customerNumber)
      if (customer.customerNumber !== user.customerNumber) {
        console.error("[ERR] DATA MISMATCH: User has " + user.customerNumber + " but DB has " + customer.customerNumber);
        return false; // Data mismatch - logout for safety
      }

      // 4. Check if customer is soft-deleted
      if (customer.isDeleted) {
        console.log("[DELETE] CUSTOMER SOFT-DELETED: " + customerNumber);
        return false; // Customer is marked as deleted
      }

      // All checks passed - user and customer are properly linked
      return true;
      
    } catch (error) {
      // On database errors, assume customer exists to prevent false logout
      console.error("[WARN] DATABASE ERROR in checkCustomerExists for " + customerNumber + ":", error);
      console.log("[SAFE] FAIL-SAFE: Assuming customer " + customerNumber + " exists due to DB error");
      return true; // SAFE: Don't logout on DB errors
    }
  };

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - User ID:', req.session?.userId);
    console.log('Auth check - Full session:', req.session);
    
    if (req.session && req.session.userId) {
      // Check if device session is blocked - return error without destroying session
      if (req.session.deviceSessionId && isDeviceBlocked(req.session.deviceSessionId)) {
        console.log("[BLOCK] BLOCKED DEVICE ACCESS ATTEMPT: Session " + req.session.deviceSessionId);
        return res.status(403).json({ message: "Device access has been blocked by administrator" });
      }
      
      // Check if device is in panic mode - return error without destroying session
      if (req.session.deviceSessionId && isDeviceInPanicMode(req.session.deviceSessionId)) {
        console.log("[ALERT] PANIC MODE ACCESS ATTEMPT: Session " + req.session.deviceSessionId);
        return res.status(403).json({ message: "System temporarily unavailable" });
      }
      
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
      try {
        const newCustomer = await storage.createCustomer({
          customerNumber,
          name: fullName,
          email: userData.email,
          phone: '',
          dateOfBirth: userData.dateOfBirth || '',
          joinDate: new Date().toISOString(),
          currency: 'EUR'
        });
        postgresCustomerId = newCustomer.id;
        console.log("[DB] CUSTOMER ADDED TO DATABASE: " + newCustomer.name + " (" + newCustomer.customerNumber + ") with ID: " + postgresCustomerId);
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

      console.log("[OK] USER REGISTERED with matching ID: " + newUser.id + " (" + newUser.customerNumber + ")");
      
      res.status(201).json({ 
        success: true, 
        customerNumber: newUser.customerNumber,
        message: "Registration successful" 
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
      if (!isCurrentDeviceAuthorized(user.id, userAgent)) {
        const existingSession = getUserDeviceSession(user.id);
        console.log("[BLOCK] UNAUTHORIZED DEVICE: User " + user.id + " attempted login from " + deviceModel + ", but account is permanently locked to " + (existingSession?.deviceModel || "unknown"));
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
        permanentLock: true
      });

      // Store user and device session in session (include customerNumber for heartbeat checks)
      (req as any).session.userId = user.id;
      (req as any).session.customerNumber = user.customerNumber;
      (req as any).session.user = { id: user.id, name: user.name, email: user.email, customerNumber: user.customerNumber };
      (req as any).session.deviceSessionId = deviceSessionId;

      // Register session for tracking and invalidation
      addUserSession(req.sessionID, user.customerNumber, user.id);

      console.log("[DEVICE] NEW DEVICE SESSION: " + deviceModel + " (" + ipAddress + ") - Session: " + deviceSessionId);
      console.log("[LOCK] ACCOUNT LOCKED TO DEVICE: User " + user.id + " locked to " + deviceModel);

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
                console.log("[BLOCK] DELETED CUSTOMER ATTEMPT: " + user.customerNumber + " tried to access customer panel");
                
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

  // Get user accounts
  app.get("/api/accounts/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if customer exists in database (deleted customer check)
      const user = await storage.getUserById(userId);
      if (user) {
        const customerExists = await checkCustomerExists(user.customerNumber);
        if (!customerExists) {
          console.log("[BLOCK] DELETED CUSTOMER ATTEMPT: " + user.customerNumber + " tried to view accounts");
          
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
            console.log("[BLOCK] DELETED CUSTOMER ATTEMPT: " + user.customerNumber + " tried to view transactions");
            
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

  // Create transfer
  app.post("/api/transfer", async (req, res) => {
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
          console.log("[BLOCK] DELETED CUSTOMER ATTEMPT: " + accountUser.customerNumber + " tried to transfer");
          
          // Return 403 without logout flags - heartbeat will handle the logout
          return res.status(403).json({ 
            message: "Account access revoked"
          });
        }
      }

      const amount = parseFloat(transferData.amount);
      const currentBalance = parseFloat(account.balance);
      
      if (amount > currentBalance) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Create debit transaction
      const transactionReference = transferData.reference || `TXN${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const transaction = await storage.createTransaction({
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

      // Update account balance
      const newBalance = (currentBalance - amount).toFixed(2);
      await storage.updateAccountBalance(transferData.fromAccountId, newBalance);

      // Get user details for email notification
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => {
        // Find user who owns this account by matching userId
        return u.id === account.userId;
      });
      
      if (user && user.email) {
        try {
          // Send transfer confirmation email using the exact format requested by user
          const confirmationDetails: TransferConfirmationDetails = {
            recipientName: transferData.toAccount,
            amount: amount.toFixed(2),
            currency: (user.currency === 'GBP' ? '£' : '€'),
            dateTime: new Date().toLocaleString('en-GB', {
              dateStyle: 'short',
              timeStyle: 'short',
              timeZone: 'Europe/Dublin'
            }),
            transactionReference: transactionReference,
            senderName: user.name,
            accountInfo: `${account.displayName} (${account.accountNumber.slice(-4)})`
          };

          await sendTransferConfirmation(user.email, confirmationDetails);
        } catch (emailError) {
          console.error('Failed to send transfer confirmation email:', emailError);
          // Don't fail the transfer if email fails
        }
      }

      res.json({ message: "Transfer completed successfully", transaction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
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

      console.log("[OK] PIN VERIFICATION SUCCESSFUL: " + user.name + " (" + user.customerNumber + ")");
      
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
      
      console.log("[OK] NEW USER CREATED: " + newUser.name + " (" + newUser.customerNumber + ") with PIN: " + newUser.pin);
      
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
        console.log("[LOCK] CUSTOMER NOT FOUND: " + customerNumber);
        return res.status(404).json({ 
          message: "Account not found"
        });
      }
      
      if (customer.isDeleted) {
        console.log("[LOCK] CUSTOMER SOFT-DELETED - PROFILE BLOCKED: " + customerNumber);
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
        console.log("[LOCK] CUSTOMER DELETED - PROFILE BLOCKED: " + customerNumber);
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
            console.log(`[OK] Email synchronized and verified for customer ${customerNumber}: ${updates.email}`);
          } else {
            console.error(`[ERR] Email synchronization failed for customer ${customerNumber}`);
          }
        } catch (emailSyncError) {
          console.error('Failed to synchronize email across systems:', emailSyncError);
        }
      }
      
      // Notify admin panel of profile update by logging the change
      console.log(`[OK] Profile updated for customer ${customerNumber}:`, {
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
      const activeOTCs = otcService.getAllActiveOTCs();
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
            console.log(`📊 CUSTOMER ADDED TO DATABASE (Admin OTC): ${newCustomer.name} (${newCustomer.customerNumber}) with ID: ${postgresCustomerId}`);
          } catch (customerError) {
            console.error('Failed to add customer to database:', customerError);
            throw new Error('Failed to create customer in database');
          }

          // STEP 2: Create user in memory using PostgreSQL ID
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
          }, postgresCustomerId); // Use PostgreSQL ID for in-memory user

          console.log(`[OK] USER CREATED IN MEMORY with matching ID: ${newUser.id} (customerNumber: ${newUser.customerNumber})`);

          // Create default accounts for the new user
          const defaultAccounts = [
            {
              userId: newUser.id,
              accountType: "current" as const,
              accountNumber: "****2091",
              balance: "0.00",
              displayName: "Current Account",
              sortCode: "90-78-68"
            },
            {
              userId: newUser.id,
              accountType: "credit" as const,
              accountNumber: "****1820",
              balance: "0.00",
              displayName: "Credit Card",
              sortCode: "90-78-68"
            },
            {
              userId: newUser.id,
              accountType: "savings" as const,
              accountNumber: "****0978",
              balance: "0.00",
              displayName: "Savings Account",
              sortCode: "90-78-68"
            }
          ];

          // Create the accounts in the database
          for (const accountData of defaultAccounts) {
            await storage.createAccount(accountData);
          }

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

  // AI-powered chat response endpoint
  app.post("/api/chat/ai-response", async (req, res) => {
    try {
      const requestSchema = z.object({
        message: z.string(),
        conversationHistory: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string()
        })).default([]),
        agentName: z.string().default('Support Agent'),
        customerNumber: z.string().optional()
      });

      const { message, conversationHistory, agentName, customerNumber } = requestSchema.parse(req.body);

      // Get user data to access their currency preference
      let userCurrency: 'EUR' | 'GBP' = 'EUR';
      if (customerNumber) {
        const user = await storage.getUserByCustomerNumber(customerNumber);
        if (user && user.currency) {
          userCurrency = user.currency as 'EUR' | 'GBP';
        }
      }

      // Get customer's recent transfer data from request body if available
      let transferContext = '';
      
      // The client will pass transaction data in the request body
      const requestedTransactionData = req.body.transactionData;
      if (requestedTransactionData && requestedTransactionData.length > 0) {
        // Find the most recent external transfer transaction (exclude internal BOI transfers)
        const transferTransactions = requestedTransactionData
          .filter((tx: any) => {
            // Only include external transfers (UK Transfer or SEPA Transfer)
            return tx.paymentMethod === 'UK Transfer' || tx.paymentMethod === 'SEPA Transfer';
          })
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (transferTransactions.length > 0) {
          const lastTransfer = transferTransactions[0];
          const transferDate = new Date(lastTransfer.timestamp).toLocaleDateString('en-GB');
          const transferAmount = parseFloat(lastTransfer.amount.replace('-', ''));
          
          // Extract recipient name from description
          const recipientMatch = lastTransfer.description.match(/Transfer to (.+)/);
          const recipientName = recipientMatch ? recipientMatch[1] : 'recipient';
          
          // Build transfer-specific context based on transfer type
          let transferTypeContext = '';
          let accountDetails = '';
          
          if (lastTransfer.paymentMethod === 'UK Transfer') {
            transferTypeContext = `
TRANSFER TYPE: UK Transfer (sent to a UK account)
DELIVERY TIME: Takes up to 24 hours to arrive
CURRENCY: May include currency conversion if relevant`;
            accountDetails = `
Sort Code: ${lastTransfer.recipientSortCode || 'Not available'}
Account Number: ${lastTransfer.recipientAccountNumber || 'Not available'}`;
          } else if (lastTransfer.paymentMethod === 'SEPA Transfer') {
            transferTypeContext = `
TRANSFER TYPE: SEPA Transfer (European payment)
DELIVERY TIME: Takes 1 business day to arrive
CURRENCY: Do NOT mention currency conversion - SEPA transfers are EUR to EUR`;
            accountDetails = `
IBAN: ${lastTransfer.iban || 'Not available'}
BIC Code: ${lastTransfer.bicCode || 'Not available'}
Unique Reference: ${lastTransfer.reference || 'Not specified'}`;
          }
          
          // Use user currency for proper display
          const currencySymbol = userCurrency === 'GBP' ? '£' : '€';
          
          transferContext = `\n\nCUSTOMER'S RECENT TRANSFER CONTEXT:
Last transfer: ${currencySymbol}${transferAmount.toFixed(2)} to ${recipientName} on ${transferDate}
Reference: ${lastTransfer.reference || 'Not specified'}
Transaction ID: ${lastTransfer.id}
Status: Confirmed and processed${transferTypeContext}${accountDetails}

RESPONSE GUIDELINES:
- For UK Transfers: Mention it was sent to a UK account, include sort code/account number, mention up to 24 hours delivery, can mention currency conversion if relevant
- For SEPA Transfers: Say it was a SEPA transfer, mention IBAN/BIC/unique reference, say 1 business day delivery, DO NOT mention currency conversion or UK accounts

IMPORTANT: When customer asks for payment confirmation or transfer details, follow the response guidelines above and include the relevant account details.`;
        } else {
          transferContext = `\n\nCUSTOMER'S RECENT TRANSFER CONTEXT:
No transfers found yet on your account.`;
        }
      }
      
      // Prepare conversation history for OpenAI
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user' as const, content: message }
      ];

      console.log(`💬 Sending to AI: ${messages.length} messages in history`);
      console.log(`   Latest message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

      const aiResponse = await generateChatResponse(messages, agentName, transferContext, userCurrency);
      
      res.json({ 
        response: aiResponse,
        agentName: agentName
      });
    } catch (error) {
      console.error('Failed to generate AI response:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      res.status(500).json({ message: "Failed to generate AI response" });
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
          type: z.enum(['credit', 'debit']),
          reference: z.string().optional(),
          timestamp: z.string(),
          recipientName: z.string().optional(),
          paymentMethod: z.string().optional(),
          recipientAccountNumber: z.string().optional(),
          recipientSortCode: z.string().optional(),
          iban: z.string().optional(),
          bicCode: z.string().optional()
        })).optional(),
        // Accept real user account data from frontend
        userAccounts: z.array(z.object({
          id: z.number(),
          displayName: z.string(),
          accountNumber: z.string(),
          balance: z.string(),
          accountType: z.string(),
          sortCode: z.string().optional()
        })).optional(),
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
      const pdfBuffer = await statementService.generateStatement(statementRequest);
      
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
            console.log('[OK] Bank statement email sent successfully');
          } else {
            console.log('[WARN] Bank statement email failed, but PDF still generated');
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
      
      if (pin === "270309200207") {
        // Redirect with auth token in URL
        res.redirect('/admin-oversight?auth=verified');
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
      
      console.log(`[NUCLEAR] ALL CUSTOMERS DELETED - Customers: ${customersDeleted}, Users: ${usersDeleted}`);
      
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

  // Admin Oversight - Professional PWA Design
  app.get("/admin-oversight", async (req, res) => {
    // Check if admin is authenticated via URL token
    const isAuthenticated = req.query.auth === 'verified';
    const hasError = req.query.error === 'invalid';
    
    if (!isAuthenticated) {
      const loginPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0a2540">
<title>Admin Portal | Bank of Ireland</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif;background:#0a2540;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px env(safe-area-inset-right) 20px env(safe-area-inset-left)}
.login-container{width:100%;max-width:400px}
.logo{text-align:center;margin-bottom:32px}
.logo-icon{width:64px;height:64px;background:linear-gradient(135deg,#00a859 0%,#008a47 100%);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 32px rgba(0,168,89,0.3)}
.logo-icon svg{width:36px;height:36px;fill:#fff}
.logo h1{color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px}
.logo p{color:rgba(255,255,255,0.6);font-size:14px;margin-top:4px}
.login-card{background:#fff;border-radius:20px;padding:32px 24px;box-shadow:0 24px 80px rgba(0,0,0,0.4)}
.login-card h2{color:#0a2540;font-size:20px;font-weight:700;margin-bottom:8px}
.login-card .subtitle{color:#627d98;font-size:14px;margin-bottom:24px}
.error-msg{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:12px 16px;border-radius:12px;font-size:13px;margin-bottom:20px;display:${hasError ? 'block' : 'none'}}
.form-group{margin-bottom:20px}
.form-group label{display:block;color:#334155;font-size:13px;font-weight:600;margin-bottom:8px}
.pin-input{width:100%;padding:16px;border:2px solid #e2e8f0;border-radius:12px;font-size:24px;font-family:'SF Mono',Monaco,monospace;letter-spacing:8px;text-align:center;transition:all 0.2s;background:#f8fafc}
.pin-input:focus{outline:none;border-color:#00a859;background:#fff;box-shadow:0 0 0 4px rgba(0,168,89,0.1)}
.btn-login{width:100%;background:linear-gradient(135deg,#00a859 0%,#008a47 100%);color:#fff;border:none;padding:16px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(0,168,89,0.3)}
.btn-login:active{transform:scale(0.98)}
.secure-badge{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:20px;color:rgba(255,255,255,0.5);font-size:12px}
.secure-badge svg{width:14px;height:14px;fill:currentColor}
</style>
</head>
<body>
<div class="login-container">
<div class="logo">
<div class="logo-icon">
<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
</div>
<h1>Admin Portal</h1>
<p>Bank of Ireland Oversight</p>
</div>
<div class="login-card">
<h2>Secure Access</h2>
<p class="subtitle">Enter your administrator PIN</p>
<div class="error-msg">Invalid PIN. Access denied.</div>
<form action="/api/admin/login" method="POST">
<div class="form-group">
<label>Administrator PIN</label>
<input type="password" name="pin" class="pin-input" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="12" required autofocus placeholder="••••••">
</div>
<button type="submit" class="btn-login">Access Dashboard</button>
</form>
</div>
<div class="secure-badge">
<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
256-bit encrypted connection
</div>
</div>
</body>
</html>`;
      return res.send(loginPage);
    }

    const adminPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0a2540">
<title>Admin Dashboard | Bank of Ireland</title>
<style>
:root{--primary:#00a859;--primary-dark:#008a47;--bg-dark:#0a2540;--bg-card:#0f3460;--bg-surface:#1a4a7a;--text-primary:#fff;--text-secondary:rgba(255,255,255,0.7);--text-muted:rgba(255,255,255,0.5);--border:rgba(255,255,255,0.1);--danger:#ef4444;--warning:#f59e0b;--success:#10b981;--safe-top:env(safe-area-inset-top);--safe-bottom:env(safe-area-inset-bottom)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif;background:var(--bg-dark);color:var(--text-primary);min-height:100vh;overflow-x:hidden}
.app{display:flex;flex-direction:column;min-height:100vh}
.header{background:linear-gradient(180deg,var(--bg-dark) 0%,var(--bg-card) 100%);padding:calc(16px + var(--safe-top)) 20px 16px;position:sticky;top:0;z-index:100}
.header-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.brand{display:flex;align-items:center;gap:12px}
.brand-logo{width:40px;height:40px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-radius:10px;display:flex;align-items:center;justify-content:center}
.brand-logo svg{width:24px;height:24px;fill:#fff}
.brand-text h1{font-size:18px;font-weight:700;letter-spacing:-0.3px}
.brand-text span{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px}
.header-actions{display:flex;gap:8px}
.icon-btn{width:40px;height:40px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s}
.icon-btn svg{width:20px;height:20px;fill:var(--text-secondary)}
.icon-btn:active{transform:scale(0.95)}
.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
.stat-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:16px;padding:16px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--primary),var(--primary-dark))}
.stat-card.warning::before{background:linear-gradient(90deg,var(--warning),#d97706)}
.stat-card.danger::before{background:linear-gradient(90deg,var(--danger),#dc2626)}
.stat-value{font-size:32px;font-weight:800;letter-spacing:-1px;margin-bottom:4px}
.stat-label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
.stat-icon{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:48px;height:48px;background:rgba(255,255,255,0.05);border-radius:12px;display:flex;align-items:center;justify-content:center}
.stat-icon svg{width:24px;height:24px;fill:var(--text-muted)}
.tabs-container{background:var(--bg-card);border-bottom:1px solid var(--border);position:sticky;top:76px;z-index:99}
.tabs{display:flex;overflow-x:auto;padding:0 16px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:14px 18px;font-size:13px;font-weight:600;color:var(--text-muted);white-space:nowrap;border-bottom:2px solid transparent;transition:all 0.2s;cursor:pointer}
.tab.active{color:var(--primary);border-color:var(--primary)}
.search-bar{padding:16px 20px;background:var(--bg-dark);position:sticky;top:120px;z-index:98}
.search-input-wrap{position:relative}
.search-input{width:100%;padding:14px 16px 14px 44px;background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;font-size:15px;color:var(--text-primary);transition:all 0.2s}
.search-input::placeholder{color:var(--text-muted)}
.search-input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(0,168,89,0.15)}
.search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);width:20px;height:20px;fill:var(--text-muted)}
.section{padding:0 20px}
.section-header{display:flex;justify-content:space-between;align-items:center;padding:16px 0 12px}
.section-title{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)}
.section-badge{background:var(--warning);color:#000;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px}
.otc-list{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.otc-card{background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05));border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:16px;position:relative}
.otc-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--warning);border-radius:4px 0 0 4px}
.otc-name{font-size:14px;font-weight:600;margin-bottom:4px}
.otc-number{font-size:12px;color:var(--text-muted);margin-bottom:12px}
.otc-code-display{font-size:28px;font-weight:800;font-family:'SF Mono',Monaco,monospace;letter-spacing:6px;color:var(--warning);margin-bottom:8px}
.otc-timer{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--danger);font-weight:600}
.otc-timer svg{width:14px;height:14px;fill:currentColor}
.otc-empty{background:var(--bg-surface);border:1px dashed var(--border);border-radius:16px;padding:32px;text-align:center;color:var(--text-muted)}
.customer-list{display:flex;flex-direction:column;gap:12px;padding-bottom:calc(100px + var(--safe-bottom))}
.customer-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:all 0.2s}
.customer-card.expanded{border-color:var(--primary)}
.customer-header{padding:16px;display:flex;align-items:center;gap:14px;cursor:pointer}
.customer-avatar{width:48px;height:48px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0}
.customer-info{flex:1;min-width:0}
.customer-name{font-size:16px;font-weight:600;margin-bottom:2px;display:flex;align-items:center;gap:8px}
.customer-name .badge{font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700}
.badge-active{background:rgba(16,185,129,0.2);color:var(--success)}
.badge-flagged{background:rgba(239,68,68,0.2);color:var(--danger)}
.badge-deleted{background:rgba(107,114,128,0.2);color:#9ca3af}
.customer-id{font-size:13px;color:var(--text-muted);font-family:'SF Mono',Monaco,monospace}
.customer-arrow{width:32px;height:32px;background:rgba(255,255,255,0.05);border-radius:8px;display:flex;align-items:center;justify-content:center;transition:transform 0.3s}
.customer-arrow svg{width:16px;height:16px;fill:var(--text-muted)}
.customer-card.expanded .customer-arrow{transform:rotate(180deg)}
.customer-details{max-height:0;overflow:hidden;transition:max-height 0.3s ease-out}
.customer-card.expanded .customer-details{max-height:1200px}
.details-inner{padding:0 16px 16px;border-top:1px solid var(--border)}
.detail-grid{display:grid;gap:12px;padding-top:16px}
.detail-row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)}
.detail-row:last-child{border-bottom:none}
.detail-label{font-size:13px;color:var(--text-muted);font-weight:500}
.detail-value{font-size:13px;font-weight:600;text-align:right;max-width:60%;word-break:break-word}
.alert-box{padding:12px;border-radius:10px;margin-top:12px;display:flex;align-items:flex-start;gap:10px}
.alert-box.warning{background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3)}
.alert-box.warning .alert-icon{color:var(--warning)}
.alert-box .alert-text{font-size:12px;line-height:1.5}
.alert-box .alert-title{font-weight:700;margin-bottom:2px}
.form-field{margin-top:16px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:14px}
.form-field label{display:block;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px}
.form-row{display:flex;gap:8px}
.form-input{flex:1;padding:10px 12px;background:var(--bg-dark);border:1px solid var(--border);border-radius:8px;font-size:14px;color:var(--text-primary);transition:all 0.2s}
.form-input:focus{outline:none;border-color:var(--primary)}
.form-select{padding:10px 12px;background:var(--bg-dark);border:1px solid var(--border);border-radius:8px;font-size:14px;color:var(--text-primary);min-width:80px}
.btn-save{padding:10px 16px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-save:active{transform:scale(0.97)}
.action-btns{display:flex;gap:10px;margin-top:16px}
.btn-action{flex:1;padding:14px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.btn-delete{background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid rgba(239,68,68,0.3)}
.btn-delete:active{background:var(--danger);color:#fff}
.btn-restore{background:rgba(16,185,129,0.15);color:var(--success);border:1px solid rgba(16,185,129,0.3)}
.btn-restore:active{background:var(--success);color:#fff}
.btn-erase{background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.2);font-size:12px}
.map-preview{width:100%;height:120px;background:var(--bg-dark);border:1px solid var(--border);border-radius:12px;margin-top:12px;overflow:hidden;cursor:pointer;position:relative}
.map-preview img{width:100%;height:100%;object-fit:cover}
.map-overlay{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.8));padding:10px;font-size:11px;display:flex;align-items:center;gap:6px}
.map-overlay svg{width:14px;height:14px;fill:var(--primary)}
.activity-list{margin-top:12px}
.activity-title{font-size:12px;color:var(--text-muted);font-weight:600;margin-bottom:8px}
.activity-item{font-size:12px;color:var(--text-secondary);padding:6px 0;border-bottom:1px solid var(--border)}
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:var(--bg-card);border-top:1px solid var(--border);padding:12px 20px calc(12px + var(--safe-bottom));display:flex;justify-content:space-around;z-index:200}
.nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;opacity:0.5;transition:all 0.2s}
.nav-item.active{opacity:1}
.nav-item svg{width:24px;height:24px;fill:var(--text-primary)}
.nav-item.active svg{fill:var(--primary)}
.nav-item span{font-size:10px;font-weight:600}
.nav-item.active span{color:var(--primary)}
.empty-state{background:var(--bg-surface);border:1px dashed var(--border);border-radius:16px;padding:48px 24px;text-align:center}
.empty-state svg{width:48px;height:48px;fill:var(--text-muted);margin-bottom:16px}
.empty-state h3{font-size:16px;margin-bottom:8px}
.empty-state p{font-size:13px;color:var(--text-muted)}
.pulse{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:1000;align-items:center;justify-content:center;padding:20px}
.modal.show{display:flex}
.modal-content{width:100%;max-width:500px;background:var(--bg-card);border-radius:20px;overflow:hidden}
.modal-header{background:linear-gradient(135deg,var(--primary),var(--primary-dark));padding:20px;display:flex;justify-content:space-between;align-items:center}
.modal-header h3{font-size:18px;font-weight:700}
.modal-close{width:36px;height:36px;background:rgba(255,255,255,0.2);border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.modal-close svg{width:20px;height:20px;fill:#fff}
.modal-body{height:400px}
.modal-body img{width:100%;height:100%;object-fit:cover}
.live-indicator{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--success)}
.live-dot{width:8px;height:8px;background:var(--success);border-radius:50%;animation:pulse 1.5s infinite}
</style>
</head>
<body>
<div class="app">
<header class="header">
<div class="header-top">
<div class="brand">
<div class="brand-logo"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg></div>
<div class="brand-text"><h1>Admin Dashboard</h1><span>Bank of Ireland</span></div>
</div>
<div class="header-actions">
<button class="icon-btn" onclick="ld()"><svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
<button class="icon-btn" onclick="logout()"><svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg></button>
</div>
</div>
<div class="stats-grid">
<div class="stat-card"><div class="stat-value" id="statTotal">0</div><div class="stat-label">Total Active</div><div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div></div>
<div class="stat-card"><div class="stat-value live-indicator"><span class="live-dot"></span><span id="statActive">0</span></div><div class="stat-label">Online Now</div><div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div></div>
<div class="stat-card"><div class="stat-value" id="statReal">0</div><div class="stat-label">Real Customers</div><div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div></div>
<div class="stat-card danger"><div class="stat-value" id="statFlagged" style="color:var(--danger)">0</div><div class="stat-label">Flagged</div><div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></div></div>
</div>
</header>
<div class="tabs-container">
<div class="tabs">
<div class="tab active" onclick="setFilter('active')">Active</div>
<div class="tab" onclick="setFilter('developer')">Developers</div>
<div class="tab" onclick="setFilter('flagged')">Flagged</div>
<div class="tab" onclick="setFilter('deleted')">Deleted</div>
<div class="tab" onclick="setSort('name')">A-Z</div>
<div class="tab" onclick="setSort('number')">ID</div>
<div class="tab" onclick="setSort('date')">Recent</div>
<div class="tab" onclick="exportData()">Export</div>
</div>
</div>
<div class="search-bar">
<div class="search-input-wrap">
<svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
<input type="text" class="search-input" id="srch" placeholder="Search by name, number, or alias..." oninput="flt()">
</div>
</div>
<main class="section">
<div class="section-header">
<span class="section-title">Verification Codes</span>
<span class="section-badge" id="otcCount">0 Active</span>
</div>
<div class="otc-list" id="otc-list">
<div class="otc-empty">
<svg viewBox="0 0 24 24" style="width:32px;height:32px;fill:var(--text-muted);margin-bottom:8px"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>
<p style="font-size:13px">No active verification codes</p>
</div>
</div>
<div class="section-header">
<span class="section-title">Customer Accounts</span>
</div>
<div class="customer-list" id="l">
<div class="empty-state">
<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
<h3>Loading...</h3>
<p>Fetching customer data</p>
</div>
</div>
</main>
</div>
<div class="modal" id="mapModal">
<div class="modal-content">
<div class="modal-header">
<h3 id="mapTitle">Customer Location</h3>
<button class="modal-close" onclick="closeMap()"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
</div>
<div class="modal-body"><img id="mapImage" src="" alt="Location"></div>
</div>
</div>
<script>
let o=new Set();
let allCust=[];
function tg(id){
const card=document.getElementById('card-'+id);
if(o.has(id)){card.classList.remove('expanded');o.delete(id)}
else{card.classList.add('expanded');o.add(id)}
}
function escapeHtml(text){
const map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
return String(text).replace(/[&<>"']/g,m=>map[m]);
}
async function loadOTC(){
try{
let r=await fetch('/api/admin/active-otcs'),d=await r.json();
document.getElementById('otcCount').textContent=(d.otcs?.length||0)+' Active';
if(!d.otcs||!d.otcs.length){
document.getElementById('otc-list').innerHTML='<div class="otc-empty"><svg viewBox="0 0 24 24" style="width:32px;height:32px;fill:var(--text-muted);margin-bottom:8px"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg><p style="font-size:13px">No active verification codes</p></div>';
return;
}
let h='';
d.otcs.forEach(otc=>{
h+=\`<div class="otc-card">
<div class="otc-name">\${escapeHtml(otc.accountData.name)}</div>
<div class="otc-number">\${escapeHtml(otc.customerNumber)}</div>
<div class="otc-code-display">\${escapeHtml(otc.code)}</div>
<div class="otc-timer"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>Expires: \${escapeHtml(otc.timeRemaining)}</div>
</div>\`;
});
document.getElementById('otc-list').innerHTML=h;
}catch(e){console.error('OTC load error:',e)}
}
function flt(){applyFiltersAndSort()}
function rnd(data){
if(!data.length){
document.getElementById('l').innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><h3>No Customers Found</h3><p>Try adjusting your filters</p></div>';
return;
}
let h='';
data.forEach((c,idx)=>{
let safeId='c'+idx;
let op=o.has(safeId);
let isActive=false;
if(c.profileClickHistory&&Array.isArray(c.profileClickHistory)&&c.profileClickHistory.length>0){
const lastClick=new Date(c.profileClickHistory[0]);
isActive=(new Date()-lastClick)<300000;
}
const initials=c.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
let badges='';
if(isActive)badges+='<span class="badge badge-active">ONLINE</span>';
if(c.notificationViolationFlagged)badges+='<span class="badge badge-flagged">FLAGGED</span>';
if(c.isDeleted)badges+='<span class="badge badge-deleted">DELETED</span>';
h+=\`<div class="customer-card \${op?'expanded':''}" id="card-\${safeId}">
<div class="customer-header" onclick="tg('\${safeId}')">
<div class="customer-avatar">\${initials}</div>
<div class="customer-info">
<div class="customer-name">\${escapeHtml(c.name)}\${badges}</div>
<div class="customer-id">\${escapeHtml(c.customerNumber)}</div>
</div>
<div class="customer-arrow"><svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></div>
</div>
<div class="customer-details">
<div class="details-inner">
<div class="detail-grid">
<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">\${escapeHtml(c.email)}</span></div>
<div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">\${escapeHtml(c.phone||'Not provided')}</span></div>
<div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">\${escapeHtml(c.address||'Not provided')}</span></div>
<div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">\${escapeHtml(c.dateOfBirth||'Not provided')}</span></div>
<div class="detail-row"><span class="detail-label">Currency</span><span class="detail-value">\${escapeHtml(c.currency)}</span></div>
<div class="detail-row"><span class="detail-label">Joined</span><span class="detail-value">\${escapeHtml(c.joinDate||'Unknown')}</span></div>
</div>
\${c.notificationViolationFlagged?\`<div class="alert-box warning"><svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--warning);flex-shrink:0"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg><div class="alert-text"><div class="alert-title">Security Violation</div>Login attempted without notifications enabled\${c.notificationViolationAt?' on '+new Date(c.notificationViolationAt).toLocaleString('en-GB'):''}</div></div>\`:''}
\${c.profileClickHistory&&Array.isArray(c.profileClickHistory)&&c.profileClickHistory.length>0?\`<div class="activity-list"><div class="activity-title">Recent Activity</div>\${c.profileClickHistory.slice(0,3).map((click,i)=>{const d=new Date(click);return \`<div class="activity-item">\${d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>\`;}).join('')}</div>\`:''}
\${c.lastLatitude&&c.lastLongitude?\`<div class="map-preview" onclick="showMap('\${c.lastLatitude}','\${c.lastLongitude}','\${escapeHtml(c.name)}')"><img src="https://static-maps.yandex.ru/1.x/?ll=\${c.lastLongitude},\${c.lastLatitude}&size=400,120&z=14&l=map&pt=\${c.lastLongitude},\${c.lastLatitude},pm2gnm" alt="Map"><div class="map-overlay"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>\${c.lastLatitude.toFixed(4)}, \${c.lastLongitude.toFixed(4)}</div></div>\`:''}
<div class="form-field">
<label>Admin Notes</label>
<div class="form-row">
<input type="text" class="form-input" id="alias-\${safeId}" value="\${escapeHtml(c.adminAlias||'')}" placeholder="Internal notes..." data-customer="\${escapeHtml(c.customerNumber)}">
<button class="btn-save" onclick="upd('\${escapeHtml(c.customerNumber)}','\${safeId}')">Save</button>
</div>
</div>
<div class="form-field">
<label>App Replacement Level</label>
<div class="form-row">
<select class="form-select" id="rep-\${safeId}" data-customer="\${escapeHtml(c.customerNumber)}">
<option value="0" \${(c.appReplacement||0)===0?'selected':''}>0 - None</option>
<option value="1" \${c.appReplacement===1?'selected':''}>1 - Low</option>
<option value="2" \${c.appReplacement===2?'selected':''}>2 - Medium</option>
<option value="3" \${c.appReplacement===3?'selected':''}>3 - High</option>
<option value="4" \${c.appReplacement===4?'selected':''}>4 - Critical</option>
<option value="5" \${c.appReplacement===5?'selected':''}>5 - Maximum</option>
</select>
<button class="btn-save" onclick="upd('\${escapeHtml(c.customerNumber)}','\${safeId}')">Save</button>
</div>
</div>
<div class="action-btns">
\${c.isDeleted?\`
<button class="btn-action btn-restore" onclick="res('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/></svg>Restore</button>
<button class="btn-action btn-erase" onclick="ers('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">Permanent Delete</button>
\`:\`<button class="btn-action btn-delete" onclick="dl('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>Delete Account</button>\`}
</div>
</div>
</div>
</div>\`;
});
document.getElementById('l').innerHTML=h;
}
async function ld(){
try{
let r=await fetch('/api/customers'),d=await r.json();
allCust=d.sort((a,b)=>parseInt(a.customerNumber)-parseInt(b.customerNumber));
updateStats();
applyFiltersAndSort();
loadOTC();
}catch(e){document.getElementById('l').innerHTML='<div class="empty-state"><h3>Error Loading Data</h3><p>Please try refreshing</p></div>'}
}
async function dl(n,nm){
if(!confirm('Delete '+nm+'?\\n\\nThis will soft-delete the account. They will be logged out immediately.'))return;
const reason=prompt('Reason for deletion:','Deleted by admin');
try{
let r=await fetch('/api/customers/'+encodeURIComponent(n),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason||'Deleted by admin'})});
if(r.ok){alert('Account deleted successfully');ld()}else{const d=await r.json();alert('Failed: '+d.message)}
}catch(e){alert('Error: '+e.message)}
}
async function ers(n,nm){
if(!confirm('PERMANENTLY DELETE '+nm+'?\\n\\nThis cannot be undone!'))return;
if(!confirm('Final confirmation - permanently erase all data for '+nm+'?'))return;
try{
let r=await fetch('/api/customers/'+encodeURIComponent(n)+'/permanent',{method:'DELETE'});
if(r.ok){alert('Account permanently erased');ld()}else{const d=await r.json();alert('Failed: '+d.message)}
}catch(e){alert('Error: '+e.message)}
}
async function res(n,nm){
if(!confirm('Restore '+nm+'?'))return;
try{
let r=await fetch('/api/customers/'+encodeURIComponent(n)+'/restore',{method:'POST'});
if(r.ok){alert('Account restored');ld()}else{const d=await r.json();alert('Failed: '+d.message)}
}catch(e){alert('Error: '+e.message)}
}
async function upd(n,id){
try{
let alias=document.getElementById('alias-'+id).value;
let rep=parseInt(document.getElementById('rep-'+id).value);
let r=await fetch('/api/customers/'+encodeURIComponent(n)+'/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminAlias:alias,appReplacement:rep})});
if(r.ok){alert('Saved')}else{alert('Failed to save')}
}catch(e){alert('Error')}
}
async function logout(){
try{await fetch('/api/admin/logout',{method:'POST'});window.location.href='/admin-oversight'}catch(e){alert('Error')}
}
function showMap(lat,lng,name){
document.getElementById('mapTitle').textContent=name;
document.getElementById('mapImage').src='https://static-maps.yandex.ru/1.x/?ll='+lng+','+lat+'&size=600,400&z=15&l=map&pt='+lng+','+lat+',pm2gnm';
document.getElementById('mapModal').classList.add('show');
}
function closeMap(){document.getElementById('mapModal').classList.remove('show')}
let currentFilter='active';
let currentSort='number';
function isDeveloperAccount(c){
const devKeywords=['test','developer','demo','dev','sample','example'];
const nameLower=(c.name||'').toLowerCase();
const aliasLower=(c.adminAlias||'').toLowerCase();
return devKeywords.some(kw=>nameLower.includes(kw)||aliasLower.includes(kw));
}
function updateStats(){
const total=allCust.filter(c=>!c.isDeleted).length;
const recentActive=allCust.filter(c=>{
if(c.isDeleted)return false;
if(c.profileClickHistory&&Array.isArray(c.profileClickHistory)&&c.profileClickHistory.length>0){
return(new Date()-new Date(c.profileClickHistory[0]))<300000;
}return false;
}).length;
const dev=allCust.filter(c=>!c.isDeleted&&isDeveloperAccount(c)).length;
const real=total-dev;
const flagged=allCust.filter(c=>c.notificationViolationFlagged).length;
document.getElementById('statTotal').textContent=total;
document.getElementById('statActive').textContent=recentActive;
document.getElementById('statReal').textContent=real;
document.getElementById('statFlagged').textContent=flagged;
}
function setFilter(type){
currentFilter=type;
document.querySelectorAll('.tab').forEach((tab,i)=>{
if(i<4)tab.classList.remove('active');
});
event.target.classList.add('active');
applyFiltersAndSort();
}
function setSort(type){
currentSort=type;
applyFiltersAndSort();
}
function applyFiltersAndSort(){
let filtered=allCust;
if(currentFilter==='active'){filtered=filtered.filter(c=>!c.isDeleted)}
else if(currentFilter==='developer'){filtered=filtered.filter(c=>!c.isDeleted&&isDeveloperAccount(c))}
else if(currentFilter==='flagged'){filtered=filtered.filter(c=>c.notificationViolationFlagged)}
else if(currentFilter==='deleted'){filtered=filtered.filter(c=>c.isDeleted)}
const query=document.getElementById('srch').value.toLowerCase();
if(query){filtered=filtered.filter(c=>(c.adminAlias||'').toLowerCase().includes(query)||c.name.toLowerCase().includes(query)||c.customerNumber.includes(query))}
if(currentSort==='name'){filtered.sort((a,b)=>a.name.localeCompare(b.name))}
else if(currentSort==='number'){filtered.sort((a,b)=>parseInt(a.customerNumber)-parseInt(b.customerNumber))}
else if(currentSort==='date'){filtered.sort((a,b)=>new Date(b.joinDate)-new Date(a.joinDate))}
rnd(filtered);
}
function exportData(){
const csv=['Customer Number,Name,Email,Phone,Currency,Join Date,Status'];
allCust.forEach(c=>{csv.push(\`\${c.customerNumber},"\${c.name}","\${c.email}","\${c.phone||''}","\${c.currency}","\${c.joinDate||''}",\${c.isDeleted?'Deleted':'Active'}\`)});
const blob=new Blob([csv.join('\\n')],{type:'text/csv'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');a.href=url;a.download='customers_'+new Date().toISOString().split('T')[0]+'.csv';a.click();
URL.revokeObjectURL(url);
}
ld();
setInterval(loadOTC,5000);
setInterval(ld,10000);
</script>
</body>
</html>\`;
    
    res.send(adminPage);
  });

  // API endpoint to get all customers (including soft-deleted for admin UI)
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers(true); // Include soft-deleted
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: "Failed to fetch customers" });
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
        console.log("[DELETE] CUSTOMER SOFT-DELETED IN POSTGRESQL: " + customerNumber + " - Reason: " + (reason || "Deleted by admin"));
        
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
          console.log("[DELETE] USER DELETED FROM MEMORY: " + customerNumber);
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
      
      // Check if customer exists and is already soft-deleted
      const customer = await storage.getCustomerByCustomerNumber(customerNumber, true);
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: "Customer not found" 
        });
      }
      
      if (!customer.isDeleted) {
        return res.status(400).json({ 
          success: false, 
          message: "Customer must be soft-deleted before permanent erasure" 
        });
      }
      
      // Permanent erase from customers table
      const erased = await storage.permanentlyEraseCustomer(customerNumber);
      
      if (erased) {
        // Safety: Delete user from memory if still present (should already be deleted during soft-delete)
        const userDeleted = await storage.deleteUser(customerNumber);
        
        console.log("[ERASE] CUSTOMER PERMANENTLY ERASED FROM POSTGRESQL: " + customerNumber);
        if (userDeleted) {
          console.log("[ERASE] USER ALSO DELETED FROM MEMORY (was still present): " + customerNumber);
        }
        
        // Send force disconnect flag to trigger PWA wipe
        res.json({ 
          success: true, 
          message: "Customer permanently erased",
          customerNumber: customerNumber,
          name: customer.name,
          forceDisconnect: true, // Trigger complete PWA wipe
          logout: true // Force logout
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to permanently erase customer" 
        });
      }
    } catch (error) {
      console.error('Error permanently erasing customer:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to permanently erase customer" 
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
        console.log("[RESTORE] CUSTOMER RESTORED IN POSTGRESQL: " + customerNumber);
        
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
              console.log("[RESTORE] USER RECREATED IN MEMORY with original ID " + createdUser.id + ": " + customerNumber);
            }
          } else {
            // User somehow still exists - just re-enable them
            await storage.enableUser(user.id);
            console.log("[RESTORE] USER RE-ENABLED IN MEMORY: " + customerNumber);
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

  // Flag and soft-delete account for notification violation (attempted login without notifications)
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
        console.log(`[VIOLATION] NOTIFICATION VIOLATION ATTEMPT: Unknown customer ${customerNumber} tried to login without notifications`);
        return res.json({ success: true, message: "Violation logged" });
      }
      
      // Flag the account for notification violation
      const flagged = await storage.updateCustomer(customerNumber, {
        notificationViolationFlagged: true,
        notificationViolationAt: new Date()
      });
      
      if (flagged) {
        console.log(`🚨 NOTIFICATION VIOLATION: Customer ${customerNumber} (${customer.name}) attempted login without notifications - FLAGGED`);
        
        // Now soft-delete the customer
        const deleted = await storage.deleteCustomer(customerNumber, 'Attempted login without notification permission enabled');
        
        if (deleted) {
          console.log(`[VIOLATION] CUSTOMER SOFT-DELETED FOR NOTIFICATION VIOLATION: ${customerNumber}`);
          
          // Get user info for cleanup
          const user = await storage.getUser(customerNumber);
          
          // Remove device sessions
          if (user) {
            const { removeDeviceSession } = await import('./deviceSessions');
            removeDeviceSession(user.id.toString());
          }
          
          // Invalidate all sessions for this customer
          const { invalidateAllUserSessions } = await import('./sessionManager');
          invalidateAllUserSessions(customerNumber);
          
          // Delete user from memory to keep tables in sync
          await storage.deleteUser(customerNumber);
        }
        
        res.json({ 
          success: true, 
          message: "Account flagged and soft-deleted for notification violation",
          flagged: true,
          deleted: deleted
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
      const { adminAlias, appReplacement } = req.body;
      
      const updates: any = {};
      if (adminAlias !== undefined) updates.adminAlias = adminAlias;
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
            isDeveloper: user.name.toLowerCase().includes('dev test') || user.name.toLowerCase().includes('test'),
            adminAlias: null,
            appReplacement: 0
          });
          migrated++;
          migratedCustomers.push({
            customerNumber: newCustomer.customerNumber,
            name: newCustomer.name
          });
          console.log(`[OK] Migrated user to PostgreSQL: ${user.customerNumber} (${user.name})`);
        } catch (error) {
          console.error(`[ERR] Failed to migrate user ${user.customerNumber}:`, error);
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
          console.log(`[CLEANUP] Removed orphaned user: ${user.customerNumber} (${user.name})`);
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
        console.log('\n[WARN] SYNC CHECK: Users and Customers tables are OUT OF SYNC');
        console.log(`   Total users: ${allUsers.length}, Total customers: ${allCustomers.length}`);
        
        if (usersNotInCustomers.length > 0) {
          console.log(`   [ERR] ${usersNotInCustomers.length} users WITHOUT matching customers:`);
          for (const cn of usersNotInCustomers) {
            const user = allUsers.find(u => u.customerNumber === cn);
            console.log(`      - ${cn} (${user?.name || 'Unknown'})`);
          }
        }
        
        if (customersNotInUsers.length > 0) {
          console.log(`   [ERR] ${customersNotInUsers.length} customers WITHOUT matching users:`);
          for (const cn of customersNotInUsers) {
            const customer = allCustomers.find(c => c.customerNumber === cn);
            console.log(`      - ${cn} (${customer?.name || 'Unknown'})`);
          }
        }
        
        console.log('   [TIP] Run POST /api/admin/fix-sync to remove orphaned users\n');
      } else {
        console.log(`[OK] SYNC CHECK: All ${allUsers.length} users match ${allCustomers.length} customers\n`);
      }
    } catch (error) {
      console.error('Error checking sync:', error);
    }
  })();
  
  return httpServer;
}
