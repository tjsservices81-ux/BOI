import { 
  users, accounts, transactions, payees, scheduledPayments, statements,
  chatMessages, chatResponses, chatSessions,
  type User, type Account, type Transaction, type Payee, type ScheduledPayment, type Statement,
  type ChatMessage, type ChatResponse, type ChatSession,
  type InsertUser, type InsertAccount, type InsertTransaction, type InsertPayee,
  type InsertChatMessage, type InsertChatResponse, type InsertChatSession
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByCustomerNumber(customerNumber: string): Promise<User | undefined>;
  updateUserProfile(customerNumber: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Account operations
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getAccountById(accountId: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(accountId: number, newBalance: string): Promise<void>;
  
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

// In-memory storage implementation
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

  constructor() {
    this.initializeSampleData();
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
      name: insertUser.name || null,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      address: insertUser.address || null,
      dateOfBirth: insertUser.dateOfBirth || null,
      joinDate: insertUser.joinDate || "Member since 2018",
      dateCreated: insertUser.dateCreated || new Date(),
      isDisabled: false
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUserByCustomerNumber(customerNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.customerNumber === customerNumber);
  }

  async updateUserProfile(customerNumber: string, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUserByCustomerNumber(customerNumber);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(user.id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(account => account.userId === userId);
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
    }
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

  // Initialize clean data store for production use
  async initializeSampleData(): Promise<void> {
    // Check if data already exists
    if (this.users.size > 0) {
      return; // Data already exists
    }

    // Production-ready initialization - no sample data
    console.log("Banking application ready for production use");
  }
}

export const storage = new MemStorage();