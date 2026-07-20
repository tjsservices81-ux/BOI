import { 
  accounts, transactions, payees, scheduledPayments, statements,
  chatMessages, chatResponses, chatSessions, customers,
  type User, type Account, type Transaction, type Payee, type ScheduledPayment, type Statement,
  type ChatMessage, type ChatResponse, type ChatSession, type Customer,
  type InsertUser, type InsertAccount, type InsertTransaction, type InsertPayee,
  type InsertChatMessage, type InsertChatResponse, type InsertChatSession, type InsertCustomer
} from "@shared/schema";
import { balanceAfterReversal } from "@shared/balanceMath";
import { PersistentDataManager } from "./persistentStorage";

// Re-export types for use in other files
export type { InsertUser, User, Account, Transaction };

export interface IStorage {
  // User operations
  getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined>;
  createUser(user: InsertUser, customId?: number): Promise<User>;
  getUser(customerNumber: string): Promise<User | undefined>;
  getUserById(userId: number): Promise<User | undefined>;
  getUserByCustomerNumber(customerNumber: string): Promise<User | undefined>;
  updateUserProfile(customerNumber: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserLocation(customerNumber: string, latitude: number, longitude: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  deleteUser(customerNumber: string): Promise<boolean>;
  
  // Account operations
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getAccountById(accountId: number): Promise<Account | undefined>;
  getAccountBySortCodeAndNumber(sortCode: string, accountNumber: string): Promise<Account | undefined>;
  getAccountByBicAndIban(bic: string, iban: string): Promise<Account | undefined>;
  getAllAccounts(): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(accountId: number, newBalance: string): Promise<void>;
  updateAccountDisplayName(accountId: number, displayName: string): Promise<void>;
  deleteAccount(accountId: number): Promise<boolean>;
  deleteAccountsByUserId(userId: number): Promise<boolean>;
  
  // Transaction operations
  getTransactionsByAccountId(accountId: number): Promise<Transaction[]>;
  getTransactionById(transactionId: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(transactionId: number): Promise<{ success: boolean; newBalance?: string }>;
  
  // Payee operations
  getPayeesByUserId(userId: number): Promise<Payee[]>;
  createPayee(payee: InsertPayee): Promise<Payee>;
  
  // Scheduled payments
  getScheduledPaymentsByUserId(userId: number): Promise<ScheduledPayment[]>;
  
  // Statements
  getStatementsByAccountId(accountId: number): Promise<Statement[]>;
  
  // Chat operations
  getChatMessagesBySessionId(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatSession(sessionId: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  endChatSession(sessionId: string): Promise<void>;
  getChatResponses(): Promise<ChatResponse[]>;
  createChatResponse(response: InsertChatResponse): Promise<ChatResponse>;
  updateChatResponse(id: number, updates: Partial<ChatResponse>): Promise<ChatResponse | undefined>;
  deleteChatResponse(id: number): Promise<void>;
  
  // Customer operations (verified users)
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getAllCustomers(): Promise<Customer[]>;
  getCustomerByCustomerNumber(customerNumber: string): Promise<Customer | undefined>;
  updateCustomer(customerNumber: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  updateCustomerLocation(customerNumber: string, latitude: number, longitude: number): Promise<Customer | undefined>;
  deleteCustomer(customerNumber: string): Promise<boolean>;
  
  // Admin operations
  getAllDeviceSessions(): Promise<any[]>;
  blockDeviceSession(sessionId: string): Promise<void>;
  unblockDeviceSession(sessionId: string): Promise<void>;
  enableDevicePanicMode(sessionId: string): Promise<void>;
  disableDevicePanicMode(sessionId: string): Promise<void>;
  disableUser(userId: number): Promise<void>;
  enableUser(userId: number): Promise<void>;
  getUsersWithDisabledStatus(): Promise<any[]>;
}

// Persistent storage implementation
class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private accounts = new Map<number, Account>();
  private transactions = new Map<number, Transaction>();
  private payees = new Map<number, Payee>();
  private scheduledPayments = new Map<number, ScheduledPayment>();
  private statements = new Map<number, Statement>();
  private chatMessages = new Map<number, ChatMessage>();
  private chatResponses = new Map<number, ChatResponse>();
  private chatSessions = new Map<string, ChatSession>();
  
  private currentUserId: number = 1;
  private currentAccountId: number = 1;
  private currentTransactionId: number = 1;
  private currentPayeeId: number = 1;
  private currentScheduledPaymentId: number = 1;
  private currentStatementId: number = 1;
  private currentChatMessageId: number = 1;
  private currentChatResponseId: number = 1;
  private currentChatSessionId: number = 1;

  private persistentManager: PersistentDataManager;

  private initializationPromise: Promise<void>;

  constructor() {
    this.persistentManager = new PersistentDataManager();
    this.initializationPromise = this.loadPersistedData();
  }

  async waitForInitialization(): Promise<void> {
    return this.initializationPromise;
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const data = await this.persistentManager.loadData();
      if (data) {
        this.users = data.users;
        this.accounts = data.accounts;
        this.transactions = data.transactions;
        this.payees = data.payees;
        this.scheduledPayments = data.scheduledPayments;
        this.statements = data.statements;
        this.chatMessages = data.chatMessages;
        this.chatResponses = data.chatResponses;
        this.chatSessions = data.chatSessions;
        this.currentUserId = data.counters.currentUserId;
        this.currentAccountId = data.counters.currentAccountId;
        this.currentTransactionId = data.counters.currentTransactionId;
        this.currentPayeeId = data.counters.currentPayeeId;
        this.currentScheduledPaymentId = data.counters.currentScheduledPaymentId;
        this.currentStatementId = data.counters.currentStatementId;
        this.currentChatMessageId = data.counters.currentChatMessageId;
        this.currentChatResponseId = data.counters.currentChatResponseId;
        console.log(`Loaded persisted data: ${this.users.size} users, ${this.accounts.size} accounts`);
      } else {
        console.log("No persisted data found, starting with empty state");
      }
      
      // CRITICAL FIX: Sync PostgreSQL customers to local users storage
      await this.syncCustomersToUsers();
      
      // CRITICAL FIX: Sync accounts from PostgreSQL to memory at startup
      await this.syncAccountsFromPostgres();
    } catch (error) {
      console.error('Error loading persisted data:', error);
    }
  }
  
  // Sync accounts from PostgreSQL to memory on startup
  private async syncAccountsFromPostgres(): Promise<void> {
    try {
      const { db } = await import('./db');
      
      const allAccounts = await db.select().from(accounts);
      console.log(`🔄 Syncing ${allAccounts.length} accounts from PostgreSQL to memory...`);
      
      for (const dbAccount of allAccounts) {
        const account: Account = {
          id: dbAccount.id,
          userId: dbAccount.userId,
          accountType: dbAccount.accountType,
          accountNumber: dbAccount.accountNumber,
          sortCode: dbAccount.sortCode,
          bic: dbAccount.bic || 'BOFIIE2D',
          iban: dbAccount.iban || null,
          balance: dbAccount.balance,
          displayName: dbAccount.displayName
        };
        this.accounts.set(account.id, account);
        
        if (dbAccount.id >= this.currentAccountId) {
          this.currentAccountId = dbAccount.id + 1;
        }
      }
      
      console.log(`✅ Synced ${allAccounts.length} accounts from PostgreSQL`);
    } catch (error) {
      console.error('Error syncing accounts from PostgreSQL:', error);
    }
  }

  // Sync PostgreSQL customers table to local users Map (for Face ID and login)
  // IMPORTANT: Only syncs ACTIVE customers - soft-deleted customers are intentionally excluded
  // Soft-deleted users remain out of memory until explicitly restored via restore endpoint
  private async syncCustomersToUsers(): Promise<void> {
    try {
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      // Get all ACTIVE (non-deleted) customers from PostgreSQL
      // Soft-deleted customers (isDeleted: true) are intentionally excluded
      const allCustomers = await db.select().from(customers).where(eq(customers.isDeleted, false));
      
      // Also get soft-deleted customers to clean them from memory if present
      const deletedCustomers = await db.select().from(customers).where(eq(customers.isDeleted, true));
      
      console.log(`🔄 Syncing ${allCustomers.length} ACTIVE customers from PostgreSQL to local storage...`);
      console.log(`🗑️  Excluding ${deletedCustomers.length} soft-deleted customers from memory`);
      
      // CLEANUP: Remove soft-deleted users from memory if they somehow exist
      for (const deletedCustomer of deletedCustomers) {
        const existingUser = Array.from(this.users.values()).find(u => u.customerNumber === deletedCustomer.customerNumber);
        if (existingUser) {
          this.users.delete(existingUser.id);
          console.log(`🧹 Removed soft-deleted user from memory: ${deletedCustomer.customerNumber}`);
        }
      }
      
      // RESTORE: Add active customers to memory
      for (const customer of allCustomers) {
        // Check if user already exists in local storage
        const existingUser = Array.from(this.users.values()).find(u => u.customerNumber === customer.customerNumber);
        
        if (!existingUser) {
          // Create user in local storage from customer data using PostgreSQL ID
          const user: User = {
            id: customer.id, // Use PostgreSQL customer ID to keep IDs in sync
            customerNumber: customer.customerNumber,
            pin: '', // PIN not stored in PostgreSQL for security
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || null,
            address: customer.address || null,
            dateOfBirth: customer.dateOfBirth || null,
            joinDate: customer.joinDate || 'Member since 2018',
            currency: customer.currency || 'EUR',
            dateCreated: customer.createdAt || new Date(),
            isDisabled: false
          };
          this.users.set(user.id, user);
          
          // Update currentUserId counter if needed
          if (customer.id >= this.currentUserId) {
            this.currentUserId = customer.id + 1;
          }
        } else {
          // User already exists - sync profile data from PostgreSQL (source of truth)
          // CRITICAL FIX: Also update user ID to match PostgreSQL customer ID
          const oldId = existingUser.id;
          const newId = customer.id;
          
          const updatedUser: User = {
            ...existingUser,
            id: newId, // CRITICAL: Update ID to match PostgreSQL
            name: customer.name || existingUser.name,
            email: customer.email || existingUser.email,
            phone: customer.phone || existingUser.phone,
            address: customer.address || existingUser.address,
            dateOfBirth: customer.dateOfBirth || existingUser.dateOfBirth,
            joinDate: customer.joinDate || existingUser.joinDate,
            currency: customer.currency || existingUser.currency
          };
          
          // Remove old entry if ID changed
          if (oldId !== newId) {
            this.users.delete(oldId);
            console.log(`🔄 Updated user ID: ${oldId} → ${newId} for ${customer.customerNumber}`);
            
            // Also update any accounts in PostgreSQL that use the old ID
            try {
              const { db } = await import('./db');
              const { eq } = await import('drizzle-orm');
              
              const accountsToUpdate = await db.select().from(accounts).where(eq(accounts.userId, oldId));
              if (accountsToUpdate.length > 0) {
                await db.update(accounts).set({ userId: newId }).where(eq(accounts.userId, oldId));
                console.log(`🔄 Migrated ${accountsToUpdate.length} accounts from user ID ${oldId} → ${newId}`);
              }
            } catch (migrationError) {
              console.error(`Error migrating accounts for user ${customer.customerNumber}:`, migrationError);
            }
          }
          
          this.users.set(newId, updatedUser);
          
          // Update currentUserId counter if PostgreSQL ID is higher
          if (customer.id >= this.currentUserId) {
            this.currentUserId = customer.id + 1;
          }
        }
      }
      
      // Save updated users to storage.json
      await this.saveData();
      console.log(`✅ Synced ${allCustomers.length} ACTIVE customers to local storage - Face ID now available`);
      console.log(`✅ Soft-deleted customers remain out of memory until explicitly restored`);
    } catch (error) {
      console.error('Error syncing customers to users:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      await this.persistentManager.saveData({
        users: this.users,
        accounts: this.accounts,
        transactions: this.transactions,
        payees: this.payees,
        scheduledPayments: this.scheduledPayments,
        statements: this.statements,
        chatMessages: this.chatMessages,
        chatResponses: this.chatResponses,
        chatSessions: this.chatSessions,
        counters: {
          currentUserId: this.currentUserId,
          currentAccountId: this.currentAccountId,
          currentTransactionId: this.currentTransactionId,
          currentPayeeId: this.currentPayeeId,
          currentScheduledPaymentId: this.currentScheduledPaymentId,
          currentStatementId: this.currentStatementId,
          currentChatMessageId: this.currentChatMessageId,
          currentChatResponseId: this.currentChatResponseId,
        }
      });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => 
      user.customerNumber === customerNumber && user.pin === pin
    );
  }

  async createUser(insertUser: InsertUser, customId?: number): Promise<User> {
    // CRITICAL: customId must be provided - it should be the PostgreSQL customer ID
    // This ensures memory user ID matches database customer ID
    if (customId === undefined) {
      throw new Error('createUser requires customId (PostgreSQL customer ID) to maintain sync');
    }
    
    const userId = customId;
    
    // Check if user already exists with this ID
    const existingUser = this.users.get(userId);
    if (existingUser) {
      console.log(`User with ID ${userId} already exists in memory, returning existing user`);
      return existingUser;
    }
    
    // Update counter to prevent future collisions
    if (userId >= this.currentUserId) {
      this.currentUserId = userId + 1;
    }
    
    const user: User = {
      id: userId,
      customerNumber: insertUser.customerNumber,
      pin: insertUser.pin,
      name: insertUser.name || "",
      email: insertUser.email || "",
      phone: insertUser.phone || null,
      address: insertUser.address || null,
      dateOfBirth: insertUser.dateOfBirth || null,
      joinDate: insertUser.joinDate || "Member since 2018",
      dateCreated: insertUser.dateCreated || new Date(),
      isDisabled: false
    };
    this.users.set(user.id, user);
    console.log(`✅ User created with ID=${userId} (customerNumber: ${insertUser.customerNumber})`);
    await this.saveData(); // Persist data immediately
    return user;
  }

  async getUser(customerNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.customerNumber === customerNumber);
  }

  async getUserById(userId: number): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async getUserByCustomerNumber(customerNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.customerNumber === customerNumber);
  }

  async updateUserProfile(customerNumber: string, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUserByCustomerNumber(customerNumber);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(user.id, updatedUser);
      await this.saveData(); // Persist changes to disk immediately
      
      // Sync changes to PostgreSQL customers table
      try {
        const customerUpdates: any = {};
        if (updates.name !== undefined) customerUpdates.name = updates.name;
        if (updates.email !== undefined) customerUpdates.email = updates.email;
        if (updates.phone !== undefined) customerUpdates.phone = updates.phone;
        if (updates.address !== undefined) customerUpdates.address = updates.address;
        if (updates.dateOfBirth !== undefined) customerUpdates.dateOfBirth = updates.dateOfBirth;
        if (updates.joinDate !== undefined) customerUpdates.joinDate = updates.joinDate;
        if (updates.currency !== undefined) customerUpdates.currency = updates.currency;
        
        if (Object.keys(customerUpdates).length > 0) {
          await this.updateCustomer(customerNumber, customerUpdates);
          console.log(`📊 CUSTOMER PROFILE SYNCED TO DATABASE: ${customerNumber}`);
        }
      } catch (error) {
        console.error('Failed to sync customer profile to database:', error);
        // Don't fail the update if database sync fails
      }
      
      return updatedUser;
    }
    return undefined;
  }

