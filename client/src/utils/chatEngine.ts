// Local, rule-based live chat response engine.
// Runs entirely on-device (no external AI API, no network call) so replies work offline.
// Understands loose phrasing/typos/slang, and uses the recent conversation
// history to follow up naturally instead of treating every message in isolation.
import { UserDataManager } from "./userDataManager";
import { getUserCurrency } from "./currencyUtils";

export interface ChatEngineResult {
  text: string;
  pdfData?: string;
  pdfFileName?: string;
}

export interface ConversationTurn {
  text: string;
  isUser: boolean;
}

interface LastTransfer {
  id: number;
  amount: string;
  currencySymbol: string;
  recipientName: string;
  date: string;
  time: string;
  reference: string;
  paymentMethod: string;
  recipientAccountNumber?: string;
  recipientSortCode?: string;
  iban?: string;
  bicCode?: string;
  recipientEmail?: string;
  bankName?: string;
  confirmationPdfData?: string;
}

type Topic = 'transfer' | 'proof' | 'cancel' | 'guarantee' | 'delay' | 'balance' | 'card' | 'atm' | null;

function getBankNameFromSortCode(sortCode?: string): string {
  if (!sortCode) return "UK Bank";
  const prefix = sortCode.replace(/-/g, "").substring(0, 2);
  const banks: Record<string, string> = {
    "04": "Monzo",
    "20": "Barclays",
    "30": "Lloyds Bank",
    "60": "Lloyds Bank",
    "77": "TSB Bank",
    "83": "NatWest",
    "80": "Bank of Scotland",
    "40": "HSBC",
    "16": "Starling Bank",
    "23": "Metro Bank",
  };
  return banks[prefix] || "UK Bank";
}

function getLastTransfer(): LastTransfer | null {
  const currentUser = UserDataManager.getCurrentUser();
  if (!currentUser) return null;

  const transactions = UserDataManager.getUserTransactions();
  const transferMethods = ["UK Transfer", "SEPA Transfer", "EMAIL Transfer", "IBAN Transfer"];

  const transfers = (transactions || [])
    .filter((tx: any) => tx.type === "debit" && transferMethods.includes(tx.paymentMethod))
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (transfers.length === 0) return null;

  const tx = transfers[0];
  const userCurrency = getUserCurrency();
  const currencySymbol = tx.convertedCurrency === "GBP" || userCurrency === "GBP" ? "£" : "€";
  const amount = Math.abs(parseFloat(String(tx.amount).replace("-", ""))).toFixed(2);
  const date = new Date(tx.timestamp).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Dublin",
  });
  const time = new Date(tx.timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Dublin",
  });
  const recipientMatch = typeof tx.description === "string" ? tx.description.match(/Transfer to (.+)/) : null;
  const recipientName = tx.recipientName || (recipientMatch ? recipientMatch[1] : "the recipient");

  return {
    id: tx.id,
    amount,
    currencySymbol,
    recipientName,
    date,
    time,
    reference: tx.reference || "Not specified",
    paymentMethod: tx.paymentMethod,
    recipientAccountNumber: tx.recipientAccountNumber,
    recipientSortCode: tx.recipientSortCode,
    iban: tx.iban,
    bicCode: tx.bicCode,
    recipientEmail: tx.recipientEmail,
    bankName: getBankNameFromSortCode(tx.recipientSortCode),
    confirmationPdfData: tx.confirmationPdfData,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Matches whole words/phrases only - a plain substring check would let short
// keywords like "hi" or "no" false-match inside "this" or "note".
function includesAny(message: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(message);
  });
}

// ---------------------------------------------------------------------------
// Fuzzy matching: tolerate small typos on individual words (e.g. "reciet",
// "guarentee", "trasnfer") without needing every misspelling listed out.
// ---------------------------------------------------------------------------
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function fuzzyHasWord(message: string, target: string): boolean {
  return message.split(" ").some((word) => {
    // Stem match: "cancel" also matches "cancelled", "cancelling", "cancellation"
    if (target.length >= 5 && word.length > target.length && word.startsWith(target)) return true;
    // Typo-distance tolerance - only for longer/more distinctive words. Short
    // words (e.g. "lost", "card") are skipped here since they're only 1-2
    // edits away from many unrelated common words ("lot", "cart"), which
    // would cause false-positive matches.
    if (target.length < 6) return false;
    const maxDistance = target.length > 8 ? 2 : 1;
    if (Math.abs(word.length - target.length) > maxDistance) return false;
    return levenshtein(word, target) <= maxDistance;
  });
}

