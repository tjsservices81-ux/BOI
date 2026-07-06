import { useState, useRef, useEffect } from "react";
import { getAppDate } from "../utils/appTime";
import { X, Send, MessageCircle, User } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";
import { getUserCurrency, type Currency } from "../utils/currencyUtils";
import botIconPath from "@assets/IMG_1381_1759334776475.jpeg";

const chatVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      duration: 0.6,
      bounce: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 30,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  agentName?: string;
  isAutomated?: boolean;
  pdfData?: string;
  pdfFileName?: string;
}

interface ChatResponse {
  triggers: string[];
  responses: string[]; // Multiple response variations
  id: string;
  category: string;
}

interface LiveChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatState {
  messages: ChatMessage[];
  isActive: boolean;
  agentName: string;
  sessionId: string;
  lastResponseIndex: { [key: string]: number }; // Track last used response for each category
  queueStatus: 'waiting' | 'connected' | 'ended' | 'closed';
  queueStartTime?: Date | null;
  estimatedWaitTime?: number;
  queuePosition?: number;
  isInQueue?: boolean;
  lastActivityTime?: Date;
  hasCheckedIn?: boolean;
}

export default function LiveChat({ isOpen, onClose }: LiveChatProps) {
  const currentUser = UserDataManager.getCurrentUser();
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');
  
  const initializeFreshChat = () => {
    if (!currentUser) {
      return {
        messages: [],
        isActive: false,
        agentName: '',
        sessionId: '',
        lastResponseIndex: {},
        queueStatus: 'ended' as const,
        queueStartTime: undefined,
        estimatedWaitTime: 0
      };
    }

    // A pool of agent names - all agents use the same consistent, professional
    // Bank of Ireland customer support tone
    const agentNames = [
      'Emma', 'James', 'Sarah', 'Zoe', 'Aoife', 'Liam', 'Rachel', 'Connor',
      'Sophie', 'David', 'Claire', 'Ryan', 'Rebecca', 'Sean', 'Katie', 'Adam',
      'Niamh', 'Daniel', 'Amy', 'Jack', 'Laura', 'Thomas', 'Hannah', 'Mark',
      'Grace', 'Oliver', 'Ella', 'Luke', 'Chloe', 'Ben'
    ];
    const randomAgent = agentNames[Math.floor(Math.random() * agentNames.length)];
    const waitTime = Math.floor(Math.random() * 90000) + 30000; // 30 seconds to 2 minutes
    const queuePosition = Math.floor(Math.random() * 3); // 0 to 2 people ahead
    
    return {
      messages: [],
      isActive: true,
      agentName: randomAgent,
      sessionId: `chat_${currentUser}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastResponseIndex: {},
      queueStatus: 'waiting' as const,
      queueStartTime: new Date(),
      estimatedWaitTime: waitTime,
      queuePosition: queuePosition,
      isInQueue: true,
      lastActivityTime: new Date(),
      hasCheckedIn: false
    };
  };
  
  const [chatState, setChatState] = useState<ChatState>(initializeFreshChat);
  
  // Initialize currency preference
  useEffect(() => {
    setUserCurrency(getUserCurrency());
  }, []);

  // Helper functions for currency-aware responses
  const getCurrencySymbol = () => userCurrency === 'EUR' ? '€' : '£';
  
  const getCurrencyAmounts = () => {
    if (userCurrency === 'EUR') {
      return {
        minBalance: '3,000',
        monthlyFee: '5',
        overdraftLimit: '2,000',
        transferFeeRange: '2-15',
        atmFeeAbroad: '2.50',
        unpaidItemFee: '10',
        dailyATMLimit: '300',
        personalLoanMin: '1,000',
        personalLoanMax: '25,000'
      };
    } else {
      return {
        minBalance: '2,500',
        monthlyFee: '4',
        overdraftLimit: '1,500',
        transferFeeRange: '2-12',
        atmFeeAbroad: '2.00',
        unpaidItemFee: '8',
        dailyATMLimit: '250',
        personalLoanMin: '800',
        personalLoanMax: '20,000'
      };
    }
  };
  
  // Load persisted chat state when component opens, or initialize fresh if none exists
  useEffect(() => {
    if (isOpen && currentUser) {
      const userChatKey = `liveChatState_${currentUser}`;
      const saved = localStorage.getItem(userChatKey);
      
      if (saved) {
        try {
          const parsedState = JSON.parse(saved);
          // Restore any active chat state (waiting, connected) but not ended
          if (parsedState && parsedState.isActive && parsedState.queueStatus !== 'ended') {
            // Always restore chat state - no session timeout
            // Users stay logged in permanently unless admin deletes account
            if (true) {
              setChatState({
                ...parsedState,
                messages: parsedState.messages.map((msg: any) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                })),
                queueStartTime: parsedState.queueStartTime ? new Date(parsedState.queueStartTime) : undefined
              });
              return;
            }
          }
        } catch (error) {
          console.error('Error parsing chat state:', error);
        }
      }
      
      // Initialize fresh chat if no valid saved state
      setChatState(initializeFreshChat());
    }
  }, [isOpen, currentUser]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [queueTimeRemaining, setQueueTimeRemaining] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEndChatConfirm, setShowEndChatConfirm] = useState(false);
  const [isEndingChat, setIsEndingChat] = useState(false);
  const [endChatCountdown, setEndChatCountdown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endChatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set 3-minute (180 seconds) timer for inactivity check-in
    inactivityTimerRef.current = setTimeout(() => {
      if (!chatState.hasCheckedIn && chatState.queueStatus === 'connected') {
        const checkInMessage: ChatMessage = {
          id: Date.now().toString(),
          text: getCheckInMessage(),
          isUser: false,
          timestamp: getAppDate(),
          agentName: chatState.agentName
        };

        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, checkInMessage],
          hasCheckedIn: true
        }));
      }
    }, 180000); // 3 minutes
  };

  const scrollToBottom = () => {
    // Use a small delay to ensure DOM is updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, isTyping]);

  // Save user-specific chat state to persist across page navigation
  useEffect(() => {
    if (currentUser && chatState.isActive) {
      const userChatKey = `liveChatState_${currentUser}`;
      const persistentState = {
        ...chatState,
        // Preserve connection state and queue status during navigation
        isPersistent: true,
        lastActivity: Date.now()
      };
      localStorage.setItem(userChatKey, JSON.stringify(persistentState));
    }
  }, [chatState, currentUser]);

  // Only handle genuine app close events (preserve chat during navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear timers when app is actually closing, not during navigation
      if (queueTimerRef.current) {
        clearInterval(queueTimerRef.current);
        queueTimerRef.current = null;
      }
      if (endChatTimerRef.current) {
        clearInterval(endChatTimerRef.current);
        endChatTimerRef.current = null;
      }
      // Note: We don't clear localStorage here to preserve chat during page refreshes
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Initialize navigation tracking without clearing chat state
  useEffect(() => {
    if (currentUser) {
      // Simply mark that navigation is active without clearing chat
      localStorage.setItem('app_navigation_active', 'true');
    }
  }, [currentUser]);

  // Cleanup timers on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) {
        clearInterval(queueTimerRef.current);
      }
      if (endChatTimerRef.current) {
        clearInterval(endChatTimerRef.current);
      }
    };
  }, []);

  // Queue system with realistic progression
  useEffect(() => {
    if (chatState.queueStatus === 'waiting' && chatState.estimatedWaitTime && chatState.queueStartTime && chatState.isInQueue) {
      const startTime = chatState.queueStartTime.getTime();
      const waitTime = chatState.estimatedWaitTime;
      const queuePosition = chatState.queuePosition || 0;
      
      // Show initial queue message
      if (chatState.messages.length === 0) {
        const queueMessages = [
          "Thanks for contacting Bank of Ireland! We'll connect you with our next available agent.",
          queuePosition === 0 
            ? "You're next in line. A support agent will be with you shortly…"
            : queuePosition === 1 
            ? "There's 1 person ahead of you. Thanks for waiting."
            : `There are ${queuePosition} people ahead of you. Thanks for your patience.`,
          "Connecting you now to an available agent…"
        ];
        
        // Add initial queue message
        setChatState(prev => ({
          ...prev,
          messages: [{
            id: `queue_${Date.now()}`,
            text: queueMessages[0],
            isUser: false,
            timestamp: getAppDate(),
            agentName: 'Support System',
            isAutomated: true
          }]
        }));
        
        // Add queue position message after short delay
        setTimeout(() => {
          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, {
              id: `queue_pos_${Date.now()}`,
              text: queueMessages[1],
              isUser: false,
              timestamp: getAppDate(),
              agentName: 'Support System',
              isAutomated: true
            }]
          }));
        }, 2000);
        
        // Add connecting message near the end
        setTimeout(() => {
          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, {
              id: `queue_connect_${Date.now()}`,
              text: queueMessages[2],
              isUser: false,
              timestamp: getAppDate(),
              agentName: 'Support System',
              isAutomated: true
            }]
          }));
        }, waitTime - 8000); // 8 seconds before connection
      }
      
      // Update remaining time every second
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, waitTime - elapsed);
        
        setQueueTimeRemaining(remaining);
        
        if (remaining <= 0) {
          // Show typing indicator before agent connects
          setIsTyping(true);
          setTypingText(`${chatState.agentName} is typing...`);
          
          // Connect to agent after typing delay
          setTimeout(() => {
            setIsTyping(false);
            setChatState(prev => ({
              ...prev,
              queueStatus: 'connected',
              isInQueue: false
            }));
            
            // Add welcome message from agent with natural delay
            setTimeout(() => {
              const welcomeText = getStandardResponse('welcome');
              const words = welcomeText.split(' ').length;
              const wordsPerSecond = Math.random() * 2 + 3; // 3-5 words per second
              const realisticDelay = Math.max(1000, (words / wordsPerSecond) * 1000);
              const variation = (Math.random() - 0.5) * 0.4;
              const finalDelay = realisticDelay * (1 + variation);
              
              setIsTyping(true);
              setTypingText(`${chatState.agentName} is typing...`);
              
              setTimeout(() => {
                const welcomeMessage: ChatMessage = {
                  id: Date.now().toString(),
                  text: welcomeText,
                  isUser: false,
                  timestamp: getAppDate(),
                  agentName: chatState.agentName,
                  isAutomated: false
                };
                
                setChatState(prev => ({
                  ...prev,
                  messages: [...prev.messages, welcomeMessage]
                }));
                
                setIsTyping(false);
                setTypingText("");
                
                // Start inactivity timer when agent connects
                startInactivityTimer();
              }, finalDelay);
            }, 500); // typing indicator delay
          }, 500);
        }
      };
      
      updateTimer();
      queueTimerRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (queueTimerRef.current) {
          clearInterval(queueTimerRef.current);
          queueTimerRef.current = null;
        }
      };
    }
  }, [chatState.queueStatus, chatState.estimatedWaitTime, chatState.queueStartTime, chatState.agentName, chatState.isInQueue]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) {
        clearInterval(queueTimerRef.current);
      }
    };
  }, []);

  const getDefaultResponses = (): ChatResponse[] => {
    const currencySymbol = getCurrencySymbol();
    const amounts = getCurrencyAmounts();
    
    return [
    {
      id: '1',
      category: 'card_issues',
      triggers: ['unblock card', 'card blocked', 'card not working', 'blocked card', 'card issue', 'lost card', 'stolen card', 'replacement card', 'new card'],
      responses: [
        "I can assist you with your card issue. To unblock your card, please navigate to Profile > Admin Panel and select 'Unblock Card'. This will restore access immediately for transactions.",
        "I'll help you resolve your card issue. Please access Profile > Admin Panel and select 'Unblock Card'. This will reactivate your card instantly.",
        "I can help you reactivate your card. Navigate to Profile > Admin Panel and select the 'Unblock Card' option for immediate restoration of service.",
        "To resolve your card issue, please navigate to Profile > Admin Panel and select 'Unblock Card' for instant activation. Please contact us if you need further assistance.",
        "I can help you with your card access. Please go to Profile > Admin Panel where you'll find the 'Unblock Card' option for immediate reactivation.",
        "Your card can be reactivated immediately. Please navigate to Profile > Admin Panel and select 'Unblock Card' to restore full access."
      ]
    },
    {
      id: '2',
      category: 'transfers',
      triggers: ['transfer money', 'send money', 'make transfer', 'how to transfer', 'payment', 'pending transfer', 'international transfer', 'swift code', 'iban transfer', 'uk transfer', 'transfer limit', 'transfer fee'],
      responses: [
        "I can assist you with transfer services. Please navigate to 'Payments' for UK Transfer (up to 24 hours processing) or SEPA Transfer (1-2 business days). Which type of transfer do you require?",
        "I'll help you with your transfer requirements. Access the 'Payments' section for UK Transfer (domestic payments, up to 24 hours) or SEPA Transfer (SEPA zone payments, 1-2 business days). What is your destination?",
        "Transfer services are available through 'Payments'. UK Transfer processes domestic payments in up to 24 hours, while SEPA Transfer handles SEPA zone payments in 1-2 business days. Which service do you need?",
        "I can guide you through the transfer process. In 'Payments', you'll find UK Transfer for domestic payments (up to 24 hours) and SEPA Transfer for SEPA zone payments (1-2 business days). What's your transfer destination?",
        "Transfer assistance is available through the 'Payments' section. UK Transfer for domestic payments (up to 24 hours) or SEPA Transfer for SEPA zone payments (1-2 business days). Where are you sending funds?",
        "I can help you with transfer services. Navigate to 'Payments' for UK Transfer (domestic payments, up to 24 hours) and SEPA Transfer (SEPA zone payments, 1-2 business days). What type of transfer do you need?"
      ]
    },
    {
      id: '3',
      category: 'account_info',
      triggers: ['check balance', 'account balance', 'how much money', 'balance', 'statement', 'iban', 'sort code', 'account number', 'account details', 'routing number'],
      responses: [
        "Your account balances are displayed on the main dashboard. For detailed statements, account numbers, IBAN, and sort codes, please select the specific account.",
        "Account balances are visible on the main dashboard. For IBAN, sort code, or detailed statements, please select the relevant account for complete information.",
        "Account information is available on the main dashboard. For account numbers, IBAN details, or statements, please select the account you need information for.",
        "Right, your current balances are shown on the dashboard. Need your account details like IBAN or sort code? Tap on any account and you'll see the full account information plus transaction history.",
        "Let me help you with that. Your balances appear on the main dashboard, and for specific account details like IBAN or sort code, simply tap on the account to view all the information.",
        "No worries at all! All account balances are on your homepage. For detailed statements or account numbers, tap any account and you'll get the complete breakdown including IBAN and sort codes."
      ]
    },
    {
      id: '4',
      category: 'login_issues',
      triggers: ['forgot pin', 'reset pin', 'pin not working', 'pin problem', 'login issues', 'password reset', 'cant log in', "can't access", 'locked out', 'forgotten password'],
      responses: [
        "I completely understand how frustrating login issues can be. For your account's protection, PIN resets need to be done through secure channels. You can visit any Bank of Ireland branch with photo ID, or call our customer service team at 0818 365 365 and they'll sort it out for you.",
        "I know how annoying login problems can be! For your security, PIN resets require verification at a branch with valid ID, or you can call our secure line at 0818 365 365 where the team can help reset it safely.",
        "I can help point you in the right direction for PIN issues. Due to security protocols, you'll need to visit your local Bank of Ireland branch with ID, or ring customer service at 0818 365 365 for a secure PIN reset.",
        "PIN troubles happen to everyone! For your protection, we need to verify your identity for resets. Pop into any branch with photo ID, or call 0818 365 365 where our team can handle the reset securely over the phone."
      ]
    },
    {
      id: '5',
      category: 'atm_issues',
      triggers: ['atm not working', 'atm problem', 'withdrawal issue', 'atm fee', 'atm limit', 'cash machine', 'atm charges', 'daily limit', 'atm declined'],
      responses: [
        `ATM issues can be really inconvenient! Your daily withdrawal limit is typically ${currencySymbol}${amounts.dailyATMLimit}, and there's no charge for using Bank of Ireland ATMs. If your card was declined, try a different ATM first - sometimes it's just a machine issue. If problems persist, I can help check your account status.`,
        `I can help with ATM troubles. Bank of Ireland ATMs are free to use, and your daily limit is usually ${currencySymbol}${amounts.dailyATMLimit}. If you're getting declined, it might be a network issue with that particular machine. Try another ATM, and if it still doesn't work, let me know - we can check if there's an issue with your card.`,
        `ATM problems are frustrating when you need cash! Your standard daily limit is ${currencySymbol}${amounts.dailyATMLimit}, and you won't be charged for using our ATMs. If a withdrawal failed, try a different machine first - sometimes it's just a connectivity issue. Still having trouble? I can look into your account for any restrictions.`,
        `Let me help with that ATM issue. You can withdraw up to ${currencySymbol}${amounts.dailyATMLimit} daily from Bank of Ireland ATMs without charges. If your transaction was declined, it could be a temporary machine problem - try another ATM. If it happens again, there might be a card restriction I can help investigate.`
      ]
    },
    {
      id: '6',
      category: 'fees_charges',
      triggers: ['fees', 'charges', 'cost', 'how much', 'price', 'overdraft', 'overdraft fee', 'monthly fee', 'account fee', 'maintenance fee'],
      responses: [
        `I can explain our fee structure. Current accounts have no monthly maintenance fee if you keep a minimum ${currencySymbol} ${amounts.minBalance} balance, otherwise it's ${currencySymbol} ${amounts.monthlyFee} monthly. Overdraft rates are 19.9% APR up to ${currencySymbol} ${amounts.overdraftLimit}. International transfers are ${currencySymbol}${amounts.transferFeeRange} depending on amount and destination. What specific fees were you asking about?`,
        `Our fees are quite competitive! No monthly charges on current accounts with ${currencySymbol} ${amounts.minBalance}+ balance, ${currencySymbol} ${amounts.monthlyFee} monthly otherwise. Overdrafts are 19.9% APR (much better than most banks). UK transfers are free, international ones ${currencySymbol}${amounts.transferFeeRange}. Unpaid item fees are ${currencySymbol} ${amounts.unpaidItemFee}. Which fees concern you?`,
        `Let me break down the main fees: Current accounts are free with ${currencySymbol} ${amounts.minBalance} balance, ${currencySymbol} ${amounts.monthlyFee}/month below that. Overdraft is 19.9% APR up to ${currencySymbol} ${amounts.overdraftLimit} limit. ATM withdrawals abroad are ${currencySymbol} ${amounts.atmFeeAbroad}. Standing orders and direct debits are free. What particular charges are you concerned about?`,
        `Happy to clarify our charges! Account maintenance is ${currencySymbol} ${amounts.monthlyFee} monthly unless you keep ${currencySymbol} ${amounts.minBalance}+ (then it's free). Arranged overdraft is 19.9% APR, unpaid items ${currencySymbol} ${amounts.unpaidItemFee}. International payments vary ${currencySymbol}${amounts.transferFeeRange} by destination. No charges for UK payments or most online banking. Need details on any specific fee?`
      ]
    },
    {
      id: '7',
      category: 'direct_debits',
      triggers: ['direct debit', 'standing order', 'recurring payment', 'cancel direct debit', 'set up direct debit', 'automatic payment', 'dd', 'monthly payment'],
      responses: [
        "I can help with direct debits and standing orders. To set up a new direct debit, you'll need the company's sort code and account number - they usually provide this on their forms. To cancel one, go to your account and find 'Manage Payments'. Standing orders for regular transfers can be set up in the 'Payments' section. What do you need help with?",
        "Direct debits are really convenient for bills! If you need to set one up, the company will provide their bank details and you can authorize it through your account. To cancel or view existing ones, check 'Manage Payments' in your account view. Standing orders for regular transfers work similarly. What are you looking to do?",
        "Happy to help with direct debits! Setting them up is easy - just need the payee's details which they'll provide. To manage existing direct debits or standing orders, look in your account under 'Manage Payments'. You can cancel, view, or modify them there. Are you setting up something new or managing an existing payment?",
        "Direct debits make paying bills so much easier! To create a new one, you'll get a form from the company with their bank details to authorize. To check or cancel existing direct debits, go to 'Manage Payments' in your account. Standing orders for regular transfers are in the 'Payments' section. How can I help?"
      ]
    },
    {
      id: '8',
      category: 'greeting',
      triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      responses: [
        "Hey there! Good to hear from you. What can I help you with today?",
        "Hi! How's your day going? What brings you to Bank of Ireland support?",
        "Hello there! What can I sort out for you today?",
        "Good to see you! What's on your mind?",
        "Hi! How can I help you with your banking today?",
        "Hey! What can I do for you?",
        "Hello! What brings you here today?",
        "Hi there! How can I help?",
        "Good day! What can I assist you with?",
        "Hey! What's going on with your banking?"
      ]
    },
    {
      id: '9',
      category: 'thanks',
      triggers: ['thank you', 'thanks', 'appreciate', 'helpful'],
      responses: [
        "You're very welcome! Is there anything else I can help you with today?",
        "Brilliant, happy to help! Feel free to reach out if you need any other assistance.",
        "Lovely, glad I could assist! Let me know if you have any other questions.",
        "You're welcome! I'm here if you need help with anything else.",
        "No worries at all! Anything else I can sort out for you?",
        "Perfect, always happy to help! Just give me a shout if you need anything else.",
        "You're all sorted then! Feel free to contact us anytime you need assistance."
      ]
    },
    {
      id: '10',
      category: 'account_opening',
      triggers: ['open account', 'new account', 'account opening', 'create account', 'apply for account', 'student account', 'business account'],
      responses: [
        `I'd be happy to help with opening a new account! We offer current accounts, savings accounts, student accounts, and business accounts. You'll need photo ID and proof of address from the last 3 months. Would you like to know about a specific type of account, or shall I arrange for a specialist to call you?`,
        `Great choice in choosing Bank of Ireland for a new account! We have several options - current accounts (free with ${currencySymbol} ${amounts.minBalance} balance), savings accounts with competitive rates, and specialized accounts for students and businesses. What type of account interests you most?`,
        `Opening an account is straightforward! You'll need valid photo ID and a recent utility bill or bank statement for proof of address. We offer current accounts, savings, student accounts with perks, and business accounts. Which would suit your needs best?`,
        `I can definitely help with account opening! Our current accounts are popular (no fees with ${currencySymbol} ${amounts.minBalance}+ balance), or we have savings accounts with great rates. For students, we have special accounts with overdraft facilities. What are you looking for?`
      ]
    },
    {
      id: '11',
      category: 'mortgage_loans',
      triggers: ['mortgage', 'home loan', 'loan', 'personal loan', 'car loan', 'credit', 'borrowing', 'interest rate'],
      responses: [
        `I can provide some initial information about our lending products. We offer mortgages from 3.2% APR, personal loans ${currencySymbol} ${amounts.personalLoanMin}-${currencySymbol} ${amounts.personalLoanMax}, and car finance options. For detailed rates and applications, let me connect you with our lending specialist who can assess your specific needs and provide accurate quotes.`,
        `We have several lending options available! Mortgages start from 3.2% APR depending on deposit and circumstances. Personal loans range ${currencySymbol} ${amounts.personalLoanMin}-${currencySymbol} ${amounts.personalLoanMax} with competitive rates. For the best advice and rates specific to your situation, let me escalate this to our lending team who can help properly.`,
        `Happy to discuss our loan products! We offer mortgages (rates from 3.2% APR), personal loans up to ${currencySymbol} ${amounts.personalLoanMax}, car finance, and business loans. However, for accurate rates and to discuss your specific requirements, let me escalate that to a specialist who'll assist you shortly.`,
        `Our lending products include mortgages from 3.2% APR, personal loans ${currencySymbol} ${amounts.personalLoanMin}-${currencySymbol} ${amounts.personalLoanMax}, and various credit options. Given the complexity of lending decisions, let me escalate that to a specialist who'll assist you shortly with detailed information and applications.`
      ]
    },
    {
      id: '12',
      category: 'verification',
      triggers: ['verify', 'verification', 'proof of identity', 'id check', 'security check', 'authenticate', 'confirm identity'],
      responses: [
        "For security verification, I'll need to confirm some details with you. Can you provide your full name, date of birth, and the first line of your registered address? This helps us ensure we're speaking with the account holder.",
        "Security is really important to us! To verify your identity, I'll need your full name as registered, date of birth, and your postcode. Once verified, I can access your account details and help with any queries you have.",
        "Let me verify your identity first for security. Could you confirm your full name, date of birth, and the last four digits of the card ending in the number you're calling about? This ensures I'm speaking with the right person.",
        "I need to run through some security questions first. Can you tell me your full registered name, date of birth, and first line of your address? Once I've verified these details, I can help with any account queries."
      ]
    },
    {
      id: '13',
      category: 'goodbye',
      triggers: ['bye', 'goodbye', 'see you', 'thanks bye', 'done', 'finished', 'thats all'],
      responses: [
        "Perfect! Glad I could help you today. If you need anything else, just pop back into chat anytime. Have a brilliant day!",
        "Lovely chatting with you! Don't hesitate to get in touch if you need any other banking help. Take care and have a great day!",
        "All sorted then! Feel free to contact us anytime you need assistance. Thanks for banking with Bank of Ireland - have a wonderful day!",
        "Great stuff! Always happy to help. If anything else comes up, just start a new chat and we'll be right here. Have a fantastic day!"
      ]
    }
  ];
  };

  const getChatResponses = (): ChatResponse[] => {
    const stored = UserDataManager.getUserData('chatResponses', null);
    return stored || getDefaultResponses();
  };

  // Standard, professional Bank of Ireland support responses.
  // Every agent uses the same consistent, professional tone - only the name displayed differs.
  const getStandardResponse = (messageType: string): string => {
    const standardResponses: { [key: string]: string[] } = {
      welcome: [
        "Hello, thanks for contacting Bank of Ireland Customer Support. How can I help you today?",
        "Good day, you're speaking with Bank of Ireland Customer Support. What can I help you with?"
      ],
      no_transactions: [
        "I've checked your account and there are no recent transactions to show at the moment.",
        "After reviewing your account, I can confirm there's no recent transaction activity to display right now."
      ],
      personal_question: [
        "I'm a Bank of Ireland Customer Support agent, here to help with your banking today.",
        "I'm part of the Bank of Ireland Customer Support team. How can I assist you today?"
      ],
      small_talk: [
        "Thanks for asking - I'm here and ready to help. What can I do for you today?",
        "I'm well, thank you. How can I help you with your banking today?"
      ]
    };

    const responses = standardResponses[messageType] || standardResponses['welcome'];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Professional check-in message sent after a period of inactivity
  const getCheckInMessage = (): string => {
    const checkInResponses = [
      "Are you still there? Let me know if you need anything else.",
      "Just checking in - I'm here if you need any further assistance.",
      "Please let me know if you require additional support."
    ];
    return checkInResponses[Math.floor(Math.random() * checkInResponses.length)];
  };

  // Consistent typing speed for all agents
  const getAgentTypingSpeed = (): number => 120;


  const generateAIResponse = async (userMessage: string, messages: ChatMessage[]): Promise<{ text: string; category: string; pdfData?: string; pdfFileName?: string }> => {
    try {
      // Check if user is asking about transactions/transfers/payments
      const transferKeywords = [
        'transaction', 'payment', 'transfer', 'recent activity', 'account activity', 'movement',
        'last transfer', 'last payment', 'most recent', 'recent transfer', 'recent payment',
        'confirm my transfer', 'confirm transfer', 'show my transfer', 'my transfer',
        'did my transfer', 'has my transfer', 'transfer go through', 'payment go through',
        'proof', 'document', 'receipt', 'confirmation', 'pdf', 'evidence',
        'show me', 'send me', 'give me', 'can i get', 'can i have', 'i need',
        'proof of transfer', 'proof of payment', 'transfer proof', 'payment proof',
        'transfer confirmation', 'payment confirmation', 'payment receipt',
        'download', 'record', 'details of my', 'statement'
      ];
      const isTransferQuery = transferKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );

      // Always get current user's transaction data from UserDataManager
      const userTransactions = currentUser ? UserDataManager.getUserTransactions() : [];

      // Get the most recent outgoing transfer (debit with transfer category)
      const lastTransfer = userTransactions
        .filter((tx: any) => tx.type === 'debit' && tx.category === 'transfer')
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      // If asking about transactions and there are none, use a standard response
      if (isTransferQuery && userTransactions.length === 0) {
        return {
          text: getStandardResponse('no_transactions'),
          category: 'no-transactions'
        };
      }

      // Check for personal questions about the agent
      const personalQuestions = ['are you real', 'real person', 'what\'s your name', 'who are you', 'are you a bot', 'are you human'];
      const isPersonalQuestion = personalQuestions.some(question => 
        userMessage.toLowerCase().includes(question)
      );

      if (isPersonalQuestion) {
        return {
          text: getStandardResponse('personal_question'),
          category: 'personal'
        };
      }

      // Check for small talk
      const smallTalkKeywords = ['how are you', 'how\'s your day', 'how are you doing', 'good morning', 'good afternoon', 'hello', 'hi there'];
      const isSmallTalk = smallTalkKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );

      if (isSmallTalk) {
        return {
          text: getStandardResponse('small_talk'),
          category: 'small_talk'
        };
      }

      // Prepare conversation history for AI context using passed messages array
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

      const response = await fetch('/api/chat/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory,
          agentName: chatState.agentName,
          customerNumber: currentUser,
          transactionData: userTransactions
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      return {
        text: data.response,
        category: 'ai-generated',
        pdfData: data.pdfData,
        pdfFileName: data.pdfFileName
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      const fallbackMessages = [
        "Sorry, I wasn't able to bring that up just now. Could you try again or let me know how else I can help?",
        "I'm sorry, I didn't quite catch that. Could you give me a moment and try again?",
        "Thanks for your patience — I wasn't able to get that for you just now. Would you like to try again?",
        "I'd be happy to help with that. Could you send that again? I want to make sure I give you the right information."
      ];
      return {
        text: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)],
        category: 'ai-generated'
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: getAppDate()
    };

    // Capture current messages for AI context
    const currentMessages = [...chatState.messages, userMessage];
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      lastActivityTime: new Date(),
      hasCheckedIn: false
    }));
    
    setInputText("");

    // Reset inactivity timer on user message
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    startInactivityTimer();
    
    // Calculate realistic reading time for user's message
    // Average reading speed: 150-200 words per minute
    const userWords = userMessage.text.split(' ').length;
    const readingWPM = Math.random() * 50 + 150; // 150-200 WPM
    const readingTimeMs = (userWords / readingWPM) * 60 * 1000;
    const readingDelay = Math.max(300, readingTimeMs); // Minimum 300ms (fast reading)
    
    // Start processing after reading delay
    setTimeout(async () => {
      try {
        // Generate response while agent is "reading" - use captured messages for context
        const responseData = await generateAIResponse(userMessage.text, currentMessages);
        
        // Calculate realistic typing time based on agent personality
        const responseWords = responseData.text.split(' ').length;
        const typingWPM = getAgentTypingSpeed();
        const typingTimeMs = (responseWords / typingWPM) * 60 * 1000;
        const typingDelay = Math.max(500, typingTimeMs); // Minimum 500ms (fast typing)
        
        // Show typing indicator
        setIsTyping(true);
        setTypingText(`${chatState.agentName} is typing...`);
        
        // Display response after typing delay
        setTimeout(() => {
          const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: responseData.text,
            isUser: false,
            timestamp: getAppDate(),
            agentName: chatState.agentName,
            isAutomated: false,
            pdfData: (responseData as any).pdfData,
            pdfFileName: (responseData as any).pdfFileName
          };

          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, botMessage]
          }));
          
          setIsTyping(false);
          setTypingText("");
        }, typingDelay);
        
      } catch (error) {
        console.error('Error in AI response handling:', error);
        // Show typing indicator even for error
        setIsTyping(true);
        setTypingText(`${chatState.agentName} is typing...`);
        
        setTimeout(() => {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: "Sorry, I wasn't able to bring that up just now. Would you like me to try again or connect you with another agent?",
            isUser: false,
            timestamp: getAppDate(),
            agentName: chatState.agentName,
            isAutomated: false
          };

          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, errorMessage]
          }));
          
          setIsTyping(false);
          setTypingText("");
        }, 800); // Fast typing delay for error message
      }
    }, readingDelay);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndChatRequest = () => {
    setShowEndChatConfirm(true);
  };

  const handleEndChatConfirm = () => {
    setShowEndChatConfirm(false);
    setIsEndingChat(true);
    setEndChatCountdown(0); // Set to 0 to show "Chat Ended" immediately
    
    // Show "Chat Ended" message briefly then close
    setTimeout(() => {
      handleEndChat();
    }, 2000); // Show for 2 seconds then close
  };

  const handleEndChatCancel = () => {
    setShowEndChatConfirm(false);
  };

  const handleEndChat = () => {
    if (!currentUser) return;
    
    // Clear all timers
    if (queueTimerRef.current) {
      clearInterval(queueTimerRef.current);
      queueTimerRef.current = null;
    }
    
    if (endChatTimerRef.current) {
      clearInterval(endChatTimerRef.current);
      endChatTimerRef.current = null;
    }
    
    // Clear only the current user's chat data from localStorage
    const userChatKey = `liveChatState_${currentUser}`;
    localStorage.removeItem(userChatKey);
    
    // Clear any other user-specific chat-related storage
    Object.keys(localStorage).forEach(key => {
      if (key.includes(`_${currentUser}_`) && (key.includes('chat') || key.includes('liveChat'))) {
        localStorage.removeItem(key);
      }
    });
    
    // Reset all component state completely
    setChatState({
      messages: [],
      isActive: false,
      agentName: '',
      sessionId: '',
      lastResponseIndex: {},
      queueStatus: 'ended',
      queueStartTime: undefined,
      estimatedWaitTime: 0
    });
    
    // Clear input and typing states
    setInputText('');
    setIsTyping(false);
    setTypingText('');
    setQueueTimeRemaining(0);
    setIsEndingChat(false);
    setEndChatCountdown(0);
    setShowEndChatConfirm(false);
    
    // Close the chat completely
    onClose();
  };

  const handleCloseChat = () => {
    // For persistent chat, just minimize/hide the chat instead of ending it
    setIsAnimating(true);
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 backdrop-animate-in">
      <div 
        className={`bg-white w-full md:w-[90vw] md:h-[90vh] md:rounded-3xl md:max-w-4xl md:max-h-[800px] chat-container shadow-2xl absolute ${
          isAnimating ? 'chat-animate-out' : 'chat-animate-in'
        }`}
        style={{ 
          top: 0,
          left: 0,
          right: 0,
          bottom: '88px', // Leave space for bottom navigation
          height: 'calc(100vh - 88px)',
          maxHeight: 'calc(100vh - 88px)'
        }}
      >
        {/* Header */}
        <div className="bg-[#126987] px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              {chatState.queueStatus === 'waiting' ? (
                <>
                  <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Live Chat Support
                  </h3>
                  <p className="text-white/80 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Connecting you to an agent...
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {chatState.agentName} – Customer Support
                  </h3>
                  <p className="text-white/80 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {isTyping ? typingText : 'Online now'}
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleCloseChat}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 transition-colors rounded-full flex items-center justify-center text-white"
            title="Close chat (keeps session active)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Container */}
        <div className="chat-messages bg-gray-50">
          <div className="p-6 space-y-6 pb-6">
          {/* Queue status message */}
          {chatState.queueStatus === 'waiting' && (
            <div className="flex justify-center">
              <div className="bg-orange-50 text-orange-800 px-6 py-6 rounded-2xl text-base text-center max-w-[95%] border border-orange-200">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-4 h-4 bg-orange-400 rounded-full animate-pulse mr-3"></div>
                  <p className="font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    You're now in the queue
                  </p>
                </div>
                <p className="text-base" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Please wait while we connect you to an available agent...
                </p>
                {queueTimeRemaining > 0 && (
                  <p className="text-orange-600 font-medium mt-3 text-base" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Estimated wait: {Math.ceil(queueTimeRemaining / 1000 / 60)} minute{Math.ceil(queueTimeRemaining / 1000 / 60) !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Connection success message */}
          {chatState.queueStatus === 'connected' && chatState.messages.length === 0 && (
            <div className="flex justify-center">
              <div className="bg-green-50 text-green-800 px-4 py-3 rounded-2xl text-sm text-center max-w-[90%] border border-green-200">
                <div className="flex items-center justify-center mb-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <p className="font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    You're now connected with {chatState.agentName} – Customer Support
                  </p>
                </div>
                <p className="text-xs text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Online now
                </p>
              </div>
            </div>
          )}

          {chatState.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                <div
                  className={`px-5 py-4 rounded-2xl ${
                    message.isUser
                      ? 'bg-[#126987] text-white rounded-br-sm'
                      : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  <p className="text-base leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {message.text}
                  </p>
                  {message.pdfData && (
                    <div className={`mt-3 pt-3 border-t ${message.isUser ? 'border-white/20' : 'border-gray-100'}`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const pdfDataUrl = message.pdfData!;
                            const byteString = atob(pdfDataUrl.split(',')[1] || pdfDataUrl.replace(/^data:.*?;base64,/, ''));
                            const mimeType = 'application/pdf';
                            const ab = new ArrayBuffer(byteString.length);
                            const ia = new Uint8Array(ab);
                            for (let i = 0; i < byteString.length; i++) {
                              ia[i] = byteString.charCodeAt(i);
                            }
                            const blob = new Blob([ab], { type: mimeType });
                            const blobUrl = URL.createObjectURL(blob);
                            const fileName = message.pdfFileName || 'Transfer_Confirmation.pdf';
                            
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            if (isIOS) {
                              window.open(blobUrl, '_blank');
                            } else {
                              const link = document.createElement('a');
                              link.href = blobUrl;
                              link.download = fileName;
                              link.style.display = 'none';
                              document.body.appendChild(link);
                              link.click();
                              setTimeout(() => {
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                              }, 1000);
                            }
                          } catch (err) {
                            console.error('PDF download error:', err);
                          }
                        }}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors w-full ${
                          message.isUser 
                            ? 'bg-white/10 hover:bg-white/20 text-white' 
                            : 'bg-gray-50 hover:bg-gray-100 text-[#126987]'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium">Download Confirmation</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className={`text-sm text-gray-500 mt-2 ${message.isUser ? 'text-right' : 'text-left'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 mr-3 flex-shrink-0 overflow-hidden ${
                message.isUser ? 'order-1 bg-[#126987]' : 'order-2 bg-gray-200'
              }`}>
                {message.isUser ? (
                  <User className="w-5 h-5 text-white" />
                ) : message.isAutomated ? (
                  <img src={botIconPath} alt="Bot" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="order-1 max-w-[80%]">
                <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600 text-sm mr-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {chatState.agentName} is typing
                    </span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms', animationDuration: '1.4s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s', animationDuration: '1.4s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s', animationDuration: '1.4s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-2 w-8 h-8 rounded-full flex items-center justify-center ml-2 flex-shrink-0 bg-gray-200">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          )}
          
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="chat-input-area p-4">
          {chatState.queueStatus === 'waiting' ? (
            <div className="text-center py-2">
              <p className="text-gray-500 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Please wait to be connected before sending messages...
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={scrollToBottom}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#126987] focus:border-transparent text-base"
                    style={{ 
                      fontFamily: 'OpenSans, sans-serif',
                      fontSize: '16px' // Prevents zoom on iOS
                    }}
                    disabled={isTyping}
                    autoComplete="off"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  className="w-11 h-11 bg-[#126987] rounded-full flex items-center justify-center hover:bg-[#0d4e63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* End Chat button positioned properly */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleEndChat}
                  className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  End Chat
                </button>
              </div>
            </>
          )}
        </div>

        {/* End Chat Confirmation Dialog */}
        {showEndChatConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                End Chat Session?
              </h3>
              <p className="text-gray-600 mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Are you sure you want to end the chat? This will close the current conversation.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleEndChatCancel}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndChatConfirm}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  End Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Ended Message */}
        {isEndingChat && (
          <div className="absolute inset-0 bg-[#126987] rounded-3xl flex items-center justify-center z-50">
            <div className="text-center text-white px-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Chat Ended
              </h3>
              <p className="text-white/80" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Thank you for contacting support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}