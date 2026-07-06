// Local, rule-based Bank of Ireland customer support chat responder.
// This is a fully offline simulation engine - it never calls any external AI service.

export interface TransferDetails {
  amount: number;
  currencySymbol: string;
  recipientName: string;
  date: string;
  time: string;
  reference: string;
  transactionId: string | number;
  type: 'UK Transfer' | 'SEPA Transfer' | 'EMAIL Transfer';
  deliveryTime: string;
  accountNumber?: string;
  sortCode?: string;
  bankName?: string;
  iban?: string;
  bicCode?: string;
  recipientEmail?: string;
  pdfData?: string | null;
}

const FALLBACK_RESPONSES: { triggers: string[]; responses: string[] }[] = [
  {
    triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy'],
    responses: [
      "Hello! Welcome to Bank of Ireland support. How can I help you today?",
      "Hi there! I'm here to help with any banking queries you might have.",
      "Hello! Thanks for getting in touch. What can I assist you with?"
    ]
  },
  {
    triggers: ['cancel', 'stop', 'reverse'],
    responses: [
      "Unfortunately, once a transfer has been submitted it cannot be cancelled as it's already being processed by the banking system.",
      "I'm sorry, but transfers cannot be reversed once initiated. The payment is already in the system and will complete as scheduled.",
      "Once a payment is sent, we can't stop it as it's already being processed. Is there anything else I can help you with?"
    ]
  },
  {
    triggers: ['guarantee', 'safe', 'secure', 'arrive', 'will it'],
    responses: [
      "I can absolutely guarantee your payment will arrive. All Bank of Ireland transfers are fully secured and guaranteed to complete successfully.",
      "Yes, your transfer is 100% guaranteed. Every payment is protected and will definitely reach the recipient's account.",
      "I guarantee it completely. Your money is safe and will absolutely arrive in the recipient's account. Bank of Ireland guarantees all transfers."
    ]
  },
  {
    triggers: ['how long', 'time', 'when', 'delay'],
    responses: [
      "UK transfers take up to 24 hours. SEPA/International transfers take 1-2 business days. Your payment is on track and will definitely arrive.",
      "Processing times are: UK payments within 24 hours, SEPA transfers 1-2 business days. Your transfer will complete within this timeframe.",
      "UK transfers complete in up to 24 hours, international payments in 1-2 business days. Rest assured, your payment will arrive on time."
    ]
  },
  {
    triggers: ['transfer', 'send money', 'payment', 'sent', 'sending'],
    responses: [
      "For UK transfers, please allow up to 24 hours for processing. SEPA transfers typically take 1-2 business days. Your payment is secure and will definitely arrive.",
      "I can confirm that all Bank of Ireland transfers are fully guaranteed. UK payments process within 24 hours, and international transfers take 1-2 business days.",
      "Your transfer is being processed securely. UK transfers complete within 24 hours, SEPA within 1-2 business days. Rest assured, your money will arrive."
    ]
  },
  {
    triggers: ['balance', 'how much', 'money left', 'account balance'],
    responses: [
      "You can check your balance on the main dashboard. Just tap on your account to see the current balance and recent transactions.",
      "Your account balance is shown on the home screen. Tap any account to view the full details and transaction history.",
      "To view your balance, please check the accounts section on your dashboard. All your accounts and balances are displayed there."
    ]
  },
  {
    triggers: ['card', 'blocked', 'lost', 'stolen', 'freeze'],
    responses: [
      "If your card is lost or stolen, please freeze it immediately from the Cards section in your app. You can then request a replacement.",
      "You can block your card instantly from the Cards section. If you need a replacement, we can arrange that for you right away.",
      "For card issues, go to Profile > Customer Panel and select 'Unblock Card' if it's been blocked, or contact us for a replacement."
    ]
  },
  {
    triggers: ['statement', 'transactions', 'history', 'pdf'],
    responses: [
      "You can download your bank statement from the account details page. Just tap 'Get Statement' and choose your date range.",
      "To get your statement, go to your account, tap the menu icon, and select 'Bank Statement'. You can choose any date range you need.",
      "Your transaction history and statements are available in each account. Tap the account, then use the statement option to download or share."
    ]
  },
  {
    triggers: ['atm', 'cash', 'withdraw', 'withdrawal'],
    responses: [
      "You can withdraw cash at any ATM using your card. The daily limit is €300 (or £250 for GBP accounts). Let me know if you need help finding one.",
      "For ATM withdrawals, your daily limit is €300/£250. You can find nearby ATMs using the ATM locator in the app.",
      "Cash withdrawals are available at all ATMs. Remember your daily limit is €300 (€250 in the UK). Need help with anything else?"
    ]
  },
  {
    triggers: ['help', 'support', 'assist', 'issue', 'problem'],
    responses: [
      "I'm here to help! Could you tell me more about what you need assistance with?",
      "Of course, I'd be happy to help. What seems to be the issue?",
      "I'm here to assist you. Please let me know what you need help with and I'll do my best to sort it out."
    ]
  },
  {
    triggers: ['thank', 'thanks', 'cheers', 'appreciate'],
    responses: [
      "You're welcome! Is there anything else I can help you with?",
      "Happy to help! Let me know if you need anything else.",
      "No problem at all. Feel free to reach out if you have any other questions."
    ]
  },
  {
    triggers: ['bye', 'goodbye', 'close', 'end chat'],
    responses: [
      "Thank you for contacting Bank of Ireland. Have a great day!",
      "Goodbye! Thanks for chatting with us. Take care!",
      "Take care! Don't hesitate to reach out if you need anything else in the future."
    ]
  }
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function bankNameFromSortCode(sortCode?: string): string {
  if (!sortCode) return 'UK Bank';
  const prefix = sortCode.replace(/-/g, '').substring(0, 6);
  if (prefix.startsWith('04')) return 'Monzo';
  if (prefix.startsWith('20')) return 'Barclays';
  if (prefix.startsWith('30') || prefix.startsWith('60')) return 'Lloyds Bank';
  if (prefix.startsWith('77')) return 'TSB Bank';
  if (prefix.startsWith('83')) return 'NatWest';
  if (prefix.startsWith('80')) return 'Bank of Scotland';
  if (prefix.startsWith('40')) return 'HSBC';
  if (prefix.startsWith('16')) return 'Starling Bank';
  if (prefix.startsWith('23')) return 'Metro Bank';
  return 'UK Bank';
}

function formatAmount(transfer: TransferDetails): string {
  return `${transfer.currencySymbol}${transfer.amount.toFixed(2)}`;
}

function describeTransfer(transfer: TransferDetails): string {
  return `${formatAmount(transfer)} to ${transfer.recipientName} on ${transfer.date} at ${transfer.time}`;
}

function accountDetailsLine(transfer: TransferDetails): string {
  if (transfer.type === 'SEPA Transfer') {
    return `The IBAN used was ${transfer.iban || 'not available'} and the BIC code was ${transfer.bicCode || 'not available'}.`;
  }
  if (transfer.type === 'EMAIL Transfer') {
    return `It was sent to ${transfer.recipientEmail || 'the recipient\'s email address'}, and they'll have received a notification directly.`;
  }
  return `That was sent to their ${transfer.bankName || 'UK'} account, account number ${transfer.accountNumber || 'not available'}, sort code ${transfer.sortCode || 'not available'}.`;
}

export function generateChatResponse(
  userMessage: string,
  transfer?: TransferDetails,
  userCurrency: 'EUR' | 'GBP' = 'EUR'
): string {
  const lowerMessage = userMessage.toLowerCase();

  const wantsProof = ['proof', 'document', 'receipt', 'confirmation', 'pdf', 'evidence', 'record']
    .some(word => lowerMessage.includes(word));
  const mentionsPayment = ['transfer', 'payment', 'transaction', 'sent', 'money']
    .some(word => lowerMessage.includes(word));

  if (wantsProof && mentionsPayment) {
    if (transfer) {
      return `Of course! I've attached the PDF confirmation for your transfer of ${describeTransfer(transfer)} below. You can download or view it directly.`;
    }
    return "I'd be happy to help with that. Unfortunately, I wasn't able to locate a recent transfer on your account to generate the confirmation document. Could you check you've made a transfer recently?";
  }

  if (lowerMessage.includes('last') && mentionsPayment) {
    if (transfer) {
      return `I can certainly help with that. I can see your last transfer of ${describeTransfer(transfer)} - reference ${transfer.reference}. ${accountDetailsLine(transfer)} It's been processed securely and is guaranteed to arrive within ${transfer.deliveryTime}.`;
    }
    return "I'm sorry, I wasn't able to bring up your most recent transfer details just now. Would you like me to try again or I can connect you with another agent who might have better access?";
  }

  if (wantsProof) {
    if (transfer) {
      return `I've pulled up the proof of your most recent transfer - ${describeTransfer(transfer)}. The PDF confirmation is attached below, just tap the download button to save it.`;
    }
    return "I'd be happy to provide documentation for you. Could you let me know which specific transfer or payment you'd like the confirmation for?";
  }

  if (lowerMessage.includes('iban') || lowerMessage.includes('bic') || lowerMessage.includes('account number') || lowerMessage.includes('sort code')) {
    if (transfer) {
      if (transfer.type === 'SEPA Transfer') {
        return `For your last transfer of ${formatAmount(transfer)} to ${transfer.recipientName}, the IBAN used was ${transfer.iban || 'not available'} and the BIC code was ${transfer.bicCode || 'not available'}.`;
      }
      if (transfer.type === 'EMAIL Transfer') {
        return `Your last transfer of ${formatAmount(transfer)} was sent to ${transfer.recipientEmail || "the recipient's email address"}.`;
      }
      return `For your last transfer of ${formatAmount(transfer)} to ${transfer.recipientName}, it was sent to their ${transfer.bankName || 'UK'} account, account number ${transfer.accountNumber || 'not available'}, sort code ${transfer.sortCode || 'not available'}.`;
    }
    if (userCurrency === 'GBP') {
      return "For your UK account, you can find your Account Number and Sort Code by tapping on the 'Current Account' card on your home screen. They are displayed right at the top for easy access.";
    }
    return "Your IBAN and BIC details are available within your account view. Just tap on your 'Current Account' from the dashboard, and you'll see them listed clearly at the top of the screen.";
  }

  for (const category of FALLBACK_RESPONSES) {
    if (category.triggers.some(trigger => lowerMessage.includes(trigger))) {
      return pick(category.responses);
    }
  }

  const defaultResponses = [
    "I'm here to help with your banking needs. Could you tell me a bit more about what you're looking for?",
    "Thanks for your message. How can I assist you with your banking today?",
    "I'd be happy to help. Could you provide a few more details about your query?",
    "Thank you for getting in touch. What can I help you with regarding your account?",
    "I'm available to assist with transfers, balances, cards, and more. What do you need help with?"
  ];

  return pick(defaultResponses);
}