// For single-word keywords, tolerate a typo or a different word ending
// (cancel/cancelled, guarantee/guaranteed); multi-word phrases must match exactly.
function includesAnyFuzzy(message: string, keywords: string[]): boolean {
  if (includesAny(message, keywords)) return true;
  return keywords.some((kw) => !kw.includes(" ") && kw.length >= 4 && fuzzyHasWord(message, kw));
}

function describeTransfer(t: LastTransfer): string {
  const base = `your transfer of ${t.currencySymbol}${t.amount} to ${t.recipientName} on ${t.date} at ${t.time}`;
  if (t.paymentMethod === "UK Transfer") {
    return `${base} (sent to their ${t.bankName} account, sort code ${t.recipientSortCode || "n/a"}, account number ${t.recipientAccountNumber || "n/a"}, reference "${t.reference}")`;
  }
  if (t.paymentMethod === "SEPA Transfer") {
    return `${base} (SEPA transfer, IBAN ${t.iban || "n/a"}, BIC ${t.bicCode || "n/a"}, reference "${t.reference}")`;
  }
  if (t.paymentMethod === "EMAIL Transfer") {
    return `${base} (sent via email to ${t.recipientEmail || "their registered email"}, reference "${t.reference}")`;
  }
  return `${base} (reference "${t.reference}")`;
}

// Only describes the timescale for the transfer type actually in question -
// a UK transfer should never be answered with "...and SEPA transfers take
// 1-2 days" tacked on, since that's not what was sent. Always returns a
// sentence-start-capitalized phrase; use lowerFirst() to embed it mid-sentence.
function deliveryTimescale(t?: LastTransfer): string {
  if (t?.paymentMethod === "SEPA Transfer") {
    return pick([
      "SEPA transfers like that one take 1-2 business days to arrive",
      "That's a SEPA transfer, so it takes 1-2 business days to land",
      "SEPA payments usually clear within 1-2 business days",
    ]);
  }
  if (t?.paymentMethod === "UK Transfer") {
    return pick([
      "UK transfers can take up to 24 hours to arrive",
      "That's a UK transfer, so it can take up to 24 hours to land",
      "UK payments usually clear within 24 hours",
    ]);
  }
  if (t?.paymentMethod === "EMAIL Transfer") {
    return "The recipient gets notified straight away, with the funds available to them within 24 hours";
  }
  if (t?.paymentMethod === "IBAN Transfer") {
    return "SEPA transfers like that one take 1-2 business days to arrive";
  }
  // We don't know the specific transfer type here, so cover both.
  return "UK transfers take up to 24 hours to arrive, and SEPA transfers take 1-2 business days";
}

