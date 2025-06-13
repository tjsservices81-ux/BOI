import { 
  users, accounts, transactions, payees, scheduledPayments, statements,
  type User, type Account, type Transaction, type Payee, type ScheduledPayment, type Statement,
  type InsertUser, type InsertAccount, type InsertTransaction, type InsertPayee
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByCustomerNumber(customerNumber: string): Promise<User | undefined>;
  updateUserProfile(customerNumber: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Account operations
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getAccountById(accountId: number): Promise<Account | undefined>;
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
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.customerNumber, customerNumber))
      .returning();
    return user;
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccountById(accountId: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
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

  // Initialize sample data for first-time setup
  async initializeSampleData(): Promise<void> {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) return;

    // Create sample user
    const [user] = await db.insert(users).values({
      customerNumber: "12345678",
      pin: "1234", 
      name: "Sarah Murphy",
      email: "sarah.murphy@email.com"
    }).returning();

    // Create sample accounts
    const sampleAccounts = [
      {
        userId: user.id,
        accountType: "current",
        accountNumber: "****4829", 
        balance: "8247.32",
        displayName: "Current Account"
      },
      {
        userId: user.id,
        accountType: "savings",
        accountNumber: "****7251",
        balance: "4600.00", 
        displayName: "Savings Account"
      },
      {
        userId: user.id,
        accountType: "credit",
        accountNumber: "****1820",
        balance: "2000.00",
        displayName: "Credit Card"
      },
      {
        userId: user.id,
        accountType: "loan",
        accountNumber: "****8923",
        balance: "2500.00",
        displayName: "Personal Loan"
      },
      {
        userId: user.id,
        accountType: "deposit",
        accountNumber: "****7908",
        balance: "100.00",
        displayName: "Deposit - 365 Monthly Saver"
      }
    ];

    const createdAccounts = await db.insert(accounts).values(sampleAccounts).returning();

    // Create sample transactions for the current account
    const currentAccount = createdAccounts[0];
    const sampleTransactions = [
      {
        accountId: currentAccount.id,
        amount: "-47.82",
        description: "Tesco Ireland",
        category: "shopping",
        type: "debit",
        paymentMethod: "Debit Card",
        reference: "1234567890",
        timestamp: new Date("2024-12-30T14:34:00Z")
      },
      {
        accountId: currentAccount.id,
        amount: "-25.00", 
        description: "Spotify Premium",
        category: "entertainment",
        type: "debit",
        paymentMethod: "Direct Debit",
        reference: "DD123456",
        timestamp: new Date("2024-12-29T10:15:00Z")
      },
      {
        accountId: currentAccount.id,
        amount: "+2500.00",
        description: "Salary Payment",
        category: "income",
        type: "credit", 
        paymentMethod: "Bank Transfer",
        reference: "SAL202412",
        timestamp: new Date("2024-12-28T09:00:00Z")
      }
    ];

    await db.insert(transactions).values(sampleTransactions);
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
    // Create sample user
    const user: User = {
      id: this.currentUserId++,
      customerNumber: "12345678",
      pin: "1234",
      name: "Sarah Murphy",
      email: "sarah.murphy@email.com"
    };
    this.users.set(user.id, user);

    // Create sample accounts
    const currentAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "current",
      accountNumber: "****4829",
      balance: "8247.32",
      displayName: "Current Account"
    };
    this.accounts.set(currentAccount.id, currentAccount);

    const savingsAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "savings",
      accountNumber: "****7251",
      balance: "4600.00",
      displayName: "Savings Account"
    };
    this.accounts.set(savingsAccount.id, savingsAccount);

    const creditCardAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "credit",
      accountNumber: "****1820",
      balance: "2000.00",
      displayName: "Credit Card"
    };
    this.accounts.set(creditCardAccount.id, creditCardAccount);

    const loanAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "loan",
      accountNumber: "****8923",
      balance: "2500.00",
      displayName: "Personal Loan"
    };
    this.accounts.set(loanAccount.id, loanAccount);

    const depositAccount: Account = {
      id: this.currentAccountId++,
      userId: user.id,
      accountType: "deposit",
      accountNumber: "****7908",
      balance: "100.00",
      displayName: "Deposit - 365 Monthly Saver"
    };
    this.accounts.set(depositAccount.id, depositAccount);

    // Create sample transactions
    const sampleTransactions: Transaction[] = [
      {
        id: this.currentTransactionId++,
        accountId: currentAccount.id,
        amount: "-47.82",
        description: "Tesco Ireland",
        category: "shopping",
        type: "debit",
        paymentMethod: "Debit Card",
        reference: "1234567890",
        timestamp: new Date("2024-12-30T14:34:00")
      },
      {
        id: this.currentTransactionId++,
        accountId: currentAccount.id,
        amount: "-68.50",
        description: "Applegreen",
        category: "fuel",
        type: "debit",
        paymentMethod: "Debit Card",
        reference: "9876543210",
        timestamp: new Date("2024-12-29T08:15:00")
      },
      {
        id: this.currentTransactionId++,
        accountId: currentAccount.id,
        amount: "+3200.00",
        description: "Salary Deposit",
        category: "salary",
        type: "credit",
        paymentMethod: "Direct Deposit",
        reference: "SAL202412",
        timestamp: new Date("2024-12-28T09:00:00")
      },
      {
        id: this.currentTransactionId++,
        accountId: currentAccount.id,
        amount: "-87.20",
        description: "The Brazen Head",
        category: "dining",
        type: "debit",
        paymentMethod: "Debit Card",
        reference: "5555666677",
        timestamp: new Date("2024-12-27T19:45:00")
      },
      {
        id: this.currentTransactionId++,
        accountId: currentAccount.id,
        amount: "-89.50",
        description: "Electric Ireland",
        category: "utilities",
        type: "debit",
        paymentMethod: "Bill Payment",
        reference: "EI20241226",
        timestamp: new Date("2024-12-26T10:30:00")
      }
    ];

    sampleTransactions.forEach(transaction => {
      this.transactions.set(transaction.id, transaction);
    });

    // Create sample payees
    const samplePayees: Payee[] = [
      {
        id: this.currentPayeeId++,
        userId: user.id,
        name: "Electric Ireland",
        iban: "IE29AIBK93115212345678",
        category: "utilities",
        lastAmount: "89.50"
      },
      {
        id: this.currentPayeeId++,
        userId: user.id,
        name: "Virgin Media",
        iban: "IE64BOFI90583812345678",
        category: "internet",
        lastAmount: "65.00"
      },
      {
        id: this.currentPayeeId++,
        userId: user.id,
        name: "Dublin City Council",
        iban: "IE89BOFI90123456789012",
        category: "council",
        lastAmount: "145.00"
      }
    ];

    samplePayees.forEach(payee => {
      this.payees.set(payee.id, payee);
    });

    // Create sample scheduled payments
    const sampleScheduledPayments: ScheduledPayment[] = [
      {
        id: this.currentScheduledPaymentId++,
        userId: user.id,
        payeeName: "Mortgage Payment",
        amount: "1250.00",
        frequency: "monthly",
        nextPayment: new Date("2025-01-01")
      },
      {
        id: this.currentScheduledPaymentId++,
        userId: user.id,
        payeeName: "Phone Bill",
        amount: "45.00",
        frequency: "monthly",
        nextPayment: new Date("2025-01-15")
      }
    ];

    sampleScheduledPayments.forEach(payment => {
      this.scheduledPayments.set(payment.id, payment);
    });

    // Create sample statements
    const sampleStatements: Statement[] = [
      {
        id: this.currentStatementId++,
        accountId: currentAccount.id,
        month: "December",
        year: 2024,
        transactionCount: 23,
        available: true
      },
      {
        id: this.currentStatementId++,
        accountId: currentAccount.id,
        month: "November",
        year: 2024,
        transactionCount: 31,
        available: true
      },
      {
        id: this.currentStatementId++,
        accountId: currentAccount.id,
        month: "October",
        year: 2024,
        transactionCount: 28,
        available: true
      }
    ];

    sampleStatements.forEach(statement => {
      this.statements.set(statement.id, statement);
    });
  }

  async getUserByCredentials(customerNumber: string, pin: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.customerNumber === customerNumber && user.pin === pin
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
      ...insertUser
    };
    this.users.set(user.id, user);
    return user;
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(account => account.userId === userId);
  }

  async getAccountById(accountId: number): Promise<Account | undefined> {
    return this.accounts.get(accountId);
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
      reference: insertTransaction.reference || null
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
}

export const storage = new DatabaseStorage();
