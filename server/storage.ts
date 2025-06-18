import { 
  users, accounts, transactions, payees, scheduledPayments, statements,
  chatMessages, chatResponses, chatSessions,
  type User, type Account, type Transaction, type Payee, type ScheduledPayment, type Statement,
  type ChatMessage, type ChatResponse, type ChatSession,
  type InsertUser, type InsertAccount, type InsertTransaction, type InsertPayee,
  type InsertChatMessage, type InsertChatResponse, type InsertChatSession
} from "@shared/schema";
import { PersistentDataManager } from "./persistentStorage";

export interface IStorage {
  // User operations
  getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUser(customerNumber: string): Promise<User | undefined>;
  getUserByCustomerNumber(customerNumber: string): Promise<User | undefined>;
  updateUserProfile(customerNumber: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(customerNumber: string): Promise<boolean>;
  
  // Account operations
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getUserAccounts(customerNumber: string): Promise<Account[]>;
  getAccountById(accountId: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(accountId: number, newBalance: string): Promise<void>;
  deleteAccountsByUserId(userId: number): Promise<boolean>;
  
  // Transaction operations
  getTransactionsByAccountId(accountId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
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
  
  // Admin operations
  getAllDeviceSessions(): Promise<any[]>;
  blockDeviceSession(sessionId: string): Promise<void>;
  unblockDeviceSession(sessionId: string): Promise<void>;
  enableDevicePanicMode(sessionId: string): Promise<void>;
  disableDevicePanicMode(sessionId: string): Promise<void>;
  disableUser(userId: number): Promise<void>;
  enableUser(userId: number): Promise<void>;
  getUsersWithDisabledStatus(): Promise<any[]>;
  
  // Initialize sample data
  initializeSampleData(): Promise<void>;
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
    } catch (error) {
      console.error('Error loading persisted data:', error);
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
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
    await this.saveData(); // Persist data immediately
    return user;
  }

  async getUser(customerNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.customerNumber === customerNumber);
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
      return updatedUser;
    }
    return undefined;
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

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(account => account.userId === userId);
  }

  async getUserAccounts(customerNumber: string): Promise<Account[]> {
    const user = await this.getUserByCustomerNumber(customerNumber);
    if (user) {
      return await this.getAccountsByUserId(user.id);
    }
    return [];
  }

