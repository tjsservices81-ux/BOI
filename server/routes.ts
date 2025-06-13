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

  // Configure session middleware with database storage
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60, // 7 days
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'banking-app-secret-key-for-dev',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: false, // Allow JavaScript access for SPA
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax' // Allow cookies to be sent with same-site requests
    },
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session && req.session.userId) {
      return next();
    }
    return res.status(401).json({ message: "Authentication required" });
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
    if ((req as any).session && (req as any).session.user) {
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

      if (validation.isValid) {
        res.json({ 
          success: true, 
          message: "OTC validated successfully",
          accountData: validation.accountData
        });
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

  const httpServer = createServer(app);
  return httpServer;
}