// Lowercases the first letter for mid-sentence embedding, but leaves an
// acronym like "UK" or "SEPA" alone - lowercasing just its first letter
// would turn it into "uK"/"sEPA", which is never correct.
function lowerFirst(s: string): string {
  if (!s) return s;
  const firstWord = s.match(/^\S+/)?.[0] || "";
  const isAcronym = firstWord.length > 1 && firstWord === firstWord.toUpperCase() && /[A-Z]/.test(firstWord);
  if (isAcronym) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Understanding loose phrasing: text-speak, dropped apostrophes, dropped "g"
// ---------------------------------------------------------------------------
const SLANG_MAP: Record<string, string> = {
  u: "you", ur: "your", r: "are", y: "why", pls: "please", plz: "please",
  thx: "thanks", tks: "thanks", gr8: "great", cuz: "because", coz: "because",
  bc: "because", b4: "before", wanna: "want to", gonna: "going to", gotta: "got to",
  idk: "i dont know", btw: "by the way",
  gon: "gone", wer: "where", wen: "when", nd: "and", cnt: "cant", tht: "that",
  mssg: "message", txt: "text", ppl: "people", def: "definitely", rn: "right now",
  wat: "what", wut: "what", sry: "sorry",
  // common dropped-"g" informal spellings
  takin: "taking", goin: "going", comin: "coming", doin: "doing",
  waitin: "waiting", tryin: "trying", lookin: "looking", showin: "showing",
  gettin: "getting", sendin: "sending", checkin: "checking", happenin: "happening",
  arrivin: "arriving", processin: "processing",
};

function normalizeMessage(raw: string): string {
  let msg = raw.toLowerCase().trim();
  // collapse excessive repeated characters (soooo -> soo, plzzzz -> plzz)
  msg = msg.replace(/(.)\1{2,}/g, "$1$1");
  // strip all punctuation, including apostrophes, for consistent matching
  msg = msg.replace(/[^\w\s]/g, " ");
  msg = msg.replace(/\s+/g, " ").trim();
  // expand known slang/typos/informal spellings word-by-word
  msg = msg
    .split(" ")
    .map((word) => SLANG_MAP[word] || word)
    .join(" ");
  return msg;
}

function isShouting(raw: string): boolean {
  const letters = raw.replace(/[^a-zA-Z]/g, "");
  return letters.length >= 6 && letters === letters.toUpperCase();
}

function isFrustrated(raw: string, normalized: string): boolean {
  return isShouting(raw) ||
    includesAny(normalized, [
      "ridiculous", "unacceptable", "sort this out", "fed up", "furious",
      "this is a joke", "worst bank", "disgusting", "scam", "fraudulent",
      "wtf", "sort it out now", "now please", "immediately",
    ]) ||
    (raw.match(/!/g) || []).length >= 2;
}

// A person asking "where's my money/transfer/payment gone" in any phrasing.
function isAskingWhereMoneyIs(normalized: string): boolean {
  const mentionsLocating = includesAny(normalized, ["wheres", "where is", "where has", "gone missing", "not showing", "not arrived", "not gone in", "not there", "cant see it", "cant find it"]);
  const mentionsSubject = includesAny(normalized, ["money", "transfer", "payment", "it", "that", "cash", "funds"]);
  return mentionsLocating && mentionsSubject;
}

// "guarantee" is one of the most commonly misspelled words in English -
// list the frequent misspellings explicitly rather than relying on edit
// distance alone (some are too far from the correct spelling to catch).
const GUARANTEE_MISSPELLINGS = [
  "guarantee", "guarenteed", "guarenty", "guaranty", "garantee", "gaurantee",
  "guarrantee", "gauranteed", "gaurenteed", "gaurnteed", "gaurenteed",
];

// A person asking for reassurance that the recipient will definitely get
// the money, in any phrasing ("will they 100% receive it", "are they
// gaurnteed to get it", "is it definitely going through").
function isAskingForGuarantee(normalized: string): boolean {
  const hasCertaintyWord = GUARANTEE_MISSPELLINGS.some((w) => includesAny(normalized, [w])) ||
    includesAny(normalized, ["100", "for sure", "definitely", "certain", "sure it", "safe"]);
  const hasReceiveWord = includesAny(normalized, ["receive", "get it", "arrive", "go through", "land", "come through", "reach them", "reach him", "reach her"]);
  return hasCertaintyWord && hasReceiveWord;
}

// ---------------------------------------------------------------------------
// Conversation memory: infer what the discussion has been about so short
// follow-ups ("yes", "and?", "why not") can be answered in context.
// ---------------------------------------------------------------------------
function detectTopic(text: string): Topic {
  const t = normalizeMessage(text);
  if (includesAnyFuzzy(t, ["proof", "document", "receipt", "confirmation", "pdf", "evidence", "record", "attach"])) return "proof";
  if (includesAnyFuzzy(t, ["cancel", "reverse", "undo", "pull back", "recall"])) return "cancel";
  if (includesAnyFuzzy(t, ["guarantee", "safe", "sure it will", "certain it", "is it safe"]) || isAskingForGuarantee(t)) return "guarantee";
  if (includesAny(t, ["how long", "when will", "taking so long", "delay", "not arrived", "not gone in", "not showing", "still waiting", "hasnt shown"]) || isAskingWhereMoneyIs(t)) return "delay";
  if (includesAnyFuzzy(t, ["transfer", "payment", "transaction", "sent", "iban", "bic", "sort code", "account number"])) return "transfer";
  if (includesAnyFuzzy(t, ["balance", "how much", "money left", "statement"])) return "balance";
  if (includesAnyFuzzy(t, ["atm", "cash machine", "withdraw", "withdrawal"])) return "atm";
  if (includesAnyFuzzy(t, ["card", "blocked", "lost", "stolen", "freeze"])) return "card";
  return null;
}

function recentTopic(history: ConversationTurn[]): Topic {
  // Look at the last few turns (most recent first) and use the first one
  // that clearly maps to a topic - this is what "it"/"that"/"yes" refer to.
  for (let i = history.length - 1; i >= 0 && i >= history.length - 4; i--) {
    const topic = detectTopic(history[i].text);
    if (topic) return topic;
  }
  return null;
}

function lastAgentMessage(history: ConversationTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].isUser) return history[i].text;
  }
  return null;
}

