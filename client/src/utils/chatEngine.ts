// Local, rule-based live chat response engine.
// Runs entirely on-device (no external AI API, no network call) so replies work offline.
import { UserDataManager } from "./userDataManager";
import { getUserCurrency } from "./currencyUtils";

export interface ChatEngineResult {
  text: string;
  pdfData?: string;
  pdfFileName?: string;
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

function includesAny(message: string, keywords: string[]): boolean {
  return keywords.some((kw) => message.includes(kw));
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

function deliveryTimescale(t?: LastTransfer): string {
  if (t?.paymentMethod === "SEPA Transfer") {
    return "SEPA transfers take 1-2 business days to arrive";
  }
  return "UK transfers take up to 24 hours to arrive, and SEPA transfers take 1-2 business days";
}

export function getLocalChatResponse(userMessage: string): ChatEngineResult {
  const message = userMessage.toLowerCase().trim();
  const lastTransfer = getLastTransfer();

  const wantsProof = includesAny(message, [
    "proof", "document", "receipt", "confirmation", "pdf", "evidence", "record", "attach",
  ]);

  // 1) Proof / receipt / PDF requests
  if (wantsProof) {
    if (lastTransfer) {
      return {
        text: `Of course, I've attached the PDF confirmation for ${describeTransfer(lastTransfer)}. You can download it below.`,
        pdfData: lastTransfer.confirmationPdfData,
        pdfFileName: `BOI_Confirmation_${lastTransfer.id}.pdf`,
      };
    }
    return {
      text: "I'd be happy to provide that documentation, but I wasn't able to find a recent transfer on your account. Could you confirm you've made a transfer recently?",
    };
  }

  // 2) Cancellation requests
  if (includesAny(message, ["cancel", "stop the transfer", "reverse", "undo", "pull back", "recall"])) {
    return {
      text: pick([
        "I'm afraid once a transfer has been submitted it cannot be cancelled, as it's already being processed by the banking system.",
        "Unfortunately there's no way to cancel it now - once a transfer is sent it's already gone through to processing and can't be stopped.",
        "I'm sorry, but transfers can't be reversed once initiated. The payment is already in the system and will complete as scheduled.",
      ]),
    };
  }

  // 3) Guarantee / safety / "will it arrive" questions
  if (includesAny(message, ["guarantee", "safe", "will it arrive", "sure it will", "certain it", "will it go through", "is it safe"])) {
    return {
      text: `I can confirm your payment is fully secured and guaranteed to arrive. ${deliveryTimescale(lastTransfer || undefined)}.`,
    };
  }

  // 4) Delay / timescale / "where is my money" questions
  if (includesAny(message, ["how long", "when will", "taking so long", "delay", "not arrived", "not gone in", "not showing", "wheres my money", "where's my money", "still waiting", "hasn't shown"])) {
    if (lastTransfer) {
      return {
        text: `${deliveryTimescale(lastTransfer)}. Your transfer of ${lastTransfer.currencySymbol}${lastTransfer.amount} to ${lastTransfer.recipientName} on ${lastTransfer.date} is still well within that timeframe and is guaranteed to arrive.`,
      };
    }
    return {
      text: `${deliveryTimescale()}. If your transfer is still within that window, it's on track and will arrive.`,
    };
  }

  // 5) Transfer confirmation / "last transfer" queries
  if (includesAny(message, ["last transfer", "last payment", "recent transfer", "most recent transaction", "confirm my transfer", "did my transfer", "transfer go through", "payment go through", "show my transfer"])) {
    if (lastTransfer) {
      return {
        text: `I can confirm ${describeTransfer(lastTransfer)}. It's been processed successfully and is guaranteed to arrive within the normal timeframe.`,
      };
    }
    return {
      text: "I wasn't able to find any recent transfers on your account. Would you like help making one?",
    };
  }

  // 6) Account details: IBAN, BIC, account number, sort code
  if (includesAny(message, ["iban", "bic", "account number", "sort code"])) {
    return {
      text: "You can find your account number, sort code and IBAN by tapping on your 'Current Account' from the dashboard - they're displayed at the top of the account view.",
    };
  }

  // 7) Balance / statement
  if (includesAny(message, ["balance", "how much", "money left", "statement", "transactions", "history"])) {
    return {
      text: pick([
        "Your account balance is shown on the main dashboard. Tap any account to view the full details and transaction history.",
        "You can check your balance and download your statement from the account details page - just tap on the account and choose 'Get Statement'.",
      ]),
    };
  }

  // 8) Card / ATM
  if (includesAny(message, ["card", "blocked", "lost", "stolen", "freeze", "atm", "cash machine", "withdraw", "withdrawal"])) {
    if (includesAny(message, ["atm", "cash machine", "withdraw", "withdrawal"])) {
      const symbol = getUserCurrency() === "GBP" ? "£250" : "€300";
      return {
        text: `Cash withdrawals are available at any ATM using your card, with a daily limit of ${symbol}. Let me know if you need help with anything else.`,
      };
    }
    return {
      text: "If your card is lost, stolen or blocked, you can freeze it or request a replacement from the Cards section in the app. Let me know if you'd like help with that.",
    };
  }

  // 9) Identity / small talk questions
  if (includesAny(message, ["are you real", "real person", "are you a bot", "are you human", "are you ai", "who are you", "what's your name", "whats your name"])) {
    return {
      text: "Yes, I'm part of the Bank of Ireland customer support team, here to help with your banking query today.",
    };
  }
  if (includesAny(message, ["how are you", "how's your day", "hows your day"])) {
    return {
      text: "I'm doing well, thank you for asking. How can I help you with your banking today?",
    };
  }

  // 10) Greetings
  if (includesAny(message, ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy"])) {
    return {
      text: pick([
        "Hello! Welcome to Bank of Ireland support. How can I help you today?",
        "Hi there, thanks for getting in touch. What can I assist you with?",
        "Hello! What can I help you with today?",
      ]),
    };
  }

  // 11) Thanks
  if (includesAny(message, ["thank", "thanks", "cheers", "appreciate"])) {
    return {
      text: pick([
        "You're welcome! Is there anything else I can help you with?",
        "Happy to help. Let me know if you need anything else.",
        "Not a problem at all - feel free to reach out if you have any other questions.",
      ]),
    };
  }

  // 12) Goodbyes
  if (includesAny(message, ["bye", "goodbye", "see you", "close chat", "end chat", "thats all", "that's all", "done", "finished"])) {
    return {
      text: pick([
        "Thank you for contacting Bank of Ireland. Have a great day!",
        "Goodbye, thanks for chatting with us today. Take care!",
        "Glad I could help. Don't hesitate to reach out if you need anything else in the future.",
      ]),
    };
  }

  // Default
  return {
    text: pick([
      "I'm here to help with your banking needs. Could you tell me a bit more about what you're looking for?",
      "Thanks for your message. How can I assist you with your banking today?",
      "I'd be happy to help. Could you provide a few more details about your query?",
      "I can help with transfers, balances, cards and more. What do you need help with?",
    ]),
  };
}
