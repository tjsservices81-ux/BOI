import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, transferSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { otcService } from "./otcService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database and sample data
  await storage.initializeSampleData();

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
      maxAge: 24 * 60 * 60 * 1000, // 24 hours for better security
      sameSite: 'lax' // Allow cookies to be sent with same-site requests
    },
    rolling: true, // Refresh session on each request
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - User ID:', req.session?.userId);
    console.log('Auth check - Full session:', req.session);
    
    if (req.session && req.session.userId) {
      // Refresh session on each authenticated request
      req.session.touch();
      return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
  };

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { customerNumber, pin } = loginSchema.parse(req.body);
      const user = await storage.getUserByCredentials(customerNumber, pin);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user in session
      (req as any).session.userId = user.id;
      (req as any).session.user = { id: user.id, name: user.name, email: user.email };

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

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
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
  app.get("/api/transactions/:accountId", async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const transactions = await storage.getTransactionsByAccountId(accountId);
      res.json(transactions);
    } catch (error) {
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
        joinDate: z.string().optional()
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
      const otc = await otcService.processNewAccount(accountData);
      
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

  // Card management endpoints
  app.get("/api/cards/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const cards = await storage.getCardsByUserId(userId);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/cards/:cardId/block", requireAuth, async (req, res) => {
    try {
      const cardId = parseInt(req.params.cardId);
      const card = await storage.updateCardStatus(cardId, "blocked");
      
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.json({ 
        message: "Card has been blocked successfully",
        card 
      });
    } catch (error) {
      console.error('Card blocking failed:', error);
      res.status(500).json({ message: "Failed to block card" });
    }
  });

  app.patch("/api/cards/:cardId/unblock", requireAuth, async (req, res) => {
    try {
      const cardId = parseInt(req.params.cardId);
      const card = await storage.updateCardStatus(cardId, "active");
      
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.json({ 
        message: "Card successfully unblocked",
        card 
      });
    } catch (error) {
      console.error('Card unblocking failed:', error);
      res.status(500).json({ message: "Failed to unblock card" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
