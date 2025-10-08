import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, transferSchema } from "@shared/schema";
import { z } from "zod";
import { otcService } from "./otcService";
import { transferSecurityService } from "./security/transferSecurity";
import { generateChatResponse } from "./openai";
import { isDeviceBlocked, addDeviceSession, isDeviceInPanicMode, isCustomerInPanicMode } from "./deviceSessions";
import { isAccountActiveOnOtherDevice, setUserDeviceSession, removeUserDeviceSession, getUserDeviceSession, isCurrentDeviceAuthorized } from "./deviceExclusiveAuth";
import { addUserSession, removeUserSession, sessionTrackingMiddleware, isSessionValid } from "./sessionManager";
import { sendTransferConfirmation, sendBankStatement, type TransferConfirmationDetails } from "./emailService";
import { StatementService } from "./statementService";
import Database from "@replit/database";

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

  // Direct revocation check endpoint for PWA apps
  app.post("/api/check-revocation", async (req, res) => {
    try {
      const { accessCode } = req.body;
      
      if (!accessCode) {
        return res.status(400).json({ error: "Access code required" });
      }
      
      // Check if this access code has been revoked or blacklisted
      function processBlacklist(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.value && Array.isArray(data.value)) return data.value;
        return [];
      }
      
      const revokedFlag = await db.get(`revoked_${accessCode}`);
      const forceLogoutFlag = await db.get(`force_logout_${accessCode}`);
      const blacklistData = await db.get('permanent_blacklist');
      const pwaBlacklistData = await db.get('pwa_blacklist');
      const blacklist = processBlacklist(blacklistData);
      const pwaBlacklist = processBlacklist(pwaBlacklistData);
      const accessCodes = await db.get('access_codes') || {};
      const codeInfo = accessCodes[accessCode];
      
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
      if (userId) {
        try {
          const user = await storage.getUserById(userId);
          if (user) {
            const customerExists = await checkCustomerExists(user.customerNumber);
            if (!customerExists) {
              console.log(`🔒 CUSTOMER DELETED - FORCING LOGOUT VIA HEARTBEAT: ${user.customerNumber}`);
              req.session.destroy(() => {});
              return res.status(401).json({ 
                status: "customer_deleted",
                message: "Account access has been revoked",
                logout: true,
                forceDisconnect: true
              });
            }
          }
        } catch (error) {
          console.error('Customer existence check error:', error);
        }
      }
      
      // Check for force revocation of current access code
      const accessCode = req.headers['x-access-code'] as string || 
                        req.query.access as string ||
                        req.body.accessCode as string;
      
      if (accessCode) {
        try {
          // Check if this access code has been force revoked
          function processBlacklist(data) {
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (data.value && Array.isArray(data.value)) return data.value;
            return [];
          }
          
          const revokedFlag = await db.get(`revoked_${accessCode}`);
          const forceLogoutFlag = await db.get(`force_logout_${accessCode}`);
          const blacklistData = await db.get('permanent_blacklist');
          const pwaBlacklistData = await db.get('pwa_blacklist');
          const blacklist = processBlacklist(blacklistData);
          const pwaBlacklist = processBlacklist(pwaBlacklistData);
          const accessCodes = await db.get('access_codes') || {};
          const codeInfo = accessCodes[accessCode];
          
          const isRevoked = revokedFlag?.revoked || 
                           revokedFlag?.nuked || 
                           forceLogoutFlag?.forced ||
                           blacklist.includes(accessCode) ||
                           pwaBlacklist.includes(accessCode) ||
                           codeInfo?.revoked || 
                           codeInfo?.forceDisconnect;
          
          if (isRevoked) {
            console.log(`🔴 NUCLEAR REVOCATION DETECTED: ${accessCode} - DESTROYING PWA SESSION`);
            
            // Destroy session immediately
            req.session.destroy((err) => {
              if (err) console.error('Session destruction error:', err);
            });
            
            return res.status(403).json({ 
              status: "access_revoked", 
              message: "Access permanently revoked",
              forceDisconnect: true,
              nukeCaches: true,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Revocation check error:', error);
        }
      }
      
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
      function processBlacklist(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.value && Array.isArray(data.value)) return data.value;
        return [];
      }
      
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

  // Helper function to check if customer exists in database
  const checkCustomerExists = async (customerNumber: string): Promise<boolean> => {
    try {
      const customer = await storage.getCustomerByCustomerNumber(customerNumber);
      return !!customer;
    } catch (error) {
      console.error('Error checking customer existence:', error);
      return false;
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
      
      // Create user with proper data structure
      const newUser = await storage.createUser({
        customerNumber,
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        pin: userData.pin,
        dateOfBirth: userData.dateOfBirth
      });

      console.log(`✅ USER REGISTERED: ${newUser.name} (${newUser.customerNumber})`);
      
      // Add user to customers table in database after successful registration
      try {
        await storage.createCustomer({
          customerNumber: newUser.customerNumber,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone || '',
          dateOfBirth: newUser.dateOfBirth || '',
          joinDate: newUser.joinDate || 'Member since 2018',
          currency: newUser.currency || 'EUR'
        });
        console.log(`📊 CUSTOMER ADDED TO DATABASE: ${newUser.name} (${newUser.customerNumber})`);
      } catch (customerError) {
        console.error('Failed to add customer to database:', customerError);
        // Don't fail registration if customer table insertion fails
      }
      
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

      // Check if this customer has any devices in panic mode
      if (isCustomerInPanicMode(user.customerNumber)) {
        console.log(`🚨 PANIC MODE LOGIN BLOCKED: Customer ${user.customerNumber} attempted login but their device is in panic mode`);
        return res.status(503).json({ 
          message: "System temporarily unavailable. Please try again later." 
        });
      }

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

      // Check if the authorized device is in panic mode
      const existingSession = getUserDeviceSession(user.id);
      if (existingSession && existingSession.deviceSessionId && isDeviceInPanicMode(existingSession.deviceSessionId)) {
        console.log(`🚨 PANIC MODE LOGIN BLOCKED: User ${user.id} attempted login, but device ${existingSession.deviceModel} is in panic mode`);
        return res.status(503).json({ 
          message: "System temporarily unavailable. Please try again later." 
        });
      }

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

      // Store user and device session in session
      (req as any).session.userId = user.id;
      (req as any).session.user = { id: user.id, name: user.name, email: user.email };
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
        res.json({ user: { id: user.id, name: user.name, email: user.email } });
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
        const user = await storage.getUserById(userId);
        if (user) {
          const customerExists = await checkCustomerExists(user.customerNumber);
          if (!customerExists) {
            console.log(`🚫 DELETED CUSTOMER ATTEMPT: ${user.customerNumber} tried to access customer panel`);
            
            // Destroy session to force logout
            if (req.session) {
              req.session.destroy(() => {});
            }
            
            return res.status(403).json({ 
              message: "Account access revoked", 
              requiresNewAccount: true,
              redirectToLogin: true
            });
          }
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
          
          // Destroy session to force logout
          if (req.session) {
            req.session.destroy(() => {});
          }
          
          return res.status(403).json({ 
            message: "Account access revoked", 
            requiresNewAccount: true,
            redirectToLogin: true
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
            
            // Destroy session to force logout
            if (req.session) {
              req.session.destroy(() => {});
            }
            
            return res.status(403).json({ 
              message: "Account access revoked", 
              requiresNewAccount: true,
              redirectToLogin: true
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
          
          // Destroy session to force logout
          if (req.session) {
            req.session.destroy(() => {});
          }
          
          return res.status(403).json({ 
            message: "Account access revoked", 
            requiresNewAccount: true,
            redirectToLogin: true
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
        emailsEnabled: z.boolean().optional()
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
      
      const success = await sendTransferConfirmation(
        emailData.userEmail, 
        confirmationDetails, 
        emailData.transferData, 
        emailData.userCurrency,
        true // Always true here since we checked above
      );
      
      if (success) {
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
      const { dateCreated, ...userDataWithoutDate } = userData;
      const newUser = await storage.createUser({
        ...userDataWithoutDate,
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
      
      // Check if customer exists in customers table (auto-logout if deleted)
      const customerExists = await checkCustomerExists(customerNumber);
      if (!customerExists) {
        console.log(`🔒 CUSTOMER DELETED - PROFILE BLOCKED: ${customerNumber}`);
        // Don't destroy session here - let heartbeat handle it
        return res.status(401).json({ 
          message: "Account access has been revoked",
          logout: true 
        });
      }
      
      let user = await storage.getUserByCustomerNumber(customerNumber);
      
      // If user doesn't exist in database, return 404 instead of creating with fake data
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
        // Don't destroy session here - let heartbeat handle it
        return res.status(401).json({ 
          message: "Account access has been revoked",
          logout: true 
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
          joinDate: updates.joinDate || new Date().toISOString()
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
          const newUser = await storage.createUser({
            customerNumber: userData.customerNumber,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            address: userData.address || "",
            dateOfBirth: userData.dateOfBirth || "",
            pin: "000000", // Default PIN
            joinDate: userData.joinDate || new Date().toISOString()
          });

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

          // Add user to customers table in database
          try {
            await storage.createCustomer({
              customerNumber: newUser.customerNumber,
              name: newUser.name,
              email: newUser.email,
              phone: newUser.phone || '',
              dateOfBirth: newUser.dateOfBirth || '',
              joinDate: newUser.joinDate || 'Member since 2018',
              currency: newUser.currency || 'EUR'
            });
            console.log(`📊 CUSTOMER ADDED TO DATABASE (Admin OTC): ${newUser.name} (${newUser.customerNumber})`);
          } catch (customerError) {
            console.error('Failed to add customer to database:', customerError);
            // Don't fail the account creation if customer table insertion fails
          }

          // Set up session for OTC login (critical for auto-logout to work)
          (req as any).session.userId = newUser.id;
          (req as any).session.user = { id: newUser.id, name: newUser.name, email: newUser.email };
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
          accountId: z.number(),
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
            statementRequest.userEmail,
            statementRequest.customerName,
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

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { pin } = req.body;
      
      console.log('Login attempt - Session ID:', req.sessionID);
      console.log('Login attempt - Current session:', req.session);
      
      if (pin === "270309200207") {
        req.session.adminAuthenticated = true;
        
        // Ensure session is saved before responding
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ success: false, error: "Session save failed" });
          }
          console.log('Session saved successfully - ID:', req.sessionID, 'adminAuthenticated:', req.session.adminAuthenticated);
          res.json({ success: true });
        });
      } else {
        res.status(401).json({ success: false, error: "Invalid PIN" });
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

  // Admin Oversight - iPhone Optimized
  app.get("/admin-oversight", async (req, res) => {
    // Debug session
    console.log('Admin oversight session check:', {
      sessionID: req.sessionID,
      adminAuthenticated: req.session.adminAuthenticated,
      session: req.session
    });
    
    // Check if admin is authenticated
    if (!req.session.adminAuthenticated) {
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
<div class="error" id="err">Invalid PIN. Please try again.</div>
<form id="loginForm" onsubmit="login(event)">
<div class="form-group">
<label>PIN Code</label>
<input type="password" id="pin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required autofocus>
</div>
<button type="submit" class="btn-login">Login</button>
</form>
</div>
<script>
async function login(e){
e.preventDefault();
let pin=document.getElementById('pin').value;
try{
let r=await fetch('/api/admin/login',{
method:'POST',
headers:{'Content-Type':'application/json'},
credentials:'include',
body:JSON.stringify({pin})
});
let d=await r.json();
if(r.ok&&d.success){
setTimeout(()=>{window.location.href='/admin-oversight';},100);
}else{
document.getElementById('err').classList.add('show');
document.getElementById('pin').value='';
}
}catch(e){
document.getElementById('err').classList.add('show');
}
}
</script>
</body>
</html>`;
      return res.send(loginPage);
    }

    const adminPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">
<title>Customers</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#f0f0f0;overflow-x:hidden;width:100vw}
.hdr{background:#126987;color:#fff;padding:15px;position:sticky;top:0;z-index:10}
.hdr h1{font-size:18px;margin-bottom:8px}
.top{display:flex;justify-content:space-between;align-items:center}
.cnt{font-size:13px;opacity:0.9}
.btn{background:#fff;color:#126987;border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:600}
.otc-sec{padding:10px;margin-bottom:10px}
.otc-hdr{background:#fff;border-radius:10px;padding:12px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.otc-hdr h2{font-size:16px;color:#126987;margin-bottom:4px}
.otc-hdr p{font-size:12px;color:#666}
.otc-itm{background:#fff3cd;border-radius:10px;padding:12px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #ffc107}
.otc-code{font-size:24px;font-weight:700;color:#856404;font-family:monospace;letter-spacing:3px;margin:8px 0}
.otc-info{font-size:11px;color:#856404;margin-bottom:4px}
.otc-timer{font-size:11px;color:#dc3545;font-weight:600}
.otc-empty{background:#fff;border-radius:10px;padding:20px;text-align:center;color:#999;font-size:13px}
.lst{padding:10px}
.itm{background:#fff;border-radius:10px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.itm-hdr{padding:12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between}
.l{flex:1;min-width:0}
.nm{font-weight:600;font-size:14px;color:#000;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.id{font-size:11px;color:#666;font-family:monospace}
.arr{color:#126987;font-size:16px;transition:transform 0.2s}
.arr.op{transform:rotate(180deg)}
.det{max-height:0;overflow:hidden;transition:max-height 0.2s;background:#f9f9f9}
.det.op{max-height:300px}
.dw{padding:12px}
.r{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}
.lb{color:#666}
.vl{color:#000;font-weight:600;text-align:right;max-width:60%;word-break:break-all}
.st{background:#d4edda;color:#155724;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600}
.db{background:#dc3545;color:#fff;border:none;padding:8px;border-radius:6px;width:100%;margin-top:8px;font-size:12px;font-weight:600}
.emp{background:#fff;border-radius:10px;padding:40px 20px;text-align:center;color:#999}
.ed-fld{margin-top:8px;padding:8px;background:#fff;border:1px solid #ddd;border-radius:6px}
.ed-fld label{display:block;font-size:11px;color:#666;margin-bottom:4px;font-weight:600}
.ed-inp{width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px}
.ed-sel{width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px;background:#fff}
.sv-btn{background:#28a745;color:#fff;border:none;padding:6px 12px;border-radius:4px;font-size:11px;font-weight:600;margin-left:4px;cursor:pointer}
</style>
</head>
<body>
<div class="hdr">
<h1>Customer Management</h1>
<div class="top">
<span class="cnt" id="c">0</span>
<div style="display:flex;gap:8px">
<button class="btn" onclick="ld()">Refresh</button>
<button class="btn" onclick="logout()">Logout</button>
</div>
</div>
</div>
<div class="otc-sec">
<div class="otc-hdr">
<h2>Active OTC Codes</h2>
<p>One-time codes for new account verification</p>
</div>
<div id="otc-list"><div class="otc-empty">No active codes</div></div>
</div>
<div class="lst" id="l"><div class="emp">Loading...</div></div>
<script>
let o=new Set();
function tg(i){
let d=document.getElementById('d'+i),a=document.getElementById('a'+i);
if(o.has(i)){d.classList.remove('op');a.classList.remove('op');o.delete(i)}
else{d.classList.add('op');a.classList.add('op');o.add(i)}
}
function escapeHtml(text) {
  const map = {'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#039;'};
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
async function loadOTC(){
try{
let r=await fetch('/api/admin/active-otcs'),d=await r.json();
if(!d.otcs||!d.otcs.length){document.getElementById('otc-list').innerHTML='<div class="otc-empty">No active codes</div>';return}
let h='';
d.otcs.forEach(otc=>{
h+=\`<div class="otc-itm">
<div class="otc-info">\${escapeHtml(otc.accountData.name)} - \${escapeHtml(otc.customerNumber)}</div>
<div class="otc-code">\${escapeHtml(otc.code)}</div>
<div class="otc-timer">Expires in: \${escapeHtml(otc.timeRemaining)}</div>
</div>\`;
});
document.getElementById('otc-list').innerHTML=h;
}catch(e){document.getElementById('otc-list').innerHTML='<div class="otc-empty">Error loading codes</div>'}
}
async function ld(){
try{
let r=await fetch('/api/customers'),d=await r.json();
document.getElementById('c').textContent=d.length+' Customer'+(d.length!=1?'s':'');
if(!d.length){document.getElementById('l').innerHTML='<div class="emp">No customers</div>';return}
let h='';
d.forEach(c=>{
let op=o.has(c.customerNumber);
h+=\`<div class="itm">
<div class="itm-hdr" onclick="tg('\${escapeHtml(c.customerNumber)}')">
<div class="l">
<div class="nm">\${escapeHtml(c.name)}</div>
<div class="id">\${escapeHtml(c.customerNumber)}</div>
</div>
<div class="arr \${op?'op':''}" id="a\${escapeHtml(c.customerNumber)}">▼</div>
</div>
<div class="det \${op?'op':''}" id="d\${escapeHtml(c.customerNumber)}">
<div class="dw">
<div class="r"><span class="lb">Email</span><span class="vl">\${escapeHtml(c.email)}</span></div>
<div class="r"><span class="lb">Phone</span><span class="vl">\${escapeHtml(c.phone||'N/A')}</span></div>
<div class="r"><span class="lb">Currency</span><span class="vl">\${escapeHtml(c.currency)}</span></div>
<div class="r"><span class="lb">Status</span><span class="st">Active</span></div>
<div class="ed-fld">
<label>Admin Name/Alias</label>
<div style="display:flex;align-items:center">
<input type="text" class="ed-inp" id="alias-\${escapeHtml(c.customerNumber)}" value="\${escapeHtml(c.adminAlias||'')}" placeholder="Internal name or notes">
<button class="sv-btn" onclick="upd('\${escapeHtml(c.customerNumber)}')">Save</button>
</div>
</div>
<div class="ed-fld">
<label>App Replacement (0-5)</label>
<div style="display:flex;align-items:center">
<select class="ed-sel" id="rep-\${escapeHtml(c.customerNumber)}">
<option value="0" \${(c.appReplacement||0)===0?'selected':''}>0</option>
<option value="1" \${c.appReplacement===1?'selected':''}>1</option>
<option value="2" \${c.appReplacement===2?'selected':''}>2</option>
<option value="3" \${c.appReplacement===3?'selected':''}>3</option>
<option value="4" \${c.appReplacement===4?'selected':''}>4</option>
<option value="5" \${c.appReplacement===5?'selected':''}>5</option>
</select>
<button class="sv-btn" onclick="upd('\${escapeHtml(c.customerNumber)}')">Save</button>
</div>
</div>
<button class="db" data-customer="\${escapeHtml(c.customerNumber)}" data-name="\${escapeHtml(c.name)}" onclick="dl(this.dataset.customer,this.dataset.name)">Delete</button>
</div>
</div>
</div>\`;
});
document.getElementById('l').innerHTML=h;
loadOTC();
}catch(e){document.getElementById('l').innerHTML='<div class="emp">Error</div>'}
}
async function dl(n,nm){
if(!confirm('Delete '+nm+'?'))return;
try{
let r=await fetch('/api/customers/'+encodeURIComponent(n),{method:'DELETE'}),d=await r.json();
if(r.ok){alert('Deleted');o.delete(n);ld()}else{alert('Failed')}
}catch(e){alert('Error')}
}
async function upd(n){
try{
let alias=document.getElementById('alias-'+n).value;
let rep=parseInt(document.getElementById('rep-'+n).value);
let r=await fetch('/api/customers/'+encodeURIComponent(n)+'/admin',{
method:'PATCH',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({adminAlias:alias,appReplacement:rep})
});
let d=await r.json();
if(r.ok){alert('Saved successfully')}else{alert('Failed: '+d.message)}
}catch(e){alert('Error')}
}
async function logout(){
try{
await fetch('/api/admin/logout',{method:'POST'});
window.location.href='/admin-oversight';
}catch(e){alert('Error')}
}
ld();
setInterval(loadOTC,5000);
</script>
</body>
</html>`;
    
    res.send(adminPage);
  });

  // API endpoint to get all customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // API endpoint to delete a customer
  app.delete("/api/customers/:customerNumber", async (req, res) => {
    try {
      const { customerNumber } = req.params;
      
      // Delete customer from database ONLY (keep in-memory user so heartbeat can check)
      const deleted = await storage.deleteCustomer(customerNumber);
      
      if (deleted) {
        console.log(`🗑️  CUSTOMER DELETED FROM DATABASE: ${customerNumber} - Heartbeat will force logout`);
        
        res.json({ 
          success: true, 
          message: "Customer deleted successfully" 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "Customer not found" 
        });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete customer" 
      });
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

  const httpServer = createServer(app);
  return httpServer;
}