  async updateUserLocation(customerNumber: string, latitude: number, longitude: number): Promise<void> {
    // Update customer location in PostgreSQL database
    try {
      await this.updateCustomerLocation(customerNumber, latitude, longitude);
      console.log(`📍 Location updated in database for ${customerNumber}`);
    } catch (error) {
      console.error('Failed to update customer location:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(customerNumber: string): Promise<boolean> {
    const user = await this.getUserByCustomerNumber(customerNumber);
    if (user) {
      // Delete all user's accounts first
      const userAccounts = await this.getAccountsByUserId(user.id);
      for (const account of userAccounts) {
        // Delete all transactions for this account
        const accountTransactions = await this.getTransactionsByAccountId(account.id);
        accountTransactions.forEach(transaction => this.transactions.delete(transaction.id));
        // Delete the account
        this.accounts.delete(account.id);
      }
      
      // Delete all user's payees
      const payees = await this.getPayeesByUserId(user.id);
      payees.forEach(payee => this.payees.delete(payee.id));
      
      // Delete all user's chat messages and sessions
      const userChatMessages = Array.from(this.chatMessages.values()).filter(msg => msg.userId === user.id);
      userChatMessages.forEach(msg => this.chatMessages.delete(msg.id));
      
      const userChatSessions = Array.from(this.chatSessions.values()).filter(session => session.userId === user.id);
      userChatSessions.forEach(session => this.chatSessions.delete(session.sessionId));
      
      // Finally delete the user
      this.users.delete(user.id);
      await this.saveData(); // Persist data immediately
      return true;
    }
    return false;
  }

  // Customer operations (verified users in database)
  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const { db } = await import('./db');
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async getAllCustomers(includeDeleted: boolean = false): Promise<Customer[]> {
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');
    
    if (includeDeleted) {
      const result = await db.select().from(customers);
      return result;
    }
    
    // By default, exclude soft-deleted customers
    const result = await db.select().from(customers).where(eq(customers.isDeleted, false));
    return result;
  }

  async getCustomerByCustomerNumber(customerNumber: string, includeDeleted: boolean = false): Promise<Customer | undefined> {
    const { db } = await import('./db');
    const { eq, and } = await import('drizzle-orm');
    
    if (includeDeleted) {
      const result = await db.select().from(customers).where(eq(customers.customerNumber, customerNumber));
      return result[0];
    }
    
    // By default, exclude soft-deleted customers
    const result = await db.select().from(customers).where(
      and(
        eq(customers.customerNumber, customerNumber),
        eq(customers.isDeleted, false)
      )
    );
    return result[0];
  }

  async updateCustomer(customerNumber: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');
    const result = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.customerNumber, customerNumber))
      .returning();
    return result[0];
  }

