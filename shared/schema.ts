import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User types (no PostgreSQL table - used only for in-memory storage)
export type User = {
  id: number;
  customerNumber: string;
  pin: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  joinDate: string;
  dateCreated: Date;
  isDisabled: boolean;
  currency?: string;
};

export type InsertUser = Omit<User, 'id' | 'dateCreated'> & {
  dateCreated?: Date;
};

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountType: text("account_type").notNull(), // 'current', 'savings'
  accountNumber: text("account_number").notNull().unique(),
  sortCode: text("sort_code").notNull().default("90-78-68"),
  bic: text("bic").default("BOFIIE2D"), // Bank of Ireland BIC
  iban: text("iban"), // Full IBAN for the account
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  displayName: text("display_name").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(), // 'debit', 'credit'
  paymentMethod: text("payment_method").notNull(),
  reference: text("reference"),
  recipientName: text("recipient_name"),
  iban: text("iban"),
  bicCode: text("bic_code"),
  recipientAccountNumber: text("recipient_account_number"),
  recipientSortCode: text("recipient_sort_code"),
  recipientIban: text("recipient_iban"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }),
  convertedAmount: decimal("converted_amount", { precision: 10, scale: 2 }),
  convertedCurrency: text("converted_currency"),
  timestamp: timestamp("timestamp").notNull(),
  isSample: boolean("is_sample").default(false),
});

export const payees = pgTable("payees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  iban: text("iban"),
  category: text("category").notNull(),
  lastAmount: decimal("last_amount", { precision: 10, scale: 2 }),
});

export const scheduledPayments = pgTable("scheduled_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  payeeName: text("payee_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // 'monthly', 'weekly'
  nextPayment: timestamp("next_payment").notNull(),
});

export const statements = pgTable("statements", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  transactionCount: integer("transaction_count").notNull(),
  available: boolean("available").notNull().default(true),
});

// Session storage table for authentication persistence
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Customers table for verified users with admin code
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  customerNumber: text("customer_number").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: text("date_of_birth"),
  joinDate: text("join_date").notNull(),
  currency: text("currency").notNull().default("EUR"),
  accountNumber: text("account_number"), // Linked current account number (8 digits)
  sortCode: text("sort_code").default("90-78-68"), // Account sort code
  bic: text("bic").default("BOFIIE2D"), // Bank of Ireland BIC code
  iban: text("iban"), // Full IBAN for the account
  adminAlias: text("admin_alias"), // Admin-only name/note for this customer
  appReplacement: integer("app_replacement").default(0), // 0-5 scale for app replacement
  lastLatitude: decimal("last_latitude", { precision: 10, scale: 7 }), // Last known latitude
  lastLongitude: decimal("last_longitude", { precision: 10, scale: 7 }), // Last known longitude
  lastLocationUpdate: timestamp("last_location_update"), // When location was last updated
  profileClickHistory: jsonb("profile_click_history"), // Array of last 3 profile click timestamps
  originalUserId: integer("original_user_id"), // Store original user ID for restore
  notificationsEnabled: boolean("notifications_enabled").default(false), // Push notification permission status
  notificationViolationFlagged: boolean("notification_violation_flagged").default(false), // Flagged for attempting login without notifications
  notificationViolationAt: timestamp("notification_violation_at"), // When the violation occurred
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Soft-delete fields
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deleteReason: text("delete_reason"),
},
(table) => [
  index("idx_customers_not_deleted").on(table.isDeleted, table.createdAt),
]);

// Chat messages table for persistent chat storage
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id"),
  text: text("text").notNull(),
  isUser: boolean("is_user").notNull(),
  agentName: text("agent_name"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Chat responses table for managing automated responses
export const chatResponses = pgTable("chat_responses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  triggers: jsonb("triggers").notNull(), // Array of trigger phrases
  responses: jsonb("responses").notNull(), // Array of response variations
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Chat sessions table for tracking chat sessions
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id"),
  agentName: text("agent_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export const insertPayeeSchema = createInsertSchema(payees).omit({
  id: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
});

export const insertChatResponseSchema = createInsertSchema(chatResponses).omit({
  id: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  customerNumber: z.string().min(1, "Customer number is required"),
  pin: z.string().min(4, "PIN must be at least 4 digits"),
});

export const transferSchema = z.object({
  fromAccountId: z.number(),
  toAccount: z.string().min(1, "Recipient is required"),
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().optional(),
  transferType: z.enum(['UK', 'IBAN']).optional(),
  recipientDetails: z.object({
    accountNumber: z.string().optional(),
    sortCode: z.string().optional(),
    iban: z.string().optional(),
    bicCode: z.string().optional(),
  }).optional(),
  idempotencyToken: z.string().optional(),
});

export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Payee = typeof payees.$inferSelect;
export type ScheduledPayment = typeof scheduledPayments.$inferSelect;
export type Statement = typeof statements.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatResponse = typeof chatResponses.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertPayee = z.infer<typeof insertPayeeSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertChatResponse = z.infer<typeof insertChatResponseSchema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type TransferRequest = z.infer<typeof transferSchema>;
