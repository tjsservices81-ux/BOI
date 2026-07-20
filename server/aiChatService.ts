// AI-powered live-chat responses.
//
// Keeps the existing "real human support agent" persona (agent name, typing
// indicator, natural pacing) but lets the reply genuinely understand what the
// customer typed instead of matching keywords. Powered by Claude.
//
// This is optional: if ANTHROPIC_API_KEY is not set the caller falls back to
// the local rule-based engine (client/src/utils/chatEngine.ts), so the app
// still works fully offline / with no external dependency.

import Anthropic from "@anthropic-ai/sdk";

export interface AIChatTurn {
  text: string;
  isUser: boolean;
}

export interface AIChatContext {
  currencySymbol?: string;
  balance?: string;
  accountName?: string;
  lastTransfer?: {
    amount?: string;
    currencySymbol?: string;
    recipientName?: string;
    date?: string;
    time?: string;
    reference?: string;
    paymentMethod?: string;
    bankName?: string;
    recipientAccountNumber?: string;
    recipientSortCode?: string;
    iban?: string;
  } | null;
}

export interface AIChatRequest {
  message: string;
  history: AIChatTurn[];
  agentName: string;
  context?: AIChatContext;
}

// A single client is reused across requests.
let client: Anthropic | null = null;

export function isAIChatEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function buildSystemPrompt(agentName: string, context?: AIChatContext): string {
  const lines: string[] = [];

  lines.push(
    `You are ${agentName}, a real customer-support agent at Bank of Ireland, replying in a live chat.`,
    ``,
    `HOW YOU TALK:`,
    `- You are a warm, professional human agent — never say or imply you are an AI, a bot, or automated.`,
    `- Keep replies short and natural, like a real chat message: usually 1-3 sentences. No bullet-point essays.`,
    `- Understand what the customer actually means, including typos, slang and short follow-ups ("yes", "why not", "and the reference?"). Answer in the context of the conversation so far.`,
    `- Be reassuring and helpful. Use British/Irish English and the £/€ symbol as given in the context.`,
    `- If you genuinely don't have a detail, say you'll check or ask a clarifying question — don't invent account numbers, dates or references that aren't in the context below.`,
    `- Never ask for full card numbers, PINs, passwords or one-time codes.`,
    ``,
    `WHAT YOU HELP WITH: money transfers (status, proof/receipt, timing, cancelling), balances, cards, ATM issues, and general account questions for this customer.`,
  );

  if (context) {
    lines.push(``, `CUSTOMER CONTEXT (use only what's relevant, never read it out wholesale):`);
    if (context.accountName || context.balance) {
      const sym = context.currencySymbol || "€";
      lines.push(
        `- Account: ${context.accountName || "Current Account"}${
          context.balance ? `, current balance ${sym}${context.balance}` : ""
        }`,
      );
    }
    const t = context.lastTransfer;
    if (t && (t.amount || t.recipientName)) {
      const sym = t.currencySymbol || context.currencySymbol || "€";
      const parts: string[] = [];
      if (t.amount) parts.push(`${sym}${t.amount}`);
      if (t.recipientName) parts.push(`to ${t.recipientName}`);
      if (t.bankName) parts.push(`(${t.bankName})`);
      if (t.date) parts.push(`on ${t.date}${t.time ? ` at ${t.time}` : ""}`);
      if (t.paymentMethod) parts.push(`via ${t.paymentMethod}`);
      if (t.reference) parts.push(`reference ${t.reference}`);
      lines.push(`- Most recent transfer: ${parts.join(" ")}.`);
      if (t.recipientAccountNumber)
        lines.push(`  Recipient account: ${t.recipientAccountNumber}${t.recipientSortCode ? `, sort code ${t.recipientSortCode}` : ""}.`);
      if (t.iban) lines.push(`  Recipient IBAN: ${t.iban}.`);
    } else {
      lines.push(`- No recent transfers on file for this customer.`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate a support-agent reply with Claude.
 * Throws if the API key is missing or the call fails — the caller is expected
 * to fall back to the local engine in that case.
 */
export async function generateAIChatReply(req: AIChatRequest): Promise<string> {
  if (!isAIChatEnabled()) {
    throw new Error("AI chat is not configured (no ANTHROPIC_API_KEY)");
  }

  const anthropic = getClient();
  const system = buildSystemPrompt(req.agentName || "Alex", req.context);

  // Map the recent conversation into Claude message turns. Keep the last ~12
  // turns so follow-ups stay in context without sending the whole transcript.
  const recent = (req.history || []).slice(-12);
  const messages: Anthropic.MessageParam[] = recent
    .filter((turn) => turn.text && turn.text.trim())
    .map((turn) => ({
      role: turn.isUser ? ("user" as const) : ("assistant" as const),
      content: turn.text,
    }));

  // Ensure the very latest user message is present as the final turn.
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    messages.push({ role: "user", content: req.message });
  }

  // Claude requires the first message to be from the user.
  while (messages.length && messages[0].role !== "user") {
    messages.shift();
  }

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 400,
    system,
    messages,
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Empty response from AI");
  }

  return text;
}