const AFFIRMATIVE_WORDS = new Set(["yes", "yeah", "yep", "yup", "sure", "please", "ok", "okay", "alright", "go", "correct", "right"]);
const NEGATIVE_WORDS = new Set(["no", "nah", "nope", "negative"]);
const CONTINUATION_PHRASES = ["and", "what else", "anything else", "go on", "ok what else", "so"];

function respondToShortFollowUp(normalized: string, topic: Topic, lastTransfer: LastTransfer | null, history: ConversationTurn[]): ChatEngineResult | null {
  const words = normalized.split(" ").filter(Boolean);
  const isBareAffirmative = words.length > 0 && words.length <= 2 && words.every((w) => AFFIRMATIVE_WORDS.has(w));
  const isBareNegative = words.length > 0 && words.length <= 2 && words.every((w) => NEGATIVE_WORDS.has(w));
  const isContinuation = CONTINUATION_PHRASES.includes(normalized);

  if (!isBareAffirmative && !isBareNegative && !isContinuation) {
    return null;
  }

  if (isBareNegative) {
    return { text: "No problem at all - is there anything else I can help you with?" };
  }

  // A bare "yes"/"ok" only means "please go ahead with that" if the agent's
  // last message actually asked a question. If it was just a statement
  // (e.g. explaining a policy), treat it as a plain acknowledgement instead
  // of repeating the same explanation again.
  const lastAgentText = lastAgentMessage(history) || "";
  const agentAskedQuestion = lastAgentText.trim().endsWith("?");

  if (agentAskedQuestion) {
    switch (topic) {
      case "transfer":
        return { text: "No problem - you can start a transfer from the 'Payments' section on your dashboard. Let me know if you'd like a hand with it." };
      case "proof":
        if (lastTransfer?.confirmationPdfData) {
          return {
            text: `Here you go - the PDF confirmation for ${describeTransfer(lastTransfer)} is attached below.`,
            pdfData: lastTransfer.confirmationPdfData,
            pdfFileName: `BOI_Confirmation_${lastTransfer.id}.pdf`,
          };
        }
        return { text: "I still wasn't able to find a recent transfer to generate that document for - let me know once you've made one." };
      default:
        break;
    }
  }

  if (topic === "transfer" && lastTransfer) {
    return { text: `Sure - to recap, ${describeTransfer(lastTransfer)}. Anything specific you'd like me to check on it?` };
  }

  return { text: pick([
    "Great, is there anything else I can help you with?",
    "Glad that's clear - anything else you need?",
    "No problem at all. Anything else I can help with today?",
  ]) };
}