  async getAccountById(accountId: number): Promise<Account | undefined> {
    return this.accounts.get(accountId);
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const account: Account = {
      id: this.currentAccountId++,
      ...insertAccount
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async updateAccountBalance(accountId: number, newBalance: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (account) {
      account.balance = newBalance;
      this.accounts.set(accountId, account);
      await this.saveData(); // Persist changes immediately
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

  async getTransactionsByAccountId(accountId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(transaction => transaction.accountId === accountId);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      id: this.currentTransactionId++,
      ...insertTransaction
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async getPayeesByUserId(userId: number): Promise<Payee[]> {
    return Array.from(this.payees.values()).filter(payee => payee.userId === userId);
  }

  async createPayee(insertPayee: InsertPayee): Promise<Payee> {
    const payee: Payee = {
      id: this.currentPayeeId++,
      ...insertPayee
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
      ...insertSession,
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
    const response: ChatResponse = {
      id: this.currentChatResponseId++,
      ...insertResponse
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

  // Initialize sample data for first-time setup ONLY
  async initializeSampleData(): Promise<void> {
    // Only initialize if no persistent data exists AND no users in memory
    if (this.persistentManager.hasPersistedData() || this.users.size > 0) {
      console.log("Data already exists, skipping sample data initialization");
      return;
    }

    console.log("No existing users found, skipping sample data initialization to prevent data override");
    return;

    // Create sample users with the existing test accounts
    const sampleUsers = [
      {
        customerNumber: "12345678",
        pin: "1234",
        name: "Shahah",
        email: "shsjhs@gmail.com",
        phone: "+353 1 234",
        address: "Hello shehsjs",
        dateOfBirth: "2025-06-01",
        joinDate: "Member since 2022"
      },
      {
        customerNumber: "BOI050171232",
        pin: "000000",
        name: "James Morrison",
        email: "james.morrison@email.com",
        phone: "+353 87 123 4567",
        address: "15 Grafton Street, Dublin 2, Ireland",
        dateOfBirth: "1985-03-15",
        joinDate: "Member since 2020"
      },
      {
        customerNumber: "BOI911163841",
        pin: "000000",
        name: "Harry",
        email: "ppatstshshs@gmail.com",
        phone: "65353584545",
        address: "Dhhsjaus",
        dateOfBirth: "2015-02-01",
        joinDate: "Member since 2024"
      },
      {
        customerNumber: "BOI738185556",
        pin: "000000",
        name: "James",
        email: "hello@gmail.com",
        phone: "+353 1 234 5678",
        address: "Hello",
        dateOfBirth: "2025-06-08",
        joinDate: "Member since 2018"
      },
      {
        customerNumber: "BOI070974442",
        pin: "000000",
        name: "James",
        email: "hello@gmail.com",
        phone: "+353 1 234 5678",
        address: "Hello",
        dateOfBirth: "2025-06-08",
        joinDate: "Member since 2018"
      },
      {
        customerNumber: "BOI424898838",
        pin: "000000",
        name: "Kevin",
        email: "kevinm@gmail.com",
        phone: "+447428064718",
        address: "maugh",
        dateOfBirth: "2009-10-01",
        joinDate: "2022"
      },
      {
        customerNumber: "BOI705915608",
        pin: "000000",
        name: "Mathew",
        email: "dhhssksksj@gmail.com",
        phone: "434664343434",
        address: "2a",
        dateOfBirth: "2007-06-14",
        joinDate: "Member Since 2022"
      },
      {
        customerNumber: "BOI514951178",
        pin: "000000",
        name: "Harry Flek",
        email: "harryflek@gmail.com",
        phone: "07428064718",
        address: "",
        dateOfBirth: "",
        joinDate: "Member Since 2022"
      },
      {
        customerNumber: "BOI794439650",
        pin: "000000",
        name: "James Wilson",
        email: "jameswilson202@gmail.com",
        phone: "3454545467577",
        address: "",
        dateOfBirth: "",
        joinDate: "2025-06-15T15:33:27.627Z"
      },
      {
        customerNumber: "BOI744505351",
        pin: "000000",
        name: "James willoughby",
        email: "jameswilloughby57@gmail.com",
        phone: "07769911123",
        address: "31 Ashfield Road Dublin 6 D06 WD50 Ireland",
        dateOfBirth: "1999-08-14",
        joinDate: "Member since 2021"
      },
      {
        customerNumber: "BOI461732937",
        pin: "000000",
        name: "James Papa",
        email: "hahahaha@gmail.com",
        phone: "07428064718",
        address: "",
        dateOfBirth: "2001-06-01",
        joinDate: "2025-06-"
      },
      {
        customerNumber: "BOI634374772",
        pin: "000000",
        name: "James",
        email: "haha@gmail.com",
        phone: "07428064718",
        address: "",
        dateOfBirth: "",
        joinDate: "2025-06-16T12:02:59.685Z"
      }
    ];

    for (const userData of sampleUsers) {
      const user = await this.createUser(userData);
      console.log(`Created user: ${user.name} (${user.customerNumber})`);

      // Create sample accounts for each user
      const sampleAccounts = [
        {
          userId: user.id,
          type: "Current Account" as const,
          accountNumber: `IE12BOFI90000${user.id}12345678`,
          balance: "2500.00",
          currency: "EUR" as const,
          isActive: true
        },
        {
          userId: user.id,
          type: "Savings Account" as const,
          accountNumber: `IE12BOFI90000${user.id}87654321`,
          balance: "15000.00",
          currency: "EUR" as const,
          isActive: true
        }
      ];

      for (const accountData of sampleAccounts) {
        const account = await this.createAccount(accountData);

        // Create sample transactions
        const sampleTransactions = [
          {
            accountId: account.id,
            type: "credit" as const,
            amount: "500.00",
            currency: "EUR" as const,
            description: "Salary deposit",
            reference: "SAL001",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            balance: account.balance
          },
          {
            accountId: account.id,
            type: "debit" as const,
            amount: "125.50",
            currency: "EUR" as const,
            description: "Grocery shopping",
            reference: "POS001",
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            balance: (parseFloat(account.balance) - 125.50).toString()
          }
        ];

        for (const transactionData of sampleTransactions) {
          await this.createTransaction(transactionData);
        }
      }

      // Create sample payees
      const samplePayees = [
        {
          userId: user.id,
          name: "Electric Ireland",
          accountNumber: "IE29AIBK93115212345678",
          sortCode: "931152",
          type: "Utility" as const
        },
        {
          userId: user.id,
          name: "John Smith",
          accountNumber: "IE64BOFI90017412345678",
          sortCode: "900174",
          type: "Personal" as const
        }
      ];

      for (const payeeData of samplePayees) {
        await this.createPayee(payeeData);
      }
    }

    console.log("Sample data initialization complete");
  }
}

export const storage = new MemStorage();