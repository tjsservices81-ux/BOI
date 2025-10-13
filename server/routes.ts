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
    
    // Generate start_url with access code if present
    const startUrl = accessCode ? `/?access=${accessCode}` : '/';
    
    // Log for debugging
    console.log(`Manifest requested - Access code: ${accessCode || 'none'}, Start URL: ${startUrl}`);
    
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
                console.log(`🔒 CUSTOMER DELETED - FORCING LOGOUT VIA HEARTBEAT: ${user.customerNumber}`);
                
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

      // 1. Check user exists in memory (users table)
      const user = await storage.getUserByCustomerNumber(customerNumber);
      if (!user) {
        console.log(`❌ USER NOT FOUND IN MEMORY: ${customerNumber}`);
        return false; // User doesn't exist in memory
      }

      // 2. Check customer exists in PostgreSQL (customers table)
      const customer = await storage.getCustomerByCustomerNumber(customerNumber);
      if (!customer) {
        console.log(`❌ CUSTOMER NOT FOUND IN POSTGRESQL: ${customerNumber}`);
        return false; // Customer doesn't exist in database
      }

      // 3. Verify they match (same customerNumber)
      if (customer.customerNumber !== user.customerNumber) {
        console.error(`🔥 DATA MISMATCH: User has ${user.customerNumber} but DB has ${customer.customerNumber}`);
        return false; // Data mismatch - logout for safety
      }

      // 4. Check if customer is soft-deleted
      if (customer.isDeleted) {
        console.log(`🗑️ CUSTOMER SOFT-DELETED: ${customerNumber}`);
        return false; // Customer is marked as deleted
      }

      // All checks passed - user and customer are properly linked
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
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - User ID:', req.session?.userId);
    console.log('Auth check - Full session:', req.session);
    
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

  // Get user accounts
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
          console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${accountUser.customerNumber} tried to transfer`);
          
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

          console.log(`✅ USER CREATED IN MEMORY with matching ID: ${newUser.id} (customerNumber: ${newUser.customerNumber})`);

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

  // Admin Panel V2 - Brand new route to bypass browser cache
  app.get("/admin-panel-v2", async (req, res) => {
    console.log('🔵 ADMIN ROUTE HIT - /admin-panel-v2', req.query);
    
    // CRITICAL: Set headers to prevent Vite/React from interfering
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Check if admin is authenticated via URL token
    const isAuthenticated = req.query.auth === 'verified';
    const hasError = req.query.error === 'invalid';
    
    console.log('🔵 Auth status:', isAuthenticated, 'Error:', hasError);
    
    if (!isAuthenticated) {
      const loginPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<title>Admin Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#126987;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.login-box{background:#fff;border-radius:12px;padding:30px;max-width:350px;width:100%;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
.login-box h1{color:#126987;font-size:24px;margin-bottom:8px}
.login-box p{color:#666;font-size:14px;margin-bottom:24px}
.form-group{margin-bottom:16px}
.form-group label{display:block;color:#666;font-size:12px;font-weight:600;margin-bottom:6px}
.form-group input{width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:16px;font-family:monospace;letter-spacing:2px}
.btn-login{width:100%;background:#126987;color:#fff;border:none;padding:14px;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer}
.btn-login:active{background:#0d4d66}
.error{background:#f8d7da;color:#721c24;padding:10px;border-radius:6px;margin-bottom:16px;font-size:13px;display:none}
.error.show{display:block}
</style>
</head>
<body>
<div class="login-box">
<h1>Admin Login</h1>
<p>Enter PIN to access oversight</p>
${hasError ? '<div class="error show">Invalid PIN. Please try again.</div>' : ''}
<form action="/api/admin/login-v2" method="POST">
<div class="form-group">
<label>PIN Code</label>
<input type="text" name="pin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required autofocus>
</div>
<button type="submit" class="btn-login">Login</button>
</form>
</div>
</body>
</html>`;
      return res.send(loginPage);
    }

    const adminPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<title>Bank of Ireland - Admin Panel</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f7fa;overflow:hidden;width:100vw;height:100vh;display:flex;flex-direction:column}

