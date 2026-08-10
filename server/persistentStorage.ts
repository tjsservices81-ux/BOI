import * as fs from 'fs';
import * as path from 'path';
import { dataFilePath, isProduction } from './environment';
import { 
  type User, type Account, type Transaction, type Payee, type ScheduledPayment, type Statement,
  type ChatMessage, type ChatResponse, type ChatSession,
  type InsertUser, type InsertAccount, type InsertTransaction, type InsertPayee,
  type InsertChatMessage, type InsertChatResponse, type InsertChatSession
} from "@shared/schema";

interface StorageData {
  users: Map<number, User>;
  accounts: Map<number, Account>;
  transactions: Map<number, Transaction>;
  payees: Map<number, Payee>;
  scheduledPayments: Map<number, ScheduledPayment>;
  statements: Map<number, Statement>;
  chatMessages: Map<number, ChatMessage>;
  chatResponses: Map<number, ChatResponse>;
  chatSessions: Map<string, ChatSession>;
  counters: {
    currentUserId: number;
    currentAccountId: number;
    currentTransactionId: number;
    currentPayeeId: number;
    currentScheduledPaymentId: number;
    currentStatementId: number;
    currentChatMessageId: number;
    currentChatResponseId: number;
  };
}

export class PersistentDataManager {
  private dataPath: string;
  private initialized: boolean = false;

  constructor() {
    // Development writes to data/storage.dev.json so it can never modify the
    // production snapshot.
    this.dataPath = dataFilePath('storage.json');
    this.ensureDataDirectory();
    this.seedFromRepositorySnapshotOnce();
  }

  /**
   * Copy the snapshot committed at data/storage.json the first time this
   * environment runs, so it starts with something rather than nothing. From
   * then on the two files are entirely separate — changes never cross over.
   *
   * This covers two cases:
   *   • development, which writes data/storage.dev.json
   *   • a host with DATA_DIR pointing at a persistent disk, whose first boot
   *     would otherwise begin with an empty store
   */
  private seedFromRepositorySnapshotOnce(): void {
    try {
      if (fs.existsSync(this.dataPath)) return;
      const repoPath = path.join(process.cwd(), 'data', 'storage.json');
      if (path.resolve(repoPath) === path.resolve(this.dataPath)) return;
      if (!fs.existsSync(repoPath)) return;
      fs.copyFileSync(repoPath, this.dataPath);
      console.log(`🌱 Seeded ${isProduction() ? 'production' : 'development'} data from the committed snapshot (one time only).`);
      console.log('   From here on this environment keeps its own data.');
    } catch (error) {
      console.warn('Could not seed data from the committed snapshot:', error);
    }
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private serializeData(data: StorageData): string {
    const serializable = {
      users: Array.from(data.users.entries()),
      accounts: Array.from(data.accounts.entries()),
      transactions: Array.from(data.transactions.entries()),
      payees: Array.from(data.payees.entries()),
      scheduledPayments: Array.from(data.scheduledPayments.entries()),
      statements: Array.from(data.statements.entries()),
      chatMessages: Array.from(data.chatMessages.entries()),
      chatResponses: Array.from(data.chatResponses.entries()),
      chatSessions: Array.from(data.chatSessions.entries()),
      counters: data.counters
    };
    return JSON.stringify(serializable, null, 2);
  }

  private deserializeData(jsonData: string): StorageData {
    const parsed = JSON.parse(jsonData);
    return {
      users: new Map(parsed.users || []),
      accounts: new Map(parsed.accounts || []),
      transactions: new Map(parsed.transactions || []),
      payees: new Map(parsed.payees || []),
      scheduledPayments: new Map(parsed.scheduledPayments || []),
      statements: new Map(parsed.statements || []),
      chatMessages: new Map(parsed.chatMessages || []),
      chatResponses: new Map(parsed.chatResponses || []),
      chatSessions: new Map(parsed.chatSessions || []),
      counters: parsed.counters || {
        currentUserId: 1,
        currentAccountId: 1,
        currentTransactionId: 1,
        currentPayeeId: 1,
        currentScheduledPaymentId: 1,
        currentStatementId: 1,
        currentChatMessageId: 1,
        currentChatResponseId: 1
      }
    };
  }

  async saveData(data: StorageData): Promise<void> {
    try {
      const serialized = this.serializeData(data);
      await fs.promises.writeFile(this.dataPath, serialized, 'utf8');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async loadData(): Promise<StorageData | null> {
    try {
      if (!fs.existsSync(this.dataPath)) {
        return null;
      }
      const jsonData = await fs.promises.readFile(this.dataPath, 'utf8');
      return this.deserializeData(jsonData);
    } catch (error) {
      console.error('Error loading data:', error);
      return null;
    }
  }

  async clearData(): Promise<void> {
    try {
      if (fs.existsSync(this.dataPath)) {
        await fs.promises.unlink(this.dataPath);
      }
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  hasPersistedData(): boolean {
    return fs.existsSync(this.dataPath);
  }
}