export function getLocalChatResponse(userMessage: string, conversationHistory: ConversationTurn[] = []): ChatEngineResult {
  const normalized = normalizeMessage(userMessage);
  const lastTransfer = getLastTransfer();
  const frustrated = isFrustrated(userMessage, normalized);

  const empathyPrefix = frustrated
    ? pick([
        "I understand how frustrating that is - let me sort this out for you. ",
        "Sorry for the trouble, I can see why that's annoying. ",
        "I hear you, let's get this fixed. ",
      ])
    : "";

  const wrap = (result: ChatEngineResult): ChatEngineResult => ({
    ...result,
    text: empathyPrefix + result.text,
  });

  // Short, context-dependent follow-ups ("yes", "and?", "why not") - answered
  // using whatever was actually being discussed a moment ago.
  const followUp = respondToShortFollowUp(normalized, recentTopic(conversationHistory), lastTransfer, conversationHistory);
  if (followUp) {
    return frustrated ? wrap(followUp) : followUp;
  }

  const wantsProof = includesAnyFuzzy(normalized, [
    "proof", "document", "receipt", "confirmation", "pdf", "evidence", "record", "attach",
  ]);

  // 1) Proof / receipt / PDF requests
  if (wantsProof) {
    if (lastTransfer) {
      return wrap({
        text: `Of course, I've attached the PDF confirmation for ${describeTransfer(lastTransfer)}. You can download it below.`,
        pdfData: lastTransfer.confirmationPdfData,
        pdfFileName: `BOI_Confirmation_${lastTransfer.id}.pdf`,
      });
    }
    return wrap({
      text: "I'd be happy to provide that documentation, but I wasn't able to find a recent transfer on your account. Could you confirm you've made a transfer recently?",
    });
  }

  // 2) Cancellation requests
  if (includesAnyFuzzy(normalized, ["cancel", "stop the transfer", "reverse", "undo", "pull back", "recall"])) {
    if (lastTransfer) {
      return wrap({
        text: pick([
          `I'm afraid not - your transfer of ${lastTransfer.currencySymbol}${lastTransfer.amount} to ${lastTransfer.recipientName} has already been submitted, so it can't be cancelled now. It's already being processed by the banking system.`,
          `Unfortunately there's no way to cancel that ${lastTransfer.currencySymbol}${lastTransfer.amount} transfer to ${lastTransfer.recipientName} now - once it's sent it's already gone through to processing and can't be stopped.`,
          `I'm sorry, but that transfer to ${lastTransfer.recipientName} can't be reversed once initiated. The payment is already in the system and will complete as scheduled.`,
        ]),
      });
    }
    return wrap({
      text: pick([
        "I'm afraid once a transfer has been submitted it cannot be cancelled, as it's already being processed by the banking system.",
        "Unfortunately there's no way to cancel it now - once a transfer is sent it's already gone through to processing and can't be stopped.",
        "I'm sorry, but transfers can't be reversed once initiated. The payment is already in the system and will complete as scheduled.",
      ]),
    });
  }

  // Follow-up "why" / "why not" after a cancellation refusal earlier in the chat
  if (includesAny(normalized, ["why not", "why cant", "why is that", "how come"]) && recentTopic(conversationHistory) === "cancel") {
    return wrap({
      text: "It's simply because transfers are sent for processing the moment you confirm them, so by the time you'd ask to cancel it's already with the receiving bank. There's no way for us to intercept it after that point.",
    });
  }

  // 3) Guarantee / safety / "will it arrive" / "will they 100% get it" questions
  if (includesAnyFuzzy(normalized, ["guarantee", "safe", "will it arrive", "sure it will", "certain it", "will it go through", "is it safe"]) || isAskingForGuarantee(normalized)) {
    const recipient = lastTransfer ? lastTransfer.recipientName : "the recipient";
    const timescale = deliveryTimescale(lastTransfer || undefined);
    return wrap({
      text: pick([
        `Yes, absolutely - ${recipient} is guaranteed to receive it. ${timescale}.`,
        `100% - there's no doubt about it, ${lowerFirst(timescale)}, and ${recipient} will get it.`,
        `You have my word on that - ${lowerFirst(timescale)}, so ${recipient} is guaranteed to receive it.`,
        `Definitely - ${recipient} will receive it without a doubt. ${timescale}.`,
      ]),
    });
  }

  // 4) Delay / timescale / "where is my money" questions
  if (includesAny(normalized, ["how long", "when will", "taking so long", "delay", "not arrived", "not gone in", "not showing", "still waiting", "hasnt shown"]) || isAskingWhereMoneyIs(normalized)) {
    if (lastTransfer) {
      const timescale = deliveryTimescale(lastTransfer);
      return wrap({
        text: pick([
          `${timescale}. Your transfer of ${lastTransfer.currencySymbol}${lastTransfer.amount} to ${lastTransfer.recipientName} on ${lastTransfer.date} is still well within that timeframe, so there's nothing to worry about.`,
          `No need to worry - ${lowerFirst(timescale)}, and your ${lastTransfer.currencySymbol}${lastTransfer.amount} transfer to ${lastTransfer.recipientName} is still well inside that window.`,
          `${timescale}, so it's still on track. Your transfer to ${lastTransfer.recipientName} on ${lastTransfer.date} hasn't missed that timeframe at all.`,
        ]),
      });
    }
    return wrap({
      text: `${deliveryTimescale()}. If your transfer is still within that window, it's on track and will arrive.`,
    });
  }

  // 5) Transfer confirmation / "last transfer" queries
  if (includesAny(normalized, ["last transfer", "last payment", "recent transfer", "most recent transaction", "confirm my transfer", "did my transfer", "transfer go through", "payment go through", "show my transfer"])) {
    if (lastTransfer) {
      return wrap({
        text: pick([
          `I can confirm ${describeTransfer(lastTransfer)}. It's been processed successfully and is on track to arrive within the normal timeframe.`,
          `Yes, I can see it - ${describeTransfer(lastTransfer)}. It went through fine and is on its way.`,
          `That's all in order - ${describeTransfer(lastTransfer)}. It's been processed and will arrive within the normal timeframe.`,
        ]),
      });
    }
    return wrap({
      text: "I wasn't able to find any recent transfers on your account. Would you like help making one?",
    });
  }

  // 6) Account details: IBAN, BIC, account number, sort code
  if (includesAnyFuzzy(normalized, ["iban", "bic", "account number", "sort code"])) {
    return wrap({
      text: "You can find your account number, sort code and IBAN by tapping on your 'Current Account' from the dashboard - they're displayed at the top of the account view.",
    });
  }

  // 7) Balance / statement
  if (includesAnyFuzzy(normalized, ["balance", "how much", "money left", "statement", "transactions", "history"])) {
    return wrap({
      text: pick([
        "Your account balance is shown on the main dashboard. Tap any account to view the full details and transaction history.",
        "You can check your balance and download your statement from the account details page - just tap on the account and choose 'Get Statement'.",
      ]),
    });
  }

  // 8) Card / ATM
  if (includesAnyFuzzy(normalized, ["card", "blocked", "lost", "stolen", "freeze", "atm", "cash machine", "withdraw", "withdrawal"])) {
    if (includesAnyFuzzy(normalized, ["atm", "cash machine", "withdraw", "withdrawal"])) {
      const symbol = getUserCurrency() === "GBP" ? "£250" : "€300";
      return wrap({
        text: `Cash withdrawals are available at any ATM using your card, with a daily limit of ${symbol}. Let me know if you need help with anything else.`,
      });
    }
    return wrap({
      text: "If your card is lost, stolen or blocked, you can freeze it or request a replacement from the Cards section in the app. Let me know if you'd like help with that.",
    });
  }

  // 9) Identity / small talk questions
  if (includesAny(normalized, ["are you real", "real person", "are you a bot", "are you human", "are you ai", "who are you", "whats your name"])) {
    return { text: "Yes, I'm part of the Bank of Ireland customer support team, here to help with your banking query today." };
  }
  if (includesAny(normalized, ["how are you", "hows your day"])) {
    return { text: "I'm doing well, thank you for asking. How can I help you with your banking today?" };
  }

  // 10) Greetings
  if (includesAny(normalized, ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy"])) {
    return {
      text: pick([
        "Hello! Welcome to Bank of Ireland support. How can I help you today?",
        "Hi there, thanks for getting in touch. What can I assist you with?",
        "Hello! What can I help you with today?",
      ]),
    };
  }

  // 11) Thanks
  if (includesAnyFuzzy(normalized, ["thank", "thanks", "cheers", "appreciate"])) {
    return {
      text: pick([
        "You're welcome! Is there anything else I can help you with?",
        "Happy to help. Let me know if you need anything else.",
        "Not a problem at all - feel free to reach out if you have any other questions.",
      ]),
    };
  }

  // 12) Goodbyes
  if (includesAny(normalized, ["bye", "goodbye", "see you", "close chat", "end chat", "thats all", "done", "finished"])) {
    return {
      text: pick([
        "Thank you for contacting Bank of Ireland. Have a great day!",
        "Goodbye, thanks for chatting with us today. Take care!",
        "Glad I could help. Don't hesitate to reach out if you need anything else in the future.",
      ]),
    };
  }

  // 13) Very short or vague messages ("help", emoji-only) - ask a clarifying
  // question rather than a flat generic reply every time.
  const wordCount = normalized.split(" ").filter(Boolean).length;
  if (wordCount <= 2 && normalized.length > 0) {
    return wrap({
      text: pick([
        "I'm here to help - could you give me a few more details about what's going on?",
        "Could you tell me a bit more about what you need? I want to make sure I point you in the right direction.",
        "Sorry, could you expand on that a little? I want to make sure I help with the right thing.",
      ]),
    });
  }

  // Default - still take a guess based on the conversation so far rather
  // than a completely generic line.
  const fallbackTopic = recentTopic(conversationHistory);
  if (fallbackTopic === "transfer" && lastTransfer) {
    return wrap({ text: `I want to make sure I understand - are you asking about ${describeTransfer(lastTransfer)}? Let me know what you'd like to check.` });
  }

  return wrap({
    text: pick([
      "I'm here to help with your banking needs. Could you tell me a bit more about what you're looking for?",
      "Thanks for your message. How can I assist you with your banking today?",
      "I'd be happy to help. Could you provide a few more details about your query?",
      "I can help with transfers, balances, cards and more. What do you need help with?",
    ]),
  });
}
