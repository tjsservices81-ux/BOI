import { 
  users, accounts, transactions, payees, scheduledPayments, statements,
  chatMessages, chatResponses, chatSessions,
  type User, type Account, type Transaction, type Payee, type ScheduledPayment, type Statement,
  type ChatMessage, type ChatResponse, type ChatSession,
  type InsertUser, type InsertAccount, type InsertTransaction, type InsertPayee,
  type InsertChatMessage, type InsertChatResponse, type InsertChatSession
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  async getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.customerNumber, customerNumber));
    if (user && user.pin === pin) {
      return user;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByCustomerNumber(customerNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.customerNumber, customerNumber));
    return user;
  }

  async updateUserProfile(customerNumber: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      console.log('Updating user profile:', customerNumber, updates);
      
      // Filter out undefined values and id field
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key, value]) => value !== undefined && key !== 'id')
      );
      
      console.log('Clean updates:', cleanUpdates);
      
      const [user] = await db.update(users)
        .set(cleanUpdates)
        .where(eq(users.customerNumber, customerNumber))
        .returning();
      
      console.log('Updated user:', user);
      return user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccountById(accountId: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    return account;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateAccountBalance(accountId: number, newBalance: string): Promise<void> {
    await db.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, accountId));
  }

  async getTransactionsByAccountId(accountId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.accountId, accountId));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getPayeesByUserId(userId: number): Promise<Payee[]> {
    return await db.select().from(payees).where(eq(payees.userId, userId));
  }

  async createPayee(payee: InsertPayee): Promise<Payee> {
    const [newPayee] = await db.insert(payees).values(payee).returning();
    return newPayee;
  }

  async getScheduledPaymentsByUserId(userId: number): Promise<ScheduledPayment[]> {
    return await db.select().from(scheduledPayments).where(eq(scheduledPayments.userId, userId));
  }

  async getStatementsByAccountId(accountId: number): Promise<Statement[]> {
    return await db.select().from(statements).where(eq(statements.accountId, accountId));
  }

  // Chat operations
  async getChatMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
    return session;
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [newSession] = await db.insert(chatSessions).values(session).returning();
    return newSession;
  }

  async endChatSession(sessionId: string): Promise<void> {
    await db.update(chatSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(chatSessions.sessionId, sessionId));
  }

  async getChatResponses(): Promise<ChatResponse[]> {
    return await db.select().from(chatResponses).where(eq(chatResponses.isActive, true));
  }

  async createChatResponse(response: InsertChatResponse): Promise<ChatResponse> {
    const [newResponse] = await db.insert(chatResponses).values(response).returning();
    return newResponse;
  }

  async updateChatResponse(id: number, updates: Partial<ChatResponse>): Promise<ChatResponse | undefined> {
    const [updated] = await db.update(chatResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatResponses.id, id))
      .returning();
    return updated;
  }

  async deleteChatResponse(id: number): Promise<void> {
    await db.update(chatResponses)
      .set({ isActive: false })
      .where(eq(chatResponses.id, id));
  }

  // Initialize sample data for first-time setup
  async initializeSampleData(): Promise<void> {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) return;

    // Create default user structure
    const [user] = await db.insert(users).values({
      customerNumber: "12345678",
      pin: "1234", 
      name: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      joinDate: ""
    }).returning();

    // Create default accounts with zero balances
    const defaultAccounts = [
      {
        userId: user.id,
        accountType: "current",
        accountNumber: "****2091", 
        balance: "0.00",
        displayName: "Current Account"
      },
      {
        userId: user.id,
        accountType: "credit",
        accountNumber: "****1820",
        balance: "0.00",
        displayName: "Credit Card"
      },
      {
        userId: user.id,
        accountType: "savings",
        accountNumber: "****0978",
        balance: "0.00", 
        displayName: "Savings Account"
      }
    ];

    const createdAccounts = await db.insert(accounts).values(defaultAccounts).returning();

    // Initialize with no transactions
    // Accounts are ready for real transaction data
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private accounts: Map<number, Account> = new Map();
  private transactions: Map<number, Transaction> = new Map();
  private payees: Map<number, Payee> = new Map();
  private scheduledPayments: Map<number, ScheduledPayment> = new Map();
  private statements: Map<number, Statement> = new Map();
  
  private currentUserId = 1;
  private currentAccountId = 1;
  private currentTransactionId = 1;
  private currentPayeeId = 1;
  private currentScheduledPaymentId = 1;
  private currentStatementId = 1;

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create default user structure
    const user: User = {
      id: this.currentUserId++,
      customerNumber: "12345678",
      pin: "1234",
      name: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      joinDate: "",
      dateCreated: new Date()
    };
    this.users.set(user.id, user);

    // Create default accounts with zero balances
    const currentAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "current",
      accountNumber: "****2091",
      balance: "0.00",
      displayName: "Current Account"
    };
    this.accounts.set(currentAccount.id, currentAccount);

    const creditCardAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "credit",
      accountNumber: "****1820",
      balance: "0.00",
      displayName: "Credit Card"
    };
    this.accounts.set(creditCardAccount.id, creditCardAccount);

    const savingsAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "savings",
      accountNumber: "****0978",
      balance: "0.00",
      displayName: "Savings Account"
    };
    this.accounts.set(savingsAccount.id, savingsAccount);

    // Initialize with empty data structures - ready for real data
    // No sample transactions, payees, or scheduled payments


  }

  async getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.customerNumber === customerNumber && user.pin === pin
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
      ...insertUser,
      phone: insertUser.phone || null,
      address: insertUser.address || null,
      dateOfBirth: insertUser.dateOfBirth || null,
      joinDate: insertUser.joinDate || "Member since 2018",
      dateCreated: insertUser.dateCreated || new Date()
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
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.accountId === accountId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      id: this.currentTransactionId++,
      ...insertTransaction,
      reference: insertTransaction.reference ?? null,
      recipientName: insertTransaction.recipientName ?? null,
      iban: insertTransaction.iban ?? null,
      bicCode: insertTransaction.bicCode || null,
      exchangeRate: insertTransaction.exchangeRate || null,
      convertedAmount: insertTransaction.convertedAmount || null,
      convertedCurrency: insertTransaction.convertedCurrency || null
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
      ...insertPayee,
      iban: insertPayee.iban || null,
      lastAmount: insertPayee.lastAmount || null
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

  // Chat operations - in-memory implementation
  private chatMessages: Map<number, ChatMessage> = new Map();
  private chatSessions: Map<number, ChatSession> = new Map();
  private chatResponses: Map<number, ChatResponse> = new Map();
  private currentChatMessageId = 1;
  private currentChatSessionId = 1;
  private currentChatResponseId = 1;

  async getChatMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(msg => msg.sessionId === sessionId);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const chatMessage: ChatMessage = {
      id: this.currentChatMessageId++,
      ...message,
      userId: message.userId || null,
      agentName: message.agentName || null,
      timestamp: message.timestamp || new Date()
    };
    this.chatMessages.set(chatMessage.id, chatMessage);
    return chatMessage;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    return Array.from(this.chatSessions.values()).find(session => session.sessionId === sessionId);
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const chatSession: ChatSession = {
      id: this.currentChatSessionId++,
      ...session,
      userId: session.userId || null,
      endedAt: session.endedAt || null,
      startedAt: session.startedAt || new Date(),
      isActive: session.isActive !== undefined ? session.isActive : true
    };
    this.chatSessions.set(chatSession.id, chatSession);
    return chatSession;
  }

  async endChatSession(sessionId: string): Promise<void> {
    const session = await this.getChatSession(sessionId);
    if (session) {
      session.isActive = false;
      session.endedAt = new Date();
      this.chatSessions.set(session.id, session);
    }
  }

  async getChatResponses(): Promise<ChatResponse[]> {
    return Array.from(this.chatResponses.values()).filter(response => response.isActive);
  }

  async createChatResponse(response: InsertChatResponse): Promise<ChatResponse> {
    const chatResponse: ChatResponse = {
      id: this.currentChatResponseId++,
      ...response,
      createdAt: response.createdAt || new Date(),
      updatedAt: response.updatedAt || new Date(),
      isActive: response.isActive !== undefined ? response.isActive : true
    };
    this.chatResponses.set(chatResponse.id, chatResponse);
    return chatResponse;
  }

  async updateChatResponse(id: number, updates: Partial<ChatResponse>): Promise<ChatResponse | undefined> {
    const response = this.chatResponses.get(id);
    if (response) {
      const updated = { ...response, ...updates, updatedAt: new Date() };
      this.chatResponses.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteChatResponse(id: number): Promise<void> {
    const response = this.chatResponses.get(id);
    if (response) {
      response.isActive = false;
      this.chatResponses.set(id, response);
    }
  }
}

export const storage = new DatabaseStorage();