/* Header */
.hdr{background:linear-gradient(135deg,#126987 0%,#0d4d66 100%);color:#fff;padding:16px 20px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
.hdr h1{font-size:20px;font-weight:700;margin-bottom:6px;letter-spacing:-0.5px}
.hdr-top{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.hdr-stats{display:flex;gap:12px;flex-wrap:wrap}
.stat-chip{background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;backdrop-filter:blur(10px)}
.hdr-actions{display:flex;gap:8px}
.btn{background:#fff;color:#126987;border:none;padding:7px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
.btn:hover{transform:translateY(-1px);box-shadow:0 4px 8px rgba(0,0,0,0.15)}
.btn-danger{background:#dc3545;color:#fff}
.btn-danger:hover{background:#c82333}

/* Stats Dashboard */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:16px;background:#fff;margin:12px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08)}
.stat-card{background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);padding:14px;border-radius:10px;border-left:4px solid #126987}
.stat-card.active{border-left-color:#28a745;background:linear-gradient(135deg,#d4edda 0%,#c3e6cb 100%)}
.stat-card.deleted{border-left-color:#dc3545;background:linear-gradient(135deg,#f8d7da 0%,#f5c6cb 100%)}
.stat-card.dev{border-left-color:#ffc107;background:linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)}
.stat-label{font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.stat-value{font-size:26px;font-weight:700;color:#000;margin-top:4px}

/* Search & Filters */
.filter-section{padding:0 16px;margin-bottom:12px}
.search-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.search-box{position:relative}
.search-box input{width:100%;padding:10px 12px 10px 36px;border:2px solid #e0e0e0;border-radius:10px;font-size:14px;transition:all 0.2s;background:#fff}
.search-box input:focus{outline:none;border-color:#126987;box-shadow:0 0 0 3px rgba(18,105,135,0.1)}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#999;font-size:16px}
.filter-tabs{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
.filter-tab{background:#fff;border:2px solid #e0e0e0;color:#666;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s}
.filter-tab.active{background:#126987;border-color:#126987;color:#fff}
.filter-tab:hover:not(.active){border-color:#126987;color:#126987}

/* OTC Section */
.otc-section{padding:0 16px;margin-bottom:12px}
.otc-container{background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 6px rgba(0,0,0,0.08)}
.otc-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.otc-header h2{font-size:16px;color:#126987;font-weight:700}
.otc-badge{background:#ffc107;color:#000;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
.otc-grid{display:grid;gap:10px}
.otc-card{background:linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%);border-radius:10px;padding:14px;border-left:4px solid #ffc107;box-shadow:0 2px 4px rgba(0,0,0,0.06)}
.otc-customer{font-size:12px;color:#856404;font-weight:600;margin-bottom:6px}
.otc-code{font-size:26px;font-weight:700;color:#000;font-family:'SF Mono',Monaco,monospace;letter-spacing:4px;margin:6px 0}
.otc-timer{font-size:11px;color:#dc3545;font-weight:600}
.otc-empty{text-align:center;color:#999;font-size:13px;padding:20px}

/* Customer List */
.customer-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px 16px 16px}
.customer-card{background:#fff;border-radius:12px;margin-bottom:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08);overflow:hidden;transition:all 0.2s}
.customer-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.12)}
.customer-header{padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:#fff}
.customer-info{flex:1;min-width:0}
.customer-name{font-weight:700;font-size:15px;color:#000;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.customer-number{font-size:12px;color:#666;font-family:'SF Mono',Monaco,monospace;margin-bottom:2px}
.customer-alias{font-size:11px;color:#126987;font-weight:600}
.customer-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase}
.badge-active{background:#d4edda;color:#155724}
.badge-deleted{background:#f8d7da;color:#721c24}
.badge-dev{background:#fff3cd;color:#856404}
.active-pulse{display:inline-block;width:8px;height:8px;background:#28a745;border-radius:50%;margin-left:6px;animation:pulse 2s infinite}
.expand-icon{color:#126987;font-size:18px;transition:transform 0.3s;font-weight:700}
.expand-icon.expanded{transform:rotate(180deg)}
.customer-details{max-height:0;overflow:hidden;transition:all 0.3s;background:#f9fafb}
.customer-details.expanded{max-height:600px;overflow-y:auto}
.details-content{padding:16px}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #e0e0e0}
.detail-row:last-child{border-bottom:none}
.detail-label{color:#666;font-weight:600}
.detail-value{color:#000;font-weight:600;text-align:right;max-width:60%;word-break:break-all}
.detail-section{margin-top:16px;padding-top:16px;border-top:2px solid #e0e0e0}
.section-title{font-size:12px;color:#666;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px}
.input-group{margin-bottom:12px}
.input-group label{display:block;font-size:11px;color:#666;margin-bottom:6px;font-weight:600}
.input-group input,.input-group select{width:100%;padding:8px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;transition:border-color 0.2s}
.input-group input:focus,.input-group select:focus{outline:none;border-color:#126987}
.input-row{display:flex;gap:8px;align-items:flex-end}
.input-row input,.input-row select{flex:1}
.btn-save{background:#28a745;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-save:hover{background:#218838}
.btn-delete{background:#dc3545;color:#fff;border:none;padding:10px;border-radius:8px;width:100%;margin-top:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-delete:hover{background:#c82333}
.btn-restore{background:#17a2b8;color:#fff;border:none;padding:10px;border-radius:8px;width:100%;margin-bottom:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-restore:hover{background:#138496}
.map-thumb{width:100%;height:120px;background:#e9ecef;border-radius:10px;margin-top:10px;position:relative;overflow:hidden;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
.map-thumb img{width:100%;height:100%;object-fit:cover}
.map-info{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.8),transparent);color:#fff;padding:8px 12px;font-size:11px;font-weight:600}
.map-modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:1000;align-items:center;justify-content:center}
.map-modal.show{display:flex}
.map-modal-content{width:90%;max-width:700px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3)}
.map-modal-header{background:linear-gradient(135deg,#126987 0%,#0d4d66 100%);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.map-modal-header h3{font-size:17px;font-weight:700}
.map-close{background:rgba(255,255,255,0.2);border:none;color:#fff;font-size:28px;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
.map-close:hover{background:rgba(255,255,255,0.3)}
.map-modal-body{height:450px}
.map-modal-body img{width:100%;height:100%;object-fit:cover}
.empty-state{background:#fff;border-radius:12px;padding:60px 20px;text-align:center;color:#999;box-shadow:0 2px 6px rgba(0,0,0,0.08)}
.empty-state-icon{font-size:48px;margin-bottom:16px;opacity:0.5}
.empty-state-text{font-size:15px;font-weight:600}
.profile-clicks{margin-top:12px}
.click-item{font-size:11px;color:#666;padding:4px 0;border-bottom:1px solid #f0f0f0}
.click-item:last-child{border-bottom:none}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
</style>
</head>
<body>
<div class="hdr">
<h1>🏦 Bank of Ireland - Admin Panel</h1>
<div class="hdr-top">
<div class="hdr-stats">
<div class="stat-chip" id="totalStat">Total: 0</div>
<div class="stat-chip" id="activeStat">Active: 0</div>
<div class="stat-chip" id="deletedStat">Deleted: 0</div>
</div>
<div class="hdr-actions">
<button class="btn" onclick="ld()">↻ Refresh</button>
<button class="btn btn-danger" onclick="deleteAll()">Delete All</button>
<button class="btn" onclick="logout()">Logout</button>
</div>
</div>
</div>

<!-- Stats Dashboard -->
<div class="stats-grid">
<div class="stat-card">
<div class="stat-label">Total Customers</div>
<div class="stat-value" id="statTotal">0</div>
</div>
<div class="stat-card active">
<div class="stat-label">Active</div>
<div class="stat-value" id="statActive">0</div>
</div>
<div class="stat-card deleted">
<div class="stat-label">Deleted</div>
<div class="stat-value" id="statDeleted">0</div>
</div>
<div class="stat-card dev">
<div class="stat-label">Developer</div>
<div class="stat-value" id="statDev">0</div>
</div>
</div>

<!-- Search & Filters -->
<div class="filter-section">
<div class="search-grid">
<div class="search-box">
<span class="search-icon">🔍</span>
<input type="text" id="searchAlias" placeholder="Search by alias..." oninput="applyFilters()">
</div>
<div class="search-box">
<span class="search-icon">👤</span>
<input type="text" id="searchName" placeholder="Search by customer name..." oninput="applyFilters()">
</div>
</div>
<div class="filter-tabs">
<div class="filter-tab active" onclick="setFilter('all')">All Customers</div>
<div class="filter-tab" onclick="setFilter('active')">Active Only</div>
<div class="filter-tab" onclick="setFilter('deleted')">Deleted Only</div>
<div class="filter-tab" onclick="setFilter('developer')">Developer Accounts</div>
<div class="filter-tab" onclick="setFilter('real')">Real Customers</div>
</div>
</div>

<!-- OTC Section -->
<div class="otc-section">
<div class="otc-container">
<div class="otc-header">
<h2>🔑 Active Access Codes</h2>
<div class="otc-badge" id="otcCount">0</div>
</div>
<div class="otc-grid" id="otcList">
<div class="otc-empty">No active access codes</div>
</div>
</div>
</div>

<!-- Customer List -->
<div class="customer-list" id="customerList">
<div class="empty-state">
<div class="empty-state-icon">👥</div>
<div class="empty-state-text">Loading customers...</div>
</div>
</div>
<div class="map-modal" id="mapModal">
<div class="map-modal-content">
<div class="map-modal-header">
<h3 id="mapTitle">Customer Location</h3>
<button class="map-close" onclick="closeMap()">×</button>
</div>
<div class="map-modal-body">
<img id="mapImage" src="" alt="Location Map">
</div>
</div>
</div>
<script>
let expandedCards=new Set();
let allCustomers=[];
let currentFilter='all';

function escapeHtml(text){
  const map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
  return String(text).replace(/[&<>"']/g,m=>map[m]);
}

// Toggle customer card expansion
function toggleCard(id){
  const details=document.getElementById('details'+id);
  const icon=document.getElementById('icon'+id);
  if(expandedCards.has(id)){
    details.classList.remove('expanded');
    icon.classList.remove('expanded');
    expandedCards.delete(id);
  }else{
    details.classList.add('expanded');
    icon.classList.add('expanded');
    expandedCards.add(id);
  }
}

// Set category filter
function setFilter(filter){
  currentFilter=filter;
  document.querySelectorAll('.filter-tab').forEach(tab=>{
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  applyFilters();
}

// Apply all filters (search + category)
function applyFilters(){
  const aliasSearch=document.getElementById('searchAlias').value.toLowerCase();
  const nameSearch=document.getElementById('searchName').value.toLowerCase();
  
  let filtered=allCustomers.filter(c=>{
    // Search filters
    const matchesAlias=!aliasSearch||(c.adminAlias||'').toLowerCase().includes(aliasSearch);
    const matchesName=!nameSearch||c.name.toLowerCase().includes(nameSearch);
    if(!matchesAlias||!matchesName)return false;
    
    // Category filters
    if(currentFilter==='active')return!c.isDeleted;
    if(currentFilter==='deleted')return c.isDeleted;
    if(currentFilter==='developer')return c.isDeveloper;
    if(currentFilter==='real')return!c.isDeveloper;
    return true; // 'all'
  });
  
  renderCustomers(filtered);
  updateStats();
}

// Update statistics dashboard
function updateStats(){
  const total=allCustomers.length;
  const active=allCustomers.filter(c=>!c.isDeleted).length;
  const deleted=allCustomers.filter(c=>c.isDeleted).length;
  const dev=allCustomers.filter(c=>c.isDeveloper).length;
  
  document.getElementById('statTotal').textContent=total;
  document.getElementById('statActive').textContent=active;
  document.getElementById('statDeleted').textContent=deleted;
  document.getElementById('statDev').textContent=dev;
  
  document.getElementById('totalStat').textContent='Total: '+total;
  document.getElementById('activeStat').textContent='Active: '+active;
  document.getElementById('deletedStat').textContent='Deleted: '+deleted;
}

// Render customer list
function renderCustomers(customers){
  const container=document.getElementById('customerList');
  if(!customers.length){
    container.innerHTML='<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No customers found</div></div>';
    return;
  }
  
  let html='';
  customers.forEach((c,idx)=>{
    const safeId='c'+idx;
    const isExpanded=expandedCards.has(safeId);
    
    // Check if recently active (profile clicked in last 5 min)
    let isActive=false;
    if(c.profileClickHistory&&Array.isArray(c.profileClickHistory)&&c.profileClickHistory.length>0){
      const lastClick=new Date(c.profileClickHistory[0]);
      const now=new Date();
      isActive=(now-lastClick)<300000;
    }
    
    html+=\`<div class="customer-card">
      <div class="customer-header" onclick="toggleCard('\${safeId}')">
        <div class="customer-info">
          <div class="customer-name">
            \${escapeHtml(c.name)}
            \${isActive?'<span class="active-pulse"></span>':''}
          </div>
          <div class="customer-number">\${escapeHtml(c.customerNumber)}</div>
          \${c.adminAlias?\`<div class="customer-alias">📝 \${escapeHtml(c.adminAlias)}</div>\`:''}
          <div class="customer-badges">
            \${!c.isDeleted?\`<span class="badge badge-active">Active</span>\`:\`<span class="badge badge-deleted">Deleted</span>\`}
            \${c.isDeveloper?\`<span class="badge badge-dev">Developer</span>\`:''}
          </div>
        </div>
        <div class="expand-icon \${isExpanded?'expanded':''}" id="icon\${safeId}">▼</div>
      </div>
      <div class="customer-details \${isExpanded?'expanded':''}" id="details\${safeId}">
        <div class="details-content">
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">\${escapeHtml(c.email)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone</span>
            <span class="detail-value">\${escapeHtml(c.phone||'N/A')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Currency</span>
            <span class="detail-value">\${escapeHtml(c.currency)}</span>
          </div>
          \${c.profileClickHistory&&Array.isArray(c.profileClickHistory)&&c.profileClickHistory.length>0?\`
          <div class="detail-section">
            <div class="section-title">📱 Recent Activity</div>
            <div class="profile-clicks">
              \${c.profileClickHistory.map((click,i)=>{
                const date=new Date(click);
                const formatted=date.toLocaleString('en-GB',{
                  day:'2-digit',month:'2-digit',year:'numeric',
                  hour:'2-digit',minute:'2-digit',hour12:false
                });
                return \`<div class="click-item">\${i+1}. \${formatted}</div>\`;
              }).join('')}
            </div>
          </div>
          \`:''}
          \${c.lastLatitude&&c.lastLongitude?\`
          <div class="detail-section">
            <div class="section-title">📍 Last Known Location</div>
            <div class="map-thumb" onclick="showMap('\${c.lastLatitude}','\${c.lastLongitude}','\${escapeHtml(c.name)}')">
              <img src="https://static-maps.yandex.ru/1.x/?ll=\${c.lastLongitude},\${c.lastLatitude}&size=400,120&z=14&l=map&pt=\${c.lastLongitude},\${c.lastLatitude},pm2rdm" alt="Map">
              <div class="map-info">📍 \${c.lastLatitude}, \${c.lastLongitude}</div>
            </div>
          </div>
          \`:''}
          <div class="detail-section">
            <div class="section-title">⚙️ Admin Settings</div>
            <div class="input-group">
              <label>Admin Name/Alias</label>
              <div class="input-row">
                <input type="text" id="alias-\${safeId}" value="\${escapeHtml(c.adminAlias||'')}" placeholder="Internal notes...">
                <button class="btn-save" onclick="saveAdmin('\${escapeHtml(c.customerNumber)}','\${safeId}')">Save</button>
              </div>
            </div>
            <div class="input-group">
              <label>App Replacement (0-5)</label>
              <div class="input-row">
                <select id="rep-\${safeId}">
                  <option value="0" \${(c.appReplacement||0)===0?'selected':''}>0</option>
                  <option value="1" \${c.appReplacement===1?'selected':''}>1</option>
                  <option value="2" \${c.appReplacement===2?'selected':''}>2</option>
                  <option value="3" \${c.appReplacement===3?'selected':''}>3</option>
                  <option value="4" \${c.appReplacement===4?'selected':''}>4</option>
                  <option value="5" \${c.appReplacement===5?'selected':''}>5</option>
                </select>
                <button class="btn-save" onclick="saveAdmin('\${escapeHtml(c.customerNumber)}','\${safeId}')">Save</button>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">🗑️ Account Actions</div>
            \${c.isDeleted?\`
              <button class="btn-restore" onclick="restoreCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">♻️ Restore Account</button>
              <button class="btn-delete" onclick="eraseCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">🔥 Erase Forever</button>
            \`:\`
              <button class="btn-delete" onclick="deleteCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">🗑️ Delete Account</button>
            \`}
          </div>
        </div>
      </div>
    </div>\`;
  });
  container.innerHTML=html;
}

// Load OTC codes
async function loadOTC(){
  try{
    const res=await fetch('/api/admin/active-otcs');
    const data=await res.json();
    const otcList=document.getElementById('otcList');
    const otcCount=document.getElementById('otcCount');
    
    if(!data.otcs||!data.otcs.length){
      otcList.innerHTML='<div class="otc-empty">No active access codes</div>';
      otcCount.textContent='0';
      return;
    }
    
    otcCount.textContent=data.otcs.length;
    let html='';
    data.otcs.forEach(otc=>{
      html+=\`<div class="otc-card">
        <div class="otc-customer">\${escapeHtml(otc.accountData.name)} - \${escapeHtml(otc.customerNumber)}</div>
        <div class="otc-code">\${escapeHtml(otc.code)}</div>
        <div class="otc-timer">⏱️ Expires in: \${escapeHtml(otc.timeRemaining)}</div>
      </div>\`;
    });
    otcList.innerHTML=html;
  }catch(e){
    document.getElementById('otcList').innerHTML='<div class="otc-empty">Error loading codes</div>';
  }
}

// Load all customers
async function ld(){
  try{
    const res=await fetch('/api/customers');
    const data=await res.json();
    allCustomers=data.sort((a,b)=>parseInt(a.customerNumber)-parseInt(b.customerNumber));
    applyFilters();
    loadOTC();
  }catch(e){
    document.getElementById('customerList').innerHTML='<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Error loading customers</div></div>';
  }
}

// Save admin settings
async function saveAdmin(customerNumber,safeId){
  try{
    const alias=document.getElementById('alias-'+safeId).value;
    const rep=parseInt(document.getElementById('rep-'+safeId).value);
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber)+'/admin',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({adminAlias:alias,appReplacement:rep})
    });
    const data=await res.json();
    if(res.ok){
      alert('✅ Settings saved successfully');
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error saving settings');
  }
}

// Delete customer
async function deleteCustomer(customerNumber,name){
  console.log('🗑️ DELETE REQUEST -',customerNumber,name);
  const confirmed=confirm(\`⚠️ CONFIRM SOFT-DELETE\n\nCustomer: \${name}\nCustomer Number: \${customerNumber}\n\nThis will:\n- Mark customer as deleted\n- Force immediate logout\n- Keep data for recovery\n\nVerify the customer number above is correct.\`);
  if(!confirmed)return;
  const reason=prompt('Reason for deletion (optional):','Deleted by admin');
  try{
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber),{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({reason:reason||'Deleted by admin'})
    });
    const data=await res.json();
    if(res.ok){
      alert(\`✅ DELETED: \${data.name} (\${data.customerNumber})\`);
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error: '+e.message);
  }
}

// Restore customer
async function restoreCustomer(customerNumber,name){
  console.log('♻️ RESTORE REQUEST -',customerNumber,name);
  const confirmed=confirm(\`♻️ CONFIRM RESTORE\n\nCustomer: \${name}\nCustomer Number: \${customerNumber}\n\nThis will reactivate the customer account.\`);
  if(!confirmed)return;
  try{
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber)+'/restore',{method:'POST'});
    const data=await res.json();
    if(res.ok){
      alert(\`♻️ RESTORED: \${data.name} (\${data.customerNumber})\`);
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error: '+e.message);
  }
}

// Permanently erase customer
async function eraseCustomer(customerNumber,name){
  console.log('🔥 ERASE REQUEST -',customerNumber,name);
  const confirmed=confirm(\`🔥 CONFIRM PERMANENT ERASE\n\nCustomer: \${name}\nCustomer Number: \${customerNumber}\n\nThis is IRREVERSIBLE and will:\n- Delete ALL customer data permanently\n- Cannot be recovered\n\nVerify the customer number above is correct.\`);
  if(!confirmed)return;
  const doubleCheck=confirm(\`⚠️ FINAL CONFIRMATION\n\nYou are about to PERMANENTLY ERASE:\n\${name} (\${customerNumber})\n\nThis cannot be undone. Proceed?\`);
  if(!doubleCheck)return;
  try{
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber)+'/permanent',{method:'DELETE'});
    const data=await res.json();
    if(res.ok){
      alert(\`🔥 PERMANENTLY ERASED: \${data.name} (\${data.customerNumber})\`);
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error: '+e.message);
  }
}

// Delete all customers
async function deleteAll(){
  const first=confirm(\`DELETE ALL CUSTOMERS?\n\nWARNING: This will permanently delete ALL customers from both tables.\n\nThis action is IRREVERSIBLE.\`);
  if(!first)return;
  const second=confirm('FINAL WARNING\n\nType DELETE in the next prompt to confirm.');
  if(!second)return;
  const confirmation=prompt('Type DELETE to confirm:');
  if(confirmation!=='DELETE')return;
  try{
    const res=await fetch('/api/admin/delete-all-customers',{method:'DELETE'});
    const data=await res.json();
    if(res.ok){
      alert(\`All customers deleted\n\nCustomers: \${data.customersDeleted}\nUsers: \${data.usersDeleted}\`);
      ld();
    }else{
      alert('Failed: '+data.message);
    }
  }catch(e){
    alert('Error: '+e.message);
  }
}

// Logout
async function logout(){
  try{
    await fetch('/api/admin/logout',{method:'POST'});
    window.location.href='/admin-panel-v2';
  }catch(e){
    alert('Error logging out');
  }
}

// Show map modal
function showMap(lat,lng,name){
  document.getElementById('mapTitle').textContent=name+' - Location ('+lat+', '+lng+')';
  document.getElementById('mapImage').src='https://static-maps.yandex.ru/1.x/?ll='+lng+','+lat+'&size=700,450&z=15&l=map&pt='+lng+','+lat+',pm2rdm';
  document.getElementById('mapModal').classList.add('show');
}

// Close map modal
function closeMap(){
  document.getElementById('mapModal').classList.remove('show');
}

// Initialize
ld();
setInterval(loadOTC,5000);
setInterval(ld,5000);
</script>
</body>
</html>`;
    
    // CRITICAL: Return to stop middleware chain and prevent Vite interference
    return res.status(200).type('html').send(adminPage);
  });

  // Admin login for new panel
  app.post("/api/admin/login-v2", async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (pin === "270309200207") {
        res.redirect('/admin-panel-v2?auth=verified');
      } else {
        res.redirect('/admin-panel-v2?error=invalid');
      }
    } catch (error) {
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  // DEBUG: Simple test page to show customers work
  app.get("/test-customers", async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    
    try {
      const customers = await storage.getAllCustomers();
      
      let html = `<!DOCTYPE html>
<html>
<head>
<title>Customer Test</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:monospace;padding:20px;background:#000;color:#0f0}
.customer{border:1px solid #0f0;margin:10px 0;padding:10px}
.name{font-size:18px;font-weight:bold}
.number{color:#ff0}
</style>
</head>
<body>
<h1>🔍 CUSTOMER DATA TEST</h1>
<p>Total Customers Found: <strong>${customers.length}</strong></p>
<hr>`;
      
      customers.slice(0, 10).forEach(c => {
        html += `<div class="customer">
<div class="name">${c.name}</div>
<div class="number">Customer #: ${c.customerNumber}</div>
<div>Email: ${c.email}</div>
<div>Deleted: ${c.isDeleted ? 'YES' : 'NO'}</div>
</div>`;
      });
      
      html += `<hr><p>Showing first 10 of ${customers.length} customers</p>
<button onclick="location.href='/admin-panel-v2'">Go to Admin Panel</button>
</body></html>`;
      
      return res.send(html);
    } catch (error) {
      return res.send(`<h1>ERROR</h1><pre>${error}</pre>`);
    }
  });

  // OLD Admin Oversight - iPhone Optimized (KEEP THIS FOR OLD ROUTE)
  app.get("/admin-oversight", async (req, res) => {
    // CRITICAL: Set headers to prevent Vite/React from interfering
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Check if admin is authenticated via URL token
    const isAuthenticated = req.query.auth === 'verified';
    const hasError = req.query.error === 'invalid';
    
    if (!isAuthenticated) {
      const loginPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<title>Admin Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#126987;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.login-box{background:#fff;border-radius:12px;padding:30px;max-width:350px;width:100%;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
.login-box h1{color:#126987;font-size:24px;margin-bottom:8px}
.login-box p{color:#666;font-size:14px;margin-bottom:24px}
.form-group{margin-bottom:16px}
.form-group label{display:block;color:#666;font-size:12px;font-weight:600;margin-bottom:6px}
.form-group input{width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:16px;font-family:monospace;letter-spacing:2px}
.btn-login{width:100%;background:#126987;color:#fff;border:none;padding:14px;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer}
.btn-login:active{background:#0d4d66}
.error{background:#f8d7da;color:#721c24;padding:10px;border-radius:6px;margin-bottom:16px;font-size:13px;display:none}
.error.show{display:block}
</style>
</head>
<body>
<div class="login-box">
<h1>Admin Login</h1>
<p>Enter PIN to access oversight</p>
${hasError ? '<div class="error show">Invalid PIN. Please try again.</div>' : ''}
<form action="/api/admin/login" method="POST">
<div class="form-group">
<label>PIN Code</label>
<input type="text" name="pin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required autofocus>
</div>
<button type="submit" class="btn-login">Login</button>
</form>
</div>
</body>
</html>`;
      return res.send(loginPage);
    }

    const adminPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<title>Bank of Ireland - Admin Panel</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f7fa;overflow:hidden;width:100vw;height:100vh;display:flex;flex-direction:column}

/* Header */
.hdr{background:linear-gradient(135deg,#126987 0%,#0d4d66 100%);color:#fff;padding:16px 20px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
.hdr h1{font-size:20px;font-weight:700;margin-bottom:6px;letter-spacing:-0.5px}
.hdr-top{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.hdr-stats{display:flex;gap:12px;flex-wrap:wrap}
.stat-chip{background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;backdrop-filter:blur(10px)}
.hdr-actions{display:flex;gap:8px}
.btn{background:#fff;color:#126987;border:none;padding:7px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
.btn:hover{transform:translateY(-1px);box-shadow:0 4px 8px rgba(0,0,0,0.15)}
.btn-danger{background:#dc3545;color:#fff}
.btn-danger:hover{background:#c82333}

/* Stats Dashboard */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:16px;background:#fff;margin:12px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08)}
.stat-card{background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);padding:14px;border-radius:10px;border-left:4px solid #126987}
.stat-card.active{border-left-color:#28a745;background:linear-gradient(135deg,#d4edda 0%,#c3e6cb 100%)}
.stat-card.deleted{border-left-color:#dc3545;background:linear-gradient(135deg,#f8d7da 0%,#f5c6cb 100%)}
.stat-card.dev{border-left-color:#ffc107;background:linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)}
.stat-label{font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.stat-value{font-size:26px;font-weight:700;color:#000;margin-top:4px}

/* Search & Filters */
.filter-section{padding:0 16px;margin-bottom:12px}
.search-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.search-box{position:relative}
.search-box input{width:100%;padding:10px 12px 10px 36px;border:2px solid #e0e0e0;border-radius:10px;font-size:14px;transition:all 0.2s;background:#fff}
.search-box input:focus{outline:none;border-color:#126987;box-shadow:0 0 0 3px rgba(18,105,135,0.1)}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#999;font-size:16px}
.filter-tabs{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
.filter-tab{background:#fff;border:2px solid #e0e0e0;color:#666;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s}
.filter-tab.active{background:#126987;border-color:#126987;color:#fff}
.filter-tab:hover:not(.active){border-color:#126987;color:#126987}

/* OTC Section */
.otc-section{padding:0 16px;margin-bottom:12px}
.otc-container{background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 6px rgba(0,0,0,0.08)}
.otc-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.otc-header h2{font-size:16px;color:#126987;font-weight:700}
.otc-badge{background:#ffc107;color:#000;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
.otc-grid{display:grid;gap:10px}
.otc-card{background:linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%);border-radius:10px;padding:14px;border-left:4px solid #ffc107;box-shadow:0 2px 4px rgba(0,0,0,0.06)}
.otc-customer{font-size:12px;color:#856404;font-weight:600;margin-bottom:6px}
.otc-code{font-size:26px;font-weight:700;color:#000;font-family:'SF Mono',Monaco,monospace;letter-spacing:4px;margin:6px 0}
.otc-timer{font-size:11px;color:#dc3545;font-weight:600}
.otc-empty{text-align:center;color:#999;font-size:13px;padding:20px}

/* Customer List */
.customer-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px 16px 16px}
.customer-card{background:#fff;border-radius:12px;margin-bottom:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08);overflow:hidden;transition:all 0.2s}
.customer-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.12)}
.customer-header{padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:#fff}
.customer-info{flex:1;min-width:0}
.customer-name{font-weight:700;font-size:15px;color:#000;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.customer-number{font-size:12px;color:#666;font-family:'SF Mono',Monaco,monospace;margin-bottom:2px}
.customer-alias{font-size:11px;color:#126987;font-weight:600}
.customer-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase}
.badge-active{background:#d4edda;color:#155724}
.badge-deleted{background:#f8d7da;color:#721c24}
.badge-dev{background:#fff3cd;color:#856404}
.active-pulse{display:inline-block;width:8px;height:8px;background:#28a745;border-radius:50%;margin-left:6px;animation:pulse 2s infinite}
.expand-icon{color:#126987;font-size:18px;transition:transform 0.3s;font-weight:700}
.expand-icon.expanded{transform:rotate(180deg)}
.customer-details{max-height:0;overflow:hidden;transition:all 0.3s;background:#f9fafb}
.customer-details.expanded{max-height:600px;overflow-y:auto}
.details-content{padding:16px}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #e0e0e0}
.detail-row:last-child{border-bottom:none}
.detail-label{color:#666;font-weight:600}
.detail-value{color:#000;font-weight:600;text-align:right;max-width:60%;word-break:break-all}
.detail-section{margin-top:16px;padding-top:16px;border-top:2px solid #e0e0e0}
.section-title{font-size:12px;color:#666;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px}
.input-group{margin-bottom:12px}
.input-group label{display:block;font-size:11px;color:#666;margin-bottom:6px;font-weight:600}
.input-group input,.input-group select{width:100%;padding:8px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;transition:border-color 0.2s}
.input-group input:focus,.input-group select:focus{outline:none;border-color:#126987}
.input-row{display:flex;gap:8px;align-items:flex-end}
.input-row input,.input-row select{flex:1}
.btn-save{background:#28a745;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-save:hover{background:#218838}
.btn-delete{background:#dc3545;color:#fff;border:none;padding:10px;border-radius:8px;width:100%;margin-top:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-delete:hover{background:#c82333}
.btn-restore{background:#17a2b8;color:#fff;border:none;padding:10px;border-radius:8px;width:100%;margin-bottom:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-restore:hover{background:#138496}
.map-thumb{width:100%;height:120px;background:#e9ecef;border-radius:10px;margin-top:10px;position:relative;overflow:hidden;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
.map-thumb img{width:100%;height:100%;object-fit:cover}
.map-info{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.8),transparent);color:#fff;padding:8px 12px;font-size:11px;font-weight:600}
.map-modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:1000;align-items:center;justify-content:center}
.map-modal.show{display:flex}
.map-modal-content{width:90%;max-width:700px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3)}
.map-modal-header{background:linear-gradient(135deg,#126987 0%,#0d4d66 100%);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.map-modal-header h3{font-size:17px;font-weight:700}
.map-close{background:rgba(255,255,255,0.2);border:none;color:#fff;font-size:28px;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
.map-close:hover{background:rgba(255,255,255,0.3)}
.map-modal-body{height:450px}
.map-modal-body img{width:100%;height:100%;object-fit:cover}
.empty-state{background:#fff;border-radius:12px;padding:60px 20px;text-align:center;color:#999;box-shadow:0 2px 6px rgba(0,0,0,0.08)}
.empty-state-icon{font-size:48px;margin-bottom:16px;opacity:0.5}
.empty-state-text{font-size:15px;font-weight:600}
.profile-clicks{margin-top:12px}
.click-item{font-size:11px;color:#666;padding:4px 0;border-bottom:1px solid #f0f0f0}
.click-item:last-child{border-bottom:none}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
</style>
</head>
<body>
<div class="hdr">
<h1>🏦 Bank of Ireland - Admin Panel</h1>
<div class="hdr-top">
<div class="hdr-stats">
<div class="stat-chip" id="totalStat">Total: 0</div>
<div class="stat-chip" id="activeStat">Active: 0</div>
<div class="stat-chip" id="deletedStat">Deleted: 0</div>
</div>
<div class="hdr-actions">
<button class="btn" onclick="ld()">↻ Refresh</button>
<button class="btn btn-danger" onclick="deleteAll()">Delete All</button>
<button class="btn" onclick="logout()">Logout</button>
</div>
</div>
</div>

<!-- Stats Dashboard -->
<div class="stats-grid">
<div class="stat-card">
<div class="stat-label">Total Customers</div>
<div class="stat-value" id="statTotal">0</div>
</div>
<div class="stat-card active">
<div class="stat-label">Active</div>
<div class="stat-value" id="statActive">0</div>
</div>
<div class="stat-card deleted">
<div class="stat-label">Deleted</div>
<div class="stat-value" id="statDeleted">0</div>
</div>
<div class="stat-card dev">
<div class="stat-label">Developer</div>
<div class="stat-value" id="statDev">0</div>
</div>
</div>

<!-- Search & Filters -->
<div class="filter-section">
<div class="search-grid">
<div class="search-box">
<span class="search-icon">🔍</span>
<input type="text" id="searchAlias" placeholder="Search by alias..." oninput="applyFilters()">
</div>
<div class="search-box">
<span class="search-icon">👤</span>
<input type="text" id="searchName" placeholder="Search by customer name..." oninput="applyFilters()">
</div>
</div>
<div class="filter-tabs">
<div class="filter-tab active" onclick="setFilter('all')">All Customers</div>
<div class="filter-tab" onclick="setFilter('active')">Active Only</div>
<div class="filter-tab" onclick="setFilter('deleted')">Deleted Only</div>
<div class="filter-tab" onclick="setFilter('developer')">Developer Accounts</div>
<div class="filter-tab" onclick="setFilter('real')">Real Customers</div>
</div>
</div>

<!-- OTC Section -->
<div class="otc-section">
<div class="otc-container">
<div class="otc-header">
<h2>🔑 Active Access Codes</h2>
<div class="otc-badge" id="otcCount">0</div>
</div>
<div class="otc-grid" id="otcList">
<div class="otc-empty">No active access codes</div>
</div>
</div>
</div>

<!-- Customer List -->
<div class="customer-list" id="customerList">
<div class="empty-state">
<div class="empty-state-icon">👥</div>
<div class="empty-state-text">Loading customers...</div>
</div>
</div>
<div class="map-modal" id="mapModal">
<div class="map-modal-content">
<div class="map-modal-header">
<h3 id="mapTitle">Customer Location</h3>
<button class="map-close" onclick="closeMap()">×</button>
</div>
<div class="map-modal-body">
<img id="mapImage" src="" alt="Location Map">
</div>
</div>
</div>
<script>
let expandedCards=new Set();
let allCustomers=[];
let currentFilter='all';

function escapeHtml(text){
  const map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
  return String(text).replace(/[&<>"']/g,m=>map[m]);
}

// Toggle customer card expansion
function toggleCard(id){
  const details=document.getElementById('details'+id);
  const icon=document.getElementById('icon'+id);
  if(expandedCards.has(id)){
    details.classList.remove('expanded');
    icon.classList.remove('expanded');
    expandedCards.delete(id);
  }else{
    details.classList.add('expanded');
    icon.classList.add('expanded');
    expandedCards.add(id);
  }
}

// Set category filter
function setFilter(filter){
  currentFilter=filter;
  document.querySelectorAll('.filter-tab').forEach(tab=>{
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  applyFilters();
}

// Apply all filters (search + category)
function applyFilters(){
  const aliasSearch=document.getElementById('searchAlias').value.toLowerCase();
  const nameSearch=document.getElementById('searchName').value.toLowerCase();
  
  let filtered=allCustomers.filter(c=>{
    // Search filters
    const matchesAlias=!aliasSearch||(c.adminAlias||'').toLowerCase().includes(aliasSearch);
    const matchesName=!nameSearch||c.name.toLowerCase().includes(nameSearch);
    if(!matchesAlias||!matchesName)return false;
    
    // Category filters
    if(currentFilter==='active')return!c.isDeleted;
    if(currentFilter==='deleted')return c.isDeleted;
    if(currentFilter==='developer')return c.isDeveloper;
    if(currentFilter==='real')return!c.isDeveloper;
    return true; // 'all'
  });
  
  renderCustomers(filtered);
  updateStats();
}

// Update statistics dashboard
function updateStats(){
  const total=allCustomers.length;
  const active=allCustomers.filter(c=>!c.isDeleted).length;
  const deleted=allCustomers.filter(c=>c.isDeleted).length;
  const dev=allCustomers.filter(c=>c.isDeveloper).length;
  
  document.getElementById('statTotal').textContent=total;
  document.getElementById('statActive').textContent=active;
  document.getElementById('statDeleted').textContent=deleted;
  document.getElementById('statDev').textContent=dev;
  
  document.getElementById('totalStat').textContent='Total: '+total;
  document.getElementById('activeStat').textContent='Active: '+active;
  document.getElementById('deletedStat').textContent='Deleted: '+deleted;
}

// Render customer list
function renderCustomers(customers){
  const container=document.getElementById('customerList');
  if(!customers.length){
    container.innerHTML='<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No customers found</div></div>';
    return;
  }
  
  let html='';
  customers.forEach((c,idx)=>{
    const safeId='c'+idx;
    const isExpanded=expandedCards.has(safeId);
    
    // Check if recently active (profile clicked in last 5 min)
    let isActive=false;
    if(c.profileClickHistory&&Array.isArray(c.profileClickHistory)&&c.profileClickHistory.length>0){
      const lastClick=new Date(c.profileClickHistory[0]);
      const now=new Date();
      isActive=(now-lastClick)<300000;
    }
    
    html+=\`<div class="customer-card">
      <div class="customer-header" onclick="toggleCard('\${safeId}')">
        <div class="customer-info">
          <div class="customer-name">
            \${escapeHtml(c.name)}
            \${isActive?'<span class="active-pulse"></span>':''}
          </div>
          <div class="customer-number">\${escapeHtml(c.customerNumber)}</div>
          \${c.adminAlias?\`<div class="customer-alias">📝 \${escapeHtml(c.adminAlias)}</div>\`:''}
          <div class="customer-badges">
            \${!c.isDeleted?\`<span class="badge badge-active">Active</span>\`:\`<span class="badge badge-deleted">Deleted</span>\`}
            \${c.isDeveloper?\`<span class="badge badge-dev">Developer</span>\`:''}
          </div>
        </div>
        <div class="expand-icon \${isExpanded?'expanded':''}" id="icon\${safeId}">▼</div>
      </div>
      <div class="customer-details \${isExpanded?'expanded':''}" id="details\${safeId}">
        <div class="details-content">
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">\${escapeHtml(c.email)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone</span>
            <span class="detail-value">\${escapeHtml(c.phone||'N/A')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Currency</span>
            <span class="detail-value">\${escapeHtml(c.currency)}</span>
          </div>
          \${c.profileClickHistory&&Array.isArray(c.profileClickHistory)&&c.profileClickHistory.length>0?\`
          <div class="detail-section">
            <div class="section-title">📱 Recent Activity</div>
            <div class="profile-clicks">
              \${c.profileClickHistory.map((click,i)=>{
                const date=new Date(click);
                const formatted=date.toLocaleString('en-GB',{
                  day:'2-digit',month:'2-digit',year:'numeric',
                  hour:'2-digit',minute:'2-digit',hour12:false
                });
                return \`<div class="click-item">\${i+1}. \${formatted}</div>\`;
              }).join('')}
            </div>
          </div>
          \`:''}
          \${c.lastLatitude&&c.lastLongitude?\`
          <div class="detail-section">
            <div class="section-title">📍 Last Known Location</div>
            <div class="map-thumb" onclick="showMap('\${c.lastLatitude}','\${c.lastLongitude}','\${escapeHtml(c.name)}')">
              <img src="https://static-maps.yandex.ru/1.x/?ll=\${c.lastLongitude},\${c.lastLatitude}&size=400,120&z=14&l=map&pt=\${c.lastLongitude},\${c.lastLatitude},pm2rdm" alt="Map">
              <div class="map-info">📍 \${c.lastLatitude}, \${c.lastLongitude}</div>
            </div>
          </div>
          \`:''}
          <div class="detail-section">
            <div class="section-title">⚙️ Admin Settings</div>
            <div class="input-group">
              <label>Admin Name/Alias</label>
              <div class="input-row">
                <input type="text" id="alias-\${safeId}" value="\${escapeHtml(c.adminAlias||'')}" placeholder="Internal notes...">
                <button class="btn-save" onclick="saveAdmin('\${escapeHtml(c.customerNumber)}','\${safeId}')">Save</button>
              </div>
            </div>
            <div class="input-group">
              <label>App Replacement (0-5)</label>
              <div class="input-row">
                <select id="rep-\${safeId}">
                  <option value="0" \${(c.appReplacement||0)===0?'selected':''}>0</option>
                  <option value="1" \${c.appReplacement===1?'selected':''}>1</option>
                  <option value="2" \${c.appReplacement===2?'selected':''}>2</option>
                  <option value="3" \${c.appReplacement===3?'selected':''}>3</option>
                  <option value="4" \${c.appReplacement===4?'selected':''}>4</option>
                  <option value="5" \${c.appReplacement===5?'selected':''}>5</option>
                </select>
                <button class="btn-save" onclick="saveAdmin('\${escapeHtml(c.customerNumber)}','\${safeId}')">Save</button>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">🗑️ Account Actions</div>
            \${c.isDeleted?\`
              <button class="btn-restore" onclick="restoreCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">♻️ Restore Account</button>
              <button class="btn-delete" onclick="eraseCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">🔥 Erase Forever</button>
            \`:\`
              <button class="btn-delete" onclick="deleteCustomer('\${escapeHtml(c.customerNumber)}','\${escapeHtml(c.name)}')">🗑️ Delete Account</button>
            \`}
          </div>
        </div>
      </div>
    </div>\`;
  });
  container.innerHTML=html;
}

// Load OTC codes
async function loadOTC(){
  try{
    const res=await fetch('/api/admin/active-otcs');
    const data=await res.json();
    const otcList=document.getElementById('otcList');
    const otcCount=document.getElementById('otcCount');
    
    if(!data.otcs||!data.otcs.length){
      otcList.innerHTML='<div class="otc-empty">No active access codes</div>';
      otcCount.textContent='0';
      return;
    }
    
    otcCount.textContent=data.otcs.length;
    let html='';
    data.otcs.forEach(otc=>{
      html+=\`<div class="otc-card">
        <div class="otc-customer">\${escapeHtml(otc.accountData.name)} - \${escapeHtml(otc.customerNumber)}</div>
        <div class="otc-code">\${escapeHtml(otc.code)}</div>
        <div class="otc-timer">⏱️ Expires in: \${escapeHtml(otc.timeRemaining)}</div>
      </div>\`;
    });
    otcList.innerHTML=html;
  }catch(e){
    document.getElementById('otcList').innerHTML='<div class="otc-empty">Error loading codes</div>';
  }
}

// Load all customers
async function ld(){
  try{
    const res=await fetch('/api/customers');
    const data=await res.json();
    allCustomers=data.sort((a,b)=>parseInt(a.customerNumber)-parseInt(b.customerNumber));
    applyFilters();
    loadOTC();
  }catch(e){
    document.getElementById('customerList').innerHTML='<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Error loading customers</div></div>';
  }
}

// Save admin settings
async function saveAdmin(customerNumber,safeId){
  try{
    const alias=document.getElementById('alias-'+safeId).value;
    const rep=parseInt(document.getElementById('rep-'+safeId).value);
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber)+'/admin',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({adminAlias:alias,appReplacement:rep})
    });
    const data=await res.json();
    if(res.ok){
      alert('✅ Settings saved successfully');
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error saving settings');
  }
}

// Delete customer
async function deleteCustomer(customerNumber,name){
  console.log('🗑️ DELETE REQUEST -',customerNumber,name);
  const confirmed=confirm(\`⚠️ CONFIRM SOFT-DELETE\n\nCustomer: \${name}\nCustomer Number: \${customerNumber}\n\nThis will:\n- Mark customer as deleted\n- Force immediate logout\n- Keep data for recovery\n\nVerify the customer number above is correct.\`);
  if(!confirmed)return;
  const reason=prompt('Reason for deletion (optional):','Deleted by admin');
  try{
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber),{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({reason:reason||'Deleted by admin'})
    });
    const data=await res.json();
    if(res.ok){
      alert(\`✅ DELETED: \${data.name} (\${data.customerNumber})\`);
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error: '+e.message);
  }
}

// Restore customer
async function restoreCustomer(customerNumber,name){
  console.log('♻️ RESTORE REQUEST -',customerNumber,name);
  const confirmed=confirm(\`♻️ CONFIRM RESTORE\n\nCustomer: \${name}\nCustomer Number: \${customerNumber}\n\nThis will reactivate the customer account.\`);
  if(!confirmed)return;
  try{
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber)+'/restore',{method:'POST'});
    const data=await res.json();
    if(res.ok){
      alert(\`♻️ RESTORED: \${data.name} (\${data.customerNumber})\`);
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error: '+e.message);
  }
}

// Permanently erase customer
async function eraseCustomer(customerNumber,name){
  console.log('🔥 ERASE REQUEST -',customerNumber,name);
  const confirmed=confirm(\`🔥 CONFIRM PERMANENT ERASE\n\nCustomer: \${name}\nCustomer Number: \${customerNumber}\n\nThis is IRREVERSIBLE and will:\n- Delete ALL customer data permanently\n- Cannot be recovered\n\nVerify the customer number above is correct.\`);
  if(!confirmed)return;
  const doubleCheck=confirm(\`⚠️ FINAL CONFIRMATION\n\nYou are about to PERMANENTLY ERASE:\n\${name} (\${customerNumber})\n\nThis cannot be undone. Proceed?\`);
  if(!doubleCheck)return;
  try{
    const res=await fetch('/api/customers/'+encodeURIComponent(customerNumber)+'/permanent',{method:'DELETE'});
    const data=await res.json();
    if(res.ok){
      alert(\`🔥 PERMANENTLY ERASED: \${data.name} (\${data.customerNumber})\`);
      ld();
    }else{
      alert('❌ Failed: '+data.message);
    }
  }catch(e){
    alert('❌ Error: '+e.message);
  }
}

// Delete all customers
async function deleteAll(){
  const first=confirm(\`DELETE ALL CUSTOMERS?\n\nWARNING: This will permanently delete ALL customers from both tables.\n\nThis action is IRREVERSIBLE.\`);
  if(!first)return;
  const second=confirm('FINAL WARNING\n\nType DELETE in the next prompt to confirm.');
  if(!second)return;
  const confirmation=prompt('Type DELETE to confirm:');
  if(confirmation!=='DELETE')return;
  try{
    const res=await fetch('/api/admin/delete-all-customers',{method:'DELETE'});
    const data=await res.json();
    if(res.ok){
      alert(\`All customers deleted\n\nCustomers: \${data.customersDeleted}\nUsers: \${data.usersDeleted}\`);
      ld();
    }else{
      alert('Failed: '+data.message);
    }
  }catch(e){
    alert('Error: '+e.message);
  }
}

// Logout
async function logout(){
  try{
    await fetch('/api/admin/logout',{method:'POST'});
    window.location.href='/admin-oversight';
  }catch(e){
    alert('Error logging out');
  }
}

// Show map modal
function showMap(lat,lng,name){
  document.getElementById('mapTitle').textContent=name+' - Location ('+lat+', '+lng+')';
  document.getElementById('mapImage').src='https://static-maps.yandex.ru/1.x/?ll='+lng+','+lat+'&size=700,450&z=15&l=map&pt='+lng+','+lat+',pm2rdm';
  document.getElementById('mapModal').classList.add('show');
}

// Close map modal
function closeMap(){
  document.getElementById('mapModal').classList.remove('show');
}

// Initialize
ld();
setInterval(loadOTC,5000);
setInterval(ld,5000);
</script>
</body>
</html>`;
    
    // CRITICAL: Return to stop middleware chain and prevent Vite interference
    return res.status(200).type('html').send(adminPage);
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
        console.log(`🗑️  CUSTOMER SOFT-DELETED IN POSTGRESQL: ${customerNumber} - Reason: ${reason || 'Deleted by admin'}`);
        
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
        
        console.log(`🔥 CUSTOMER PERMANENTLY ERASED FROM POSTGRESQL: ${customerNumber}`);
        if (userDeleted) {
          console.log(`🔥 USER ALSO DELETED FROM MEMORY (was still present): ${customerNumber}`);
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
