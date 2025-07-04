import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  customerNumber: text("customer_number").notNull().unique(),
  pin: text("pin").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: text("date_of_birth"),
  joinDate: text("join_date").notNull().default("Member since 2018"),
  dateCreated: timestamp("date_created").notNull().defaultNow(),
  isDisabled: boolean("is_disabled").notNull().default(false),
  currency: text("currency").notNull().default("EUR"),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountType: text("account_type").notNull(), // 'current', 'savings'
  accountNumber: text("account_number").notNull(),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
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
});

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Payee = typeof payees.$inferSelect;
export type ScheduledPayment = typeof scheduledPayments.$inferSelect;
export type Statement = typeof statements.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatResponse = typeof chatResponses.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertPayee = z.infer<typeof insertPayeeSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertChatResponse = z.infer<typeof insertChatResponseSchema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type TransferRequest = z.infer<typeof transferSchema>;