  async updateCustomerLocation(customerNumber: string, latitude: number, longitude: number): Promise<Customer | undefined> {
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');
    const result = await db
      .update(customers)
      .set({
        lastLatitude: latitude.toString(),
        lastLongitude: longitude.toString(),
        lastLocationUpdate: new Date()
      })
      .where(eq(customers.customerNumber, customerNumber))
      .returning();
    return result[0];
  }

  // Soft-delete customer (safe, reversible)
  async deleteCustomer(customerNumber: string, reason?: string): Promise<boolean> {
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');
    
    // Get the user's ID before deleting to store it for restore
    const user = await this.getUserByCustomerNumber(customerNumber);
    const originalUserId = user?.id;
    
    const result = await db
      .update(customers)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deleteReason: reason || 'Deleted by admin',
        originalUserId: originalUserId // Store original user ID for restore
      })
      .where(eq(customers.customerNumber, customerNumber))
      .returning();
    
    return result.length > 0;
  }

  // Permanent erase customer (destructive, irreversible) - DELETE FROM ALL TABLES
  async permanentlyEraseCustomer(customerNumber: string): Promise<{ success: boolean; detail?: string }> {
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');
    const { sql } = await import('drizzle-orm');

    // Best-effort cleanup of a related table. Several of these tables are
    // optional and are NOT part of the Drizzle schema (e.g. access_codes lives
    // in JSON storage, permanent_tokens / permanent_user_sessions may not exist
    // in every deployment). A missing table must NOT abort the erase, otherwise
    // the whole operation fails before the authoritative customers-row delete
    // ever runs and permanent delete never works. So we swallow "relation does
    // not exist" errors and log anything else, then keep going.
    const safeExec = async (label: string, query: any) => {
      try {
        await db.execute(query);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (err?.code === '42P01' || /does not exist/i.test(msg)) {
          console.warn(`⏭️  Skipping ${label}: table not present`);
        } else {
          console.error(`⚠️  Error clearing ${label} during erase:`, msg);
        }
      }
    };

    try {
      // Get customer from PostgreSQL (user already deleted from memory during soft-delete)
      const customer = await this.getCustomerByCustomerNumber(customerNumber, true);
      const userId = customer?.id; // Use customer ID from PostgreSQL

      // Delete related data first (child rows before parents). Each is
      // best-effort so an optional/missing table can't block the erase.
      if (userId) {
        await safeExec('access_codes', sql`DELETE FROM access_codes WHERE user_id = ${userId}`);
        // Delete statements and transactions BEFORE deleting accounts (they reference account_id)
        await safeExec('transactions', sql`DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ${userId})`);
        await safeExec('statements', sql`DELETE FROM statements WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ${userId})`);
        // Now safe to delete accounts
        await safeExec('accounts', sql`DELETE FROM accounts WHERE user_id = ${userId}`);
        await safeExec('chat_messages', sql`DELETE FROM chat_messages WHERE user_id = ${userId}`);
        await safeExec('payees', sql`DELETE FROM payees WHERE user_id = ${userId}`);
        await safeExec('permanent_tokens', sql`DELETE FROM permanent_tokens WHERE user_id = ${userId}`);
        await safeExec('permanent_user_sessions (user_id)', sql`DELETE FROM permanent_user_sessions WHERE user_id = ${userId}`);
        await safeExec('permanent_user_sessions (customer_number)', sql`DELETE FROM permanent_user_sessions WHERE customer_number = ${customerNumber}`);
        await safeExec('scheduled_payments', sql`DELETE FROM scheduled_payments WHERE user_id = ${userId}`);

        console.log(`🔥 Cleared related data for user ${userId} (${customerNumber})`);
      }

      // Delete the customer row itself — the authoritative operation. If THIS
      // throws, report exactly why so the admin sees the real reason instead of
      // a generic failure.
      try {
        await db.delete(customers).where(eq(customers.customerNumber, customerNumber));
      } catch (delErr: any) {
        const detail = delErr?.message || String(delErr);
        console.error('Customer row delete failed during erase:', detail);
        return { success: false, detail };
      }

      // Best-effort session-table cleanup.
      const pattern = `%${customerNumber}%`;
      await safeExec('user_sessions', sql`DELETE FROM user_sessions WHERE sess::text LIKE ${pattern}`);
      await safeExec('sessions', sql`DELETE FROM sessions WHERE sess::text LIKE ${pattern}`);

      // Clear any in-memory copies so the customer can't linger or reappear on
      // this running instance (the admin list is DB-driven, but the user map is
      // held in memory / JSON).
      try {
        if (userId != null) {
          for (const acc of Array.from(this.accounts.values()).filter(a => a.userId === userId)) {
            for (const tx of Array.from(this.transactions.values()).filter(t => t.accountId === acc.id)) {
              this.transactions.delete(tx.id);
            }
            this.accounts.delete(acc.id);
          }
          for (const p of Array.from(this.payees.values()).filter(p => p.userId === userId)) {
            this.payees.delete(p.id);
          }
        }
        for (const u of Array.from(this.users.values()).filter(u => u.customerNumber === customerNumber)) {
          this.users.delete(u.id);
        }
        await this.saveData();
      } catch (memErr: any) {
        console.warn('Memory cleanup during erase had an issue:', memErr?.message || memErr);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error permanently erasing customer:', error);
      return { success: false, detail: error?.message || String(error) };
    }
  }

  // Restore soft-deleted customer
  async restoreCustomer(customerNumber: string): Promise<boolean> {
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');
    
    const result = await db
      .update(customers)
      .set({
        isDeleted: false,
        deletedAt: null,
        deleteReason: null
      })
      .where(eq(customers.customerNumber, customerNumber))
      .returning();
    
    return result.length > 0;
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    // First check memory cache
    const cachedAccounts = Array.from(this.accounts.values()).filter(account => account.userId === userId);
    
    if (cachedAccounts.length > 0) {
      return cachedAccounts;
    }
    
    // If not in memory, fetch from PostgreSQL and cache
    try {
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      const dbAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
      
      // Cache in memory for fast subsequent access
      for (const dbAccount of dbAccounts) {
        const account: Account = {
          id: dbAccount.id,
          userId: dbAccount.userId,
          accountType: dbAccount.accountType,
          accountNumber: dbAccount.accountNumber,
          sortCode: dbAccount.sortCode,
          bic: dbAccount.bic || 'BOFIIE2D',
          iban: dbAccount.iban || null,
          balance: dbAccount.balance,
          displayName: dbAccount.displayName
        };
        this.accounts.set(account.id, account);
        
        if (dbAccount.id >= this.currentAccountId) {
          this.currentAccountId = dbAccount.id + 1;
        }
      }
      
      console.log(`💳 Loaded ${dbAccounts.length} account(s) for user ${userId} from PostgreSQL`);
      return Array.from(this.accounts.values()).filter(account => account.userId === userId);
    } catch (error) {
      console.error('Error fetching accounts from PostgreSQL:', error);
      return [];
    }
  }

  async getAccountById(accountId: number): Promise<Account | undefined> {
    return this.accounts.get(accountId);
  }

  async getAccountBySortCodeAndNumber(sortCode: string, accountNumber: string): Promise<Account | undefined> {
    // Normalize sort code (remove dashes and spaces)
    const normalizedSortCode = sortCode.replace(/[-\s]/g, '');
    
    // Search through all accounts
    for (const account of this.accounts.values()) {
      const accSortCode = account.sortCode?.replace(/[-\s]/g, '') || '';
      if (accSortCode === normalizedSortCode && account.accountNumber === accountNumber) {
        return account;
      }
    }
    
    // Also try to find in PostgreSQL if not in memory
    try {
      const { db } = await import('./db');
      const allAccounts = await db.select().from(accounts);
      
      for (const acc of allAccounts) {
        const accSortCode = acc.sortCode?.replace(/[-\s]/g, '') || '';
        if (accSortCode === normalizedSortCode && acc.accountNumber === accountNumber) {
          return {
            id: acc.id,
            userId: acc.userId,
            accountType: acc.accountType,
            accountNumber: acc.accountNumber,
            sortCode: acc.sortCode,
            bic: acc.bic || 'BOFIIE2D',
            iban: acc.iban || null,
            balance: acc.balance,
            displayName: acc.displayName
          };
        }
      }
    } catch (error) {
      console.error('Error searching accounts by sort code:', error);
    }
    
    return undefined;
  }

  async getAccountByBicAndIban(bic: string, iban: string): Promise<Account | undefined> {
    // Normalize IBAN (remove spaces)
    const normalizedIban = iban.replace(/\s/g, '').toUpperCase();
    const normalizedBic = bic.replace(/\s/g, '').toUpperCase();
    
    // Search through all accounts
    for (const account of this.accounts.values()) {
      const accIban = account.iban?.replace(/\s/g, '').toUpperCase() || '';
      const accBic = account.bic?.replace(/\s/g, '').toUpperCase() || '';
      if (accIban === normalizedIban && accBic === normalizedBic) {
        return account;
      }
    }
    
    // Also try to find in PostgreSQL if not in memory
    try {
      const { db } = await import('./db');
      const allAccounts = await db.select().from(accounts);
      
      for (const acc of allAccounts) {
        const accIban = acc.iban?.replace(/\s/g, '').toUpperCase() || '';
        const accBic = acc.bic?.replace(/\s/g, '').toUpperCase() || '';
        if (accIban === normalizedIban && accBic === normalizedBic) {
          return {
            id: acc.id,
            userId: acc.userId,
            accountType: acc.accountType,
            accountNumber: acc.accountNumber,
            sortCode: acc.sortCode,
            bic: acc.bic || 'BOFIIE2D',
            iban: acc.iban || null,
            balance: acc.balance,
            displayName: acc.displayName
          };
        }
      }
    } catch (error) {
      console.error('Error searching accounts by BIC/IBAN:', error);
    }
    
    return undefined;
  }

  async getAllAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const { db } = await import('./db');
    
    // Insert into PostgreSQL first to get the real ID
    const [dbAccount] = await db
      .insert(accounts)
      .values(insertAccount)
      .returning();
    
    // Use the PostgreSQL ID for consistency
    const account: Account = {
      id: dbAccount.id,
      userId: dbAccount.userId,
      accountType: dbAccount.accountType,
      accountNumber: dbAccount.accountNumber,
      sortCode: dbAccount.sortCode,
      bic: dbAccount.bic || 'BOFIIE2D',
      iban: dbAccount.iban || null,
      balance: dbAccount.balance,
      displayName: dbAccount.displayName
    };
    
    // Also store in memory for fast access
    this.accounts.set(account.id, account);
    
    // Update counter to avoid ID conflicts
    if (account.id >= this.currentAccountId) {
      this.currentAccountId = account.id + 1;
    }
    
    console.log(`💾 Account saved to PostgreSQL and memory: ID=${account.id}, Account=${account.accountNumber}`);
    return account;
  }

  async updateAccountBalance(accountId: number, newBalance: string): Promise<void> {
    // Write to the database FIRST - it's the source of truth. If this fails,
    // the error propagates to the caller instead of being silently swallowed,
    // so the in-memory cache is never left out of sync with the database.
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');

    await db.update(accounts)
      .set({ balance: newBalance })
      .where(eq(accounts.id, accountId));

    console.log(`💰 Balance updated in PostgreSQL: Account ID=${accountId}, New Balance=${newBalance}`);

    // Only now update the in-memory cache, reflecting the confirmed DB write.
    const account = this.accounts.get(accountId);
    if (account) {
      account.balance = newBalance;
      this.accounts.set(accountId, account);
    }
  }

  async updateAccountDisplayName(accountId: number, displayName: string): Promise<void> {
    // Write to the database first and let failures propagate to the caller.
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');

    await db.update(accounts)
      .set({ displayName: displayName })
      .where(eq(accounts.id, accountId));

    console.log(`📝 Display name updated in PostgreSQL: Account ID=${accountId}, New Name=${displayName}`);

    const account = this.accounts.get(accountId);
    if (account) {
      account.displayName = displayName;
      this.accounts.set(accountId, account);
    }
  }

  async deleteAccount(accountId: number): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      // First delete all transactions for this account from PostgreSQL
      await db.delete(transactions).where(eq(transactions.accountId, accountId));
      
      // Delete the account from PostgreSQL
      const result = await db.delete(accounts).where(eq(accounts.id, accountId));
      
      // Also remove from memory cache
      this.accounts.delete(accountId);
      
      // Remove transactions from memory cache
      const txToDelete = Array.from(this.transactions.values()).filter(tx => tx.accountId === accountId);
      txToDelete.forEach(tx => this.transactions.delete(tx.id));
      
      console.log(`🗑️ Deleted account ${accountId} and its transactions from PostgreSQL and memory`);
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }

  async deleteAccountsByUserId(userId: number): Promise<boolean> {
    const userAccounts = await this.getAccountsByUserId(userId);
    let deleted = false;
    
    for (const account of userAccounts) {
      // Delete all transactions for this account
      const accountTransactions = await this.getTransactionsByAccountId(account.id);
      accountTransactions.forEach(transaction => this.transactions.delete(transaction.id));
      
      // Delete the account
      this.accounts.delete(account.id);
      deleted = true;
    }
    
    return deleted;
  }

  async clearAllTransactionsForUser(userId: number): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { eq, inArray } = await import('drizzle-orm');
      const { sql } = await import('drizzle-orm');
      
      // Get all account IDs for this user
      const userAccounts = await this.getAccountsByUserId(userId);
      const accountIds = userAccounts.map(acc => acc.id);
      
      if (accountIds.length === 0) {
        return true;
      }
      
      // Delete all transactions for all accounts from PostgreSQL
      await db.execute(sql`DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ${userId})`);
      
      // Clear from memory cache
      for (const accountId of accountIds) {
        const txToDelete = Array.from(this.transactions.values()).filter(tx => tx.accountId === accountId);
        txToDelete.forEach(tx => this.transactions.delete(tx.id));
      }
      
      console.log(`🗑️ Cleared all transactions for user ${userId} from PostgreSQL and memory`);
      return true;
    } catch (error) {
      console.error('Error clearing transactions for user:', error);
      return false;
    }
  }

  async getTransactionsByAccountId(accountId: number): Promise<Transaction[]> {
    try {
      const { db } = await import('./db');
      const { eq, desc } = await import('drizzle-orm');
      
      // Load from PostgreSQL
      const dbTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.accountId, accountId))
        .orderBy(desc(transactions.timestamp));
      
      console.log(`💳 Loaded ${dbTransactions.length} transaction(s) from PostgreSQL for account ${accountId}`);
      
      // Also update memory cache
      for (const tx of dbTransactions) {
        this.transactions.set(tx.id, tx);
      }
      
      return dbTransactions;
    } catch (error) {
      console.error('Error loading transactions from PostgreSQL, falling back to memory:', error);
      return Array.from(this.transactions.values()).filter(transaction => transaction.accountId === accountId);
    }
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const { db } = await import('./db');

    // Insert into PostgreSQL first - it's the source of truth. Errors are
    // allowed to propagate to the caller instead of silently falling back
    // to a memory-only transaction that would vanish on restart.
    const [transaction] = await db.insert(transactions)
      .values({
        accountId: insertTransaction.accountId,
        amount: insertTransaction.amount,
        description: insertTransaction.description,
        category: insertTransaction.category,
        type: insertTransaction.type,
        paymentMethod: insertTransaction.paymentMethod,
        reference: insertTransaction.reference || null,
        recipientName: insertTransaction.recipientName || null,
        iban: insertTransaction.iban || null,
        bicCode: insertTransaction.bicCode || null,
        recipientAccountNumber: insertTransaction.recipientAccountNumber || null,
        recipientSortCode: insertTransaction.recipientSortCode || null,
        recipientIban: insertTransaction.recipientIban || null,
        exchangeRate: insertTransaction.exchangeRate || null,
        convertedAmount: insertTransaction.convertedAmount || null,
        convertedCurrency: insertTransaction.convertedCurrency || null,
        timestamp: insertTransaction.timestamp,
        isSample: insertTransaction.isSample || false
      })
      .returning();

    // Only now update the in-memory cache, reflecting the confirmed DB write.
    this.transactions.set(transaction.id, transaction);

    if (transaction.id >= this.currentTransactionId) {
      this.currentTransactionId = transaction.id + 1;
    }

    await this.saveData();

    console.log(`💳 Transaction created in PostgreSQL: ID=${transaction.id}, Account=${transaction.accountId}, Amount=${transaction.amount}`);

    return transaction;
  }

  async getTransactionById(transactionId: number): Promise<Transaction | undefined> {
    try {
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      
      const [dbTransaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));
      
      if (dbTransaction) {
        this.transactions.set(dbTransaction.id, dbTransaction);
        return dbTransaction;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting transaction by ID from PostgreSQL:', error);
      return this.transactions.get(transactionId);
    }
  }

  // Deletes the transaction row and adjusts the owning account's balance in
  // ONE atomic database transaction, then returns the persisted new balance.
  // Errors propagate to the caller rather than being swallowed, since a
  // partial delete-without-balance-adjustment would leave the DB inconsistent.
  async deleteTransaction(transactionId: number): Promise<{ success: boolean; newBalance?: string }> {
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');

    const result = await db.transaction(async (tx) => {
      const [existingTransaction] = await tx.select().from(transactions).where(eq(transactions.id, transactionId));
      if (!existingTransaction) {
        return { success: false as const };
      }

      const [account] = await tx.select().from(accounts).where(eq(accounts.id, existingTransaction.accountId));
      if (!account) {
        return { success: false as const };
      }

      const newBalanceStr = balanceAfterReversal(
        account.balance,
        existingTransaction.amount,
        existingTransaction.type as 'credit' | 'debit'
      );

      await tx.delete(transactions).where(eq(transactions.id, transactionId));
      await tx.update(accounts).set({ balance: newBalanceStr }).where(eq(accounts.id, account.id));

      return { success: true as const, newBalance: newBalanceStr, accountId: account.id };
    });

    if (result.success) {
      // Only now update the in-memory cache, reflecting the confirmed DB write.
      this.transactions.delete(transactionId);
      const cachedAccount = this.accounts.get(result.accountId);
      if (cachedAccount) {
        cachedAccount.balance = result.newBalance;
        this.accounts.set(result.accountId, cachedAccount);
      }
      console.log(`🗑️ Transaction ${transactionId} deleted atomically, balance adjusted to ${result.newBalance}`);
    }

    return result;
  }

  async getPayeesByUserId(userId: number): Promise<Payee[]> {
    return Array.from(this.payees.values()).filter(payee => payee.userId === userId);
  }

  async createPayee(insertPayee: InsertPayee): Promise<Payee> {
    const payee: Payee = {
      id: this.currentPayeeId++,
      ...insertPayee,
      iban: insertPayee.iban ?? null,
      lastAmount: insertPayee.lastAmount ?? null
    };
    this.payees.set(payee.id, payee);
    return payee;
  }

  async getScheduledPaymentsByUserId(userId: number): Promise<ScheduledPayment[]> {
    return Array.from(this.scheduledPayments.values()).filter(payment => payment.userId === userId);
  }

  async getStatementsByAccountId(accountId: number): Promise<Statement[]> {
    return Array.from(this.statements.values()).filter(statement => statement.accountId === accountId);
  }

  async getChatMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(message => message.sessionId === sessionId);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: this.currentChatMessageId++,
      ...insertMessage,
      agentName: insertMessage.agentName ?? null,
      userId: insertMessage.userId ?? null,
      timestamp: insertMessage.timestamp || new Date()
    };
    this.chatMessages.set(message.id, message);
    return message;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(sessionId);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const session: ChatSession = {
      id: this.currentChatSessionId++,
      ...insertSession,
      userId: insertSession.userId ?? null,
      isActive: insertSession.isActive ?? true,
      endedAt: insertSession.endedAt ?? null,
      startedAt: insertSession.startedAt || new Date()
    };
    this.chatSessions.set(session.sessionId, session);
    return session;
  }

  async endChatSession(sessionId: string): Promise<void> {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.endedAt = new Date();
      this.chatSessions.set(sessionId, session);
    }
  }

  async getChatResponses(): Promise<ChatResponse[]> {
    return Array.from(this.chatResponses.values());
  }

  async createChatResponse(insertResponse: InsertChatResponse): Promise<ChatResponse> {
    const now = new Date();
    const response: ChatResponse = {
      id: this.currentChatResponseId++,
      ...insertResponse,
      isActive: insertResponse.isActive ?? true,
      createdAt: insertResponse.createdAt ?? now,
      updatedAt: insertResponse.updatedAt ?? now
    };
    this.chatResponses.set(response.id, response);
    return response;
  }

  async updateChatResponse(id: number, updates: Partial<ChatResponse>): Promise<ChatResponse | undefined> {
    const response = this.chatResponses.get(id);
    if (response) {
      const updatedResponse = { ...response, ...updates };
      this.chatResponses.set(id, updatedResponse);
      return updatedResponse;
    }
    return undefined;
  }

  async deleteChatResponse(id: number): Promise<void> {
    this.chatResponses.delete(id);
  }

  // Admin operations
  async getAllDeviceSessions(): Promise<any[]> {
    const { getAllDeviceSessions } = await import('./deviceSessions');
    const sessions = getAllDeviceSessions();
    
    // Enrich sessions with user account information
    const enrichedSessions = await Promise.all(sessions.map(async (session) => {
      const user = await this.getUserByCustomerNumber(session.customerNumber || '');
      return {
        ...session,
        accountName: user?.name || `Customer ${session.customerNumber}`,
        accountEmail: user?.email || `${session.customerNumber}@example.com`
      };
    }));
    
    return enrichedSessions;
  }

  async blockDeviceSession(sessionId: string): Promise<void> {
    const { blockDevice } = await import('./deviceSessions');
    blockDevice(sessionId);
  }

  async unblockDeviceSession(sessionId: string): Promise<void> {
    const { unblockDevice } = await import('./deviceSessions');
    unblockDevice(sessionId);
  }

  async enableDevicePanicMode(sessionId: string): Promise<void> {
    const { activateDevicePanicMode } = await import('./deviceSessions');
    activateDevicePanicMode(sessionId);
  }

  async disableDevicePanicMode(sessionId: string): Promise<void> {
    const { deactivateDevicePanicMode } = await import('./deviceSessions');
    deactivateDevicePanicMode(sessionId);
  }

  async disableUser(userId: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isDisabled = true;
      this.users.set(userId, user);
    }
  }

  async enableUser(userId: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isDisabled = false;
      this.users.set(userId, user);
    }
  }

  async getUsersWithDisabledStatus(): Promise<any[]> {
    return await this.getAllUsers();
  }

}

export const storage = new MemStorage();