import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, transferSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { launchScreenOtc } from "./launchScreenOtc";
import { transferSecurityService } from "./security/transferSecurity";
import { generateChatResponse } from "./openai";
import { isDeviceBlocked, addDeviceSession, isDeviceInPanicMode, isCustomerInPanicMode } from "./deviceSessions";
import { isAccountActiveOnOtherDevice, setUserDeviceSession, removeUserDeviceSession, getUserDeviceSession, isCurrentDeviceAuthorized } from "./deviceExclusiveAuth";
import { addUserSession, removeUserSession, sessionTrackingMiddleware, isSessionValid } from "./sessionManager";

export async function registerRoutes(app: Express): Promise<Server> {
  // Wait for storage to fully initialize from persistent data
  await storage.waitForInitialization();
  
  // Check for existing users
  const existingUsers = await storage.getAllUsers();
  console.log(`Found ${existingUsers.length} existing users in database`);

  // Configure session middleware with simple in-memory storage
  const sessionStore = new session.MemoryStore();

  app.use(session({
    secret: process.env.SESSION_SECRET || 'banking-app-secret-key-for-dev',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true, // Secure cookie access
      maxAge: undefined, // No expiry - sessions persist permanently until admin deletion
      sameSite: 'lax' // Allow cookies to be sent with same-site requests
    },
    rolling: true, // Refresh session on each request
  }));

  // Health check endpoint for connectivity testing
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "Bank of Ireland API"
    });
  });

  // OTC verification endpoint
  app.post("/api/verify-otc", async (req, res) => {
    try {
      const { otc } = req.body;
      
      if (!otc || typeof otc !== 'string') {
        return res.status(400).json({ verified: false, message: "Invalid code format" });
      }

      const verified = await launchScreenOtc.verifyCode(otc.trim().toUpperCase());
      
      if (verified) {
        console.log(`✅ OTC VERIFICATION SUCCESS: ${otc}`);
        res.json({ verified: true, message: "Access granted" });
      } else {
        console.log(`❌ OTC VERIFICATION FAILED: ${otc}`);
        res.status(401).json({ verified: false, message: "Invalid access code" });
      }
    } catch (error) {
      console.error('OTC verification error:', error);
      res.status(500).json({ verified: false, message: "Verification service error" });
    }
  });

  // Admin endpoint to get current OTC (hidden method)
  app.get("/api/admin/current-otc", async (req, res) => {
    try {
      const currentOtc = await launchScreenOtc.getCurrentCode();
      const expiresAt = await launchScreenOtc.getExpirationTime();
      
      console.log(`🔐 ADMIN OTC REQUEST: ${req.ip} - Code: ${currentOtc}`);
      
      res.json({ 
        otc: currentOtc, 
        expiresAt,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Admin OTC request error:', error);
      res.status(500).json({ error: "OTC service error" });
    }
  });

  // Admin endpoint to generate new OTC
  app.post("/api/admin/generate-otc", async (req, res) => {
    try {
      const { customCode, expiryHours } = req.body;
      
      const newOtc = await launchScreenOtc.generateNewCode(customCode, expiryHours);
      const expiresAt = await launchScreenOtc.getExpirationTime();
      
      console.log(`🔄 ADMIN OTC GENERATION: New code ${newOtc} expires at ${expiresAt}`);
      
      res.json({ 
        otc: newOtc, 
        expiresAt,
        message: "New OTC generated successfully"
      });
    } catch (error) {
      console.error('Admin OTC generation error:', error);
      res.status(500).json({ error: "OTC generation failed" });
    }
  });

  // Add session tracking middleware
  app.use(sessionTrackingMiddleware);

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

      res.json({ user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check authentication status
  app.get("/api/auth/user", (req, res) => {
    console.log('User check - Session ID:', req.sessionID);
    console.log('User check - Session user:', (req as any).session?.user);
    console.log('User check - Session userId:', (req as any).session?.userId);
    console.log('User check - Full session:', (req as any).session);
    
    if ((req as any).session && (req as any).session.user) {
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

      const amount = parseFloat(transferData.amount);
      const currentBalance = parseFloat(account.balance);
      
      if (amount > currentBalance) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Create debit transaction
      const transaction = await storage.createTransaction({
        accountId: transferData.fromAccountId,
        amount: `-${amount}`,
        description: `Transfer to ${transferData.toAccount}`,
        category: "transfer",
        type: "debit",
        paymentMethod: "Online Transfer",
        reference: transferData.reference || `TXN${Date.now()}`,
        timestamp: new Date()
      });

      // Update account balance
      const newBalance = (currentBalance - amount).toFixed(2);
      await storage.updateAccountBalance(transferData.fromAccountId, newBalance);

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
      
      // Generate OTC and send notification  
      const otc = await launchScreenOtc.processNewAccount(accountData);
      
      // Log for security audit
      console.log(`OTC generated for admin panel account creation: ${accountData.customerNumber}`);
      
      res.json({ 
        success: true, 
        message: "OTC generated and notification sent",
        customerNumber: accountData.customerNumber
      });
    } catch (error) {
      console.error('OTC generation failed:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data format" });
      }
      res.status(500).json({ message: "Failed to generate OTC" });
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
      const validation = launchScreenOtc.validateOTC(customerNumber, code);

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
              displayName: "Current Account"
            },
            {
              userId: newUser.id,
              accountType: "credit" as const,
              accountNumber: "****1820",
              balance: "0.00",
              displayName: "Credit Card"
            },
            {
              userId: newUser.id,
              accountType: "savings" as const,
              accountNumber: "****0978",
              balance: "0.00",
              displayName: "Savings Account"
            }
          ];

          // Create the accounts in the database
          for (const accountData of defaultAccounts) {
            await storage.createAccount(accountData);
          }

          console.log('User and accounts created in database:', newUser);

          res.json({ 
            success: true, 
            message: "OTC validated successfully and account created",
            accountData: validation.accountData,
            user: newUser
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
          
          transferContext = `\n\nCUSTOMER'S RECENT TRANSFER CONTEXT:
Last transfer: €${transferAmount.toFixed(2)} to ${recipientName} on ${transferDate}
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

      const aiResponse = await generateChatResponse(messages, agentName, transferContext);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
