import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, User, Bot } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

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

    // 30 unique agents with distinct personalities and behaviors
    const agentProfiles = [
      { name: 'Emma', specialty: 'General Support', personality: 'friendly' },
      { name: 'James', specialty: 'Transfer Support', personality: 'formal' },
      { name: 'Sarah', specialty: 'Account Security', personality: 'overly_helpful' },
      { name: 'Zoe', specialty: 'Technical Support', personality: 'sarcastic' },
      { name: 'Aoife', specialty: 'General Support', personality: 'relaxed' },
      { name: 'Liam', specialty: 'Cards & Payments', personality: 'quick_texter' },
      { name: 'Rachel', specialty: 'Account Services', personality: 'slow_typer' },
      { name: 'Connor', specialty: 'Digital Banking', personality: 'emoji_lover' },
      { name: 'Sophie', specialty: 'Customer Care', personality: 'bubbly' },
      { name: 'David', specialty: 'International Banking', personality: 'professional' },
      { name: 'Claire', specialty: 'Loan Services', personality: 'patient' },
      { name: 'Ryan', specialty: 'Business Banking', personality: 'direct' },
      { name: 'Rebecca', specialty: 'Mobile Banking', personality: 'tech_savvy' },
      { name: 'Sean', specialty: 'Transfer Support', personality: 'chatty' },
      { name: 'Katie', specialty: 'Account Security', personality: 'cautious' },
      { name: 'Adam', specialty: 'Technical Support', personality: 'laid_back' },
      { name: 'Niamh', specialty: 'General Support', personality: 'enthusiastic' },
      { name: 'Daniel', specialty: 'Cards & Payments', personality: 'punctual' },
      { name: 'Amy', specialty: 'Customer Care', personality: 'empathetic' },
      { name: 'Jack', specialty: 'Digital Banking', personality: 'trendy' },
      { name: 'Laura', specialty: 'Account Services', personality: 'methodical' },
      { name: 'Thomas', specialty: 'International Banking', personality: 'worldly' },
      { name: 'Hannah', specialty: 'Mobile Banking', personality: 'millennial' },
      { name: 'Mark', specialty: 'Business Banking', personality: 'no_nonsense' },
      { name: 'Grace', specialty: 'Loan Services', personality: 'reassuring' },
      { name: 'Oliver', specialty: 'Transfer Support', personality: 'witty' },
      { name: 'Ella', specialty: 'Account Security', personality: 'thorough' },
      { name: 'Luke', specialty: 'Technical Support', personality: 'geeky' },
      { name: 'Chloe', specialty: 'Customer Care', personality: 'warm' },
      { name: 'Ben', specialty: 'General Support', personality: 'curious' }
    ];
    const randomAgent = agentProfiles[Math.floor(Math.random() * agentProfiles.length)].name;
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
  
  // Load persisted chat state when component opens, or initialize fresh if none exists
  useEffect(() => {
    if (isOpen && currentUser) {
      const userChatKey = `liveChatState_${currentUser}`;
      const saved = UserDataManager.getUserData(`liveChatState`, null);
      
      if (saved) {
        try {
          const parsedState = saved;
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
          text: getCheckInMessage(chatState.agentName),
          isUser: false,
          timestamp: new Date(),
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
      UserDataManager.setUserData(`liveChatState`, persistentState);
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
      sessionStorage.setItem('app_navigation_active', 'true');
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
            timestamp: new Date(),
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
              timestamp: new Date(),
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
              timestamp: new Date(),
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
              const welcomeText = getPersonalityResponse(chatState.agentName, 'welcome');
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
                  timestamp: new Date(),
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

  const getDefaultResponses = (): ChatResponse[] => [
    {
      id: '1',
      category: 'card_issues',
      triggers: ['unblock card', 'card blocked', 'card not working', 'blocked card', 'card issue', 'lost card', 'stolen card', 'replacement card', 'new card'],
      responses: [
        "I can help you with your card issue right away. To unblock your card, go to Profile > Admin Panel and tap 'Unblock Card'. Your card will be available immediately for transactions.",
        "No worries at all, let me sort that card problem for you. You can unblock your card through Profile > Admin Panel > 'Unblock Card'. It takes effect instantly, so you'll be able to use it straight away.",
        "I completely understand how frustrating that must be! The quickest way to unblock it is through your Profile > Admin Panel. Look for the 'Unblock Card' option and it'll be working again in seconds.",
        "Right, I'll walk you through unblocking your card. Navigate to Profile > Admin Panel and select 'Unblock Card' for instant activation. If you're still having issues after that, just let me know.",
        "Alright, let me help with that card issue. Head to Profile > Admin Panel and you'll see the 'Unblock Card' option there. Once you tap it, your card should be good to go immediately.",
        "For your security, your card has been blocked, but I can help you get it working again. Go to Profile > Admin Panel and select 'Unblock Card' - that'll restore full access right away."
      ]
    },
    {
      id: '2',
      category: 'transfers',
      triggers: ['transfer money', 'send money', 'make transfer', 'how to transfer', 'payment', 'pending transfer', 'international transfer', 'swift code', 'iban transfer', 'uk transfer', 'transfer limit', 'transfer fee'],
      responses: [
        "Absolutely, I'll help you with transfers. For UK transfers, tap 'Payments' then 'UK Transfer' - these typically take up to 24 hours. For SEPA zone transfers, use 'SEPA Transfer' which usually takes 1-2 working days. What type of transfer are you looking to make?",
        "I can definitely help with that transfer. Use the 'Payments' section at the bottom - UK Transfer for domestic payments (up to 24 hours) or SEPA Transfer for transfers within the SEPA zone (small fee applies, 1-2 days). Are you sending money within the UK or to the SEPA zone?",
        "Right, let me walk you through the transfer options. Go to 'Payments' at the bottom of your screen. UK Transfer handles domestic payments in up to 24 hours, while SEPA Transfer covers payments within the SEPA zone with competitive exchange rates. Which country are you sending to?",
        "No worries, I'll explain the transfer process. In 'Payments', you'll see UK Transfer for domestic payments (up to 24 hours) and SEPA Transfer for transfers within the SEPA zone (£2-15 fee depending on amount, arrives 1-2 working days). What's the destination for your transfer?",
        "Let me help you sort that transfer. The 'Payments' section has two options - UK Transfer for domestic payments (allow up to 24 hours) or SEPA Transfer for transfers within the SEPA zone (typically 1-2 days with a small fee). Where are you sending the money?",
        "Alright, I can guide you through the transfer process. Head to 'Payments' where you'll find UK Transfer for domestic payments (up to 24 hours processing) and SEPA Transfer for transfers within the SEPA zone. What type of payment are you making?"
      ]
    },
    {
      id: '3',
      category: 'account_info',
      triggers: ['check balance', 'account balance', 'how much money', 'balance', 'statement', 'iban', 'sort code', 'account number', 'account details', 'routing number'],
      responses: [
        "Your account balances are displayed right on the main dashboard when you log in. For detailed statements or account numbers, just tap on any account to see the full breakdown including IBAN and sort code.",
        "Brilliant, all your balances are visible on the homepage dashboard. If you need your IBAN, sort code, or detailed statements, tap on the specific account and you'll find all those details there.",
        "Perfect! You can see all your account balances on the main screen. For account numbers, IBAN details, or monthly statements, just tap the account you're interested in - everything's there.",
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
        "ATM issues can be really inconvenient! Your daily withdrawal limit is typically £300, and there's no charge for using Bank of Ireland ATMs. If your card was declined, try a different ATM first - sometimes it's just a machine issue. If problems persist, I can help check your account status.",
        "I can help with ATM troubles. Bank of Ireland ATMs are free to use, and your daily limit is usually £300. If you're getting declined, it might be a network issue with that particular machine. Try another ATM, and if it still doesn't work, let me know - we can check if there's an issue with your card.",
        "ATM problems are frustrating when you need cash! Your standard daily limit is £300, and you won't be charged for using our ATMs. If a withdrawal failed, try a different machine first - sometimes it's just a connectivity issue. Still having trouble? I can look into your account for any restrictions.",
        "Let me help with that ATM issue. You can withdraw up to £300 daily from Bank of Ireland ATMs without charges. If your transaction was declined, it could be a temporary machine problem - try another ATM. If it happens again, there might be a card restriction I can help investigate."
      ]
    },
    {
      id: '6',
      category: 'fees_charges',
      triggers: ['fees', 'charges', 'cost', 'how much', 'price', 'overdraft', 'overdraft fee', 'monthly fee', 'account fee', 'maintenance fee'],
      responses: [
        "I can explain our fee structure. Current accounts have no monthly maintenance fee if you keep a minimum £3,000 balance, otherwise it's £5 monthly. Overdraft rates are 19.9% APR up to £2,000. International transfers are £2-15 depending on amount and destination. What specific fees were you asking about?",
        "Our fees are quite competitive! No monthly charges on current accounts with £3,000+ balance, £5 monthly otherwise. Overdrafts are 19.9% APR (much better than most banks). UK transfers are free, international ones £2-15. Unpaid item fees are £10. Which fees concern you?",
        "Let me break down the main fees: Current accounts are free with £3,000 balance, £5/month below that. Overdraft is 19.9% APR up to £2,000 limit. ATM withdrawals abroad are €2.50. Standing orders and direct debits are free. What particular charges are you concerned about?",
        "Happy to clarify our charges! Account maintenance is £5 monthly unless you keep £3,000+ (then it's free). Arranged overdraft is 19.9% APR, unpaid items £10. International payments vary £2-15 by destination. No charges for UK payments or most online banking. Need details on any specific fee?"
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
        "I'd be happy to help with opening a new account! We offer current accounts, savings accounts, student accounts, and business accounts. You'll need photo ID and proof of address from the last 3 months. Would you like to know about a specific type of account, or shall I arrange for a specialist to call you?",
        "Great choice in choosing Bank of Ireland for a new account! We have several options - current accounts (free with £3,000 balance), savings accounts with competitive rates, and specialized accounts for students and businesses. What type of account interests you most?",
        "Opening an account is straightforward! You'll need valid photo ID and a recent utility bill or bank statement for proof of address. We offer current accounts, savings, student accounts with perks, and business accounts. Which would suit your needs best?",
        "I can definitely help with account opening! Our current accounts are popular (no fees with £3,000+ balance), or we have savings accounts with great rates. For students, we have special accounts with overdraft facilities. What are you looking for?"
      ]
    },
    {
      id: '11',
      category: 'mortgage_loans',
      triggers: ['mortgage', 'home loan', 'loan', 'personal loan', 'car loan', 'credit', 'borrowing', 'interest rate'],
      responses: [
        "I can provide some initial information about our lending products. We offer mortgages from 3.2% APR, personal loans £1,000-£25,000, and car finance options. For detailed rates and applications, let me connect you with our lending specialist who can assess your specific needs and provide accurate quotes.",
        "We have several lending options available! Mortgages start from 3.2% APR depending on deposit and circumstances. Personal loans range £1,000-£25,000 with competitive rates. For the best advice and rates specific to your situation, let me escalate this to our lending team who can help properly.",
        "Happy to discuss our loan products! We offer mortgages (rates from 3.2% APR), personal loans up to £25,000, car finance, and business loans. However, for accurate rates and to discuss your specific requirements, let me escalate that to a specialist who'll assist you shortly.",
        "Our lending products include mortgages from 3.2% APR, personal loans £1,000-£25,000, and various credit options. Given the complexity of lending decisions, let me escalate that to a specialist who'll assist you shortly with detailed information and applications."
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

  const getChatResponses = (): ChatResponse[] => {
    const stored = UserDataManager.getUserData('chatResponses', null);
    return stored || getDefaultResponses();
  };

  // Comprehensive personality-based responses for all 30 agents
  const getPersonalityResponse = (agentName: string, messageType: string, userMessage?: string): string => {
    const personalityResponses: { [key: string]: { [key: string]: string[] } } = {
      'Emma': {
        welcome: ["Hi there! I'm Emma and I'm here to help with whatever you need today 😊", "Hello! Emma here, ready to assist you with your banking needs"],
        no_transactions: ["Your account's looking nice and quiet - no recent transactions to show you!", "Everything's peaceful on your account front - no activity to report"],
        personal_question: ["I'm Emma, one of the support team here! How can I help you today?", "That's me - Emma! I'm a real person here to help with your banking"],
        small_talk: ["I'm doing great, thanks for asking! How can I help you today?", "Lovely to chat! What can I do for you?"]
      },
      'James': {
        welcome: ["Good day. James here from Bank of Ireland customer service. How may I assist you today?", "Hello, this is James. I'm here to provide you with professional banking assistance."],
        no_transactions: ["Upon reviewing your account, I can confirm there are no recent transactions recorded.", "A thorough check shows no recent activity on your account at this time."],
        personal_question: ["I am James, a customer service representative with Bank of Ireland. How may I be of service?", "James speaking. I'm here in a professional capacity to assist with your banking requirements."],
        small_talk: ["I appreciate your inquiry. Let us focus on how I may assist with your banking needs today.", "Thank you for asking. How may I help you with your account today?"]
      },
      'Sarah': {
        welcome: ["Hi! I'm Sarah and I'm absolutely delighted to help you today! Let me know what you need and I'll do everything I can to sort it out!", "Hello there! Sarah here - I'm going to make sure we get everything sorted for you perfectly!"],
        no_transactions: ["I've done a really thorough check for you and your account is completely clear - no transactions at all! That means everything's nice and secure!", "After checking absolutely everywhere, I can confirm there's no recent activity - your account is perfectly safe and sound!"],
        personal_question: ["Yes indeed, I'm Sarah! I'm a real person here and I absolutely love helping customers like yourself! What can I do for you?", "That's right, I'm Sarah - a real human being working here at Bank of Ireland! I'm here to help with absolutely anything you need!"],
        small_talk: ["Oh I'm having a wonderful day, thank you so much for asking! How are you doing? What can I help you with?", "I'm doing brilliantly, thanks! I just love helping customers - what can I sort out for you today?"]
      },
      'Zoe': {
        welcome: ["Hey, Zoe here. Let me guess - something's not working the way it should? 🙄", "Hi, I'm Zoe. What technical disaster can I help you fix today?"],
        no_transactions: ["Well, your account is as active as a sloth on vacation. Zero transactions.", "Congratulations, you've achieved the impossible - a completely boring transaction history."],
        personal_question: ["Yep, I'm real. Unfortunately for both of us. What's the problem?", "I'm Zoe, and yes, I'm a real person stuck answering the same questions all day. What do you need?"],
        small_talk: ["Oh, living the dream here in customer service. What can I 'help' you with?", "Just peachy, thanks for asking. Now, what's actually broken?"]
      },
      'Aoife': {
        welcome: ["Hey there! Aoife here, just chillin' and ready to help out", "Hi! I'm Aoife, no worries at all - what's up?"],
        no_transactions: ["Yeah, so your account's been pretty chill lately - nothing going on", "All quiet on the western front, as they say. No transactions happening"],
        personal_question: ["Yep, that's me - Aoife! Real person, real helpful. What do you need?", "I'm Aoife, and yeah I'm totally real! What can I sort for you?"],
        small_talk: ["Not bad at all, just taking it easy here. How's your day going?", "Pretty relaxed day here! What's happening with you?"]
      },
      'Liam': {
        welcome: ["hey! liam here", "hi! its liam, whats up?"],
        no_transactions: ["nope no transactions yet", "nothing showing up here", "all clear mate"],
        personal_question: ["yep thats me liam!", "im liam yeah real person", "liam here what do u need"],
        small_talk: ["yeah good thanks u?", "not bad hbu?", "all good here"]
      },
      'Rachel': {
        welcome: ["Hello... this is... Rachel... I'll be... helping you... today...", "Hi there... Rachel here... please give me... a moment to... assist you..."],
        no_transactions: ["Let me... check that... for you... No... no transactions... showing up... at the moment...", "I'm... looking now... and... your account... appears to be... clear of... recent activity..."],
        personal_question: ["Yes... I'm Rachel... I'm a real... person here... just... typing a bit... slowly today...", "That's me... Rachel... real human... just... taking my time... to help you..."],
        small_talk: ["I'm... doing well... thank you... for asking... How... are you... today?", "Oh... not too bad... just... working away... here... How can... I help?"]
      },
      'Connor': {
        welcome: ["Hey! 😄 Connor here! 🙋‍♂️ Super excited to help you today! ✨", "Hi there! 👋 I'm Connor and I'm ready to make your day awesome! 😊🌟"],
        no_transactions: ["No transactions yet! 📝✨ Your account is squeaky clean! 🧼😄", "All quiet on the transaction front! 🤐💸 Nothing to show you right now! 😊"],
        personal_question: ["Yep! 🙋‍♂️ I'm Connor! Real person with real enthusiasm! 😄✨ What can I do for you?", "That's me! Connor! 😊 100% real human being here! 👨‍💻 How can I help? 🤝"],
        small_talk: ["I'm doing amazing! 🌟 Thanks for asking! 😊 How's your day going? ☀️", "Fantastic day here! 😄 Love chatting with customers! 💬 What's up? 👋"]
      },
      'Sophie': {
        welcome: ["OMG hiiii! 💕 I'm Sophie and I'm like, SO excited to help you today! ✨", "Hey hun! Sophie here! I'm absolutely thrilled to chat with you! 🥰"],
        no_transactions: ["Aww, your account is super quiet right now! No transactions to show! It's actually kinda peaceful! 💕", "Nothing happening transaction-wise! Your account is just chilling! So zen! ✨"],
        personal_question: ["Yes yes yes! I'm Sophie! Totally real and totally here for you! What do you need, sweetie? 💕", "That's me! Sophie! Real human with real excitement to help! How can I make your day better? 🥰"],
        small_talk: ["Oh my gosh, I'm having the BEST day! Thank you for asking! How are YOU doing? Tell me everything! 💕", "I'm doing amazingly well! I just love talking to people! How's your day been? ✨"]
      },
      'David': {
        welcome: ["Good afternoon. I am David, your dedicated customer service professional. I shall ensure your banking requirements are met with the highest standard of service.", "Hello. David here, providing comprehensive banking support with attention to detail and professional excellence."],
        no_transactions: ["Following a comprehensive review of your account records, I can confirm that no transactions have been processed in the recent period.", "After conducting a thorough examination of your account activity, I can verify that no recent transactions are present."],
        personal_question: ["I am David, a qualified customer service professional with extensive experience in banking operations. How may I assist you today?", "Indeed, I am David, a professional representative of Bank of Ireland, committed to providing exemplary service. What assistance do you require?"],
        small_talk: ["I maintain a professional focus on delivering excellent service. How may I assist with your banking needs today?", "I appreciate your courtesy. My focus remains on providing you with outstanding banking support. How may I help?"]
      },
      'Claire': {
        welcome: ["Hello there, I'm Claire. Take all the time you need - I'm here to help at your own pace.", "Hi, Claire here. No rush at all, I'm happy to work through whatever you need step by step."],
        no_transactions: ["I've taken a careful look and there's nothing showing up yet. That's perfectly fine - we can wait for things to come through.", "After checking patiently, I can see your account is clear of recent transactions. We can take our time figuring out what you need."],
        personal_question: ["Yes, I'm Claire! I'm a real person and I believe in taking the time to really help people properly. What would you like to know?", "That's me - Claire! I'm here and I like to make sure everyone feels comfortable asking questions. How can I help?"],
        small_talk: ["I'm having a peaceful day, thank you for asking. I find it's nice to take things slowly. How has your day been?", "I'm doing well, thanks! I always enjoy taking the time to chat with customers. What's on your mind today?"]
      },
      'Ryan': {
        welcome: ["Ryan here. What's the issue?", "Hi, I'm Ryan. Let's get straight to what you need."],
        no_transactions: ["No transactions. Simple as that.", "Nothing there. Account's clear."],
        personal_question: ["I'm Ryan. Real person. What do you need help with?", "Yeah, Ryan. I'm here to fix problems, not chat. What's the issue?"],
        small_talk: ["I'm fine. What banking issue can I solve for you?", "Doing my job. What do you need help with?"]
      },
      'Rebecca': {
        welcome: ["Hey! Rebecca here! I'm super into all the latest banking tech - what can I help you explore today?", "Hi there! I'm Rebecca and I absolutely love helping people navigate our digital features!"],
        no_transactions: ["Your digital transaction history is totally clean right now! Everything's synced and looking good on our end.", "I've checked all our systems and your account activity is completely up to date - nothing new to show!"],
        personal_question: ["I'm Rebecca! I'm definitely real and I'm totally passionate about fintech and digital banking! What tech questions do you have?", "That's me - Rebecca! Real human who just happens to love technology! How can I help you with our digital services?"],
        small_talk: ["I'm doing amazing! Just been playing around with some new features in our app - it's so cool! How are you finding our digital banking?", "Great day! I love seeing how customers use our technology. Have you tried any of our newer features?"]
      },
      'Sean': {
        welcome: ["Well hello there! Sean here and I'm absolutely delighted to chat with you today! How's everything going? What brings you my way?", "Hey there! It's Sean! Lovely to meet you! I hope you're having a brilliant day so far - what can I help you with?"],
        no_transactions: ["So I've had a good look around your account and it's interesting actually - completely quiet on the transaction front! Nothing at all happening, which is quite peaceful really. Sometimes it's nice when things are calm, isn't it?", "Right, so your account - I've checked everywhere and it's like a library in there, completely silent! No transactions whatsoever, which might actually be exactly what you want, mightn't it?"],
        personal_question: ["Oh absolutely, I'm Sean alright! Real as they come! I'm one of the customer service team here and I just love having a good chat with people. Always happy to help! What's on your mind today?", "That's me indeed - Sean! I'm a real person, definitely not a robot or anything like that! I work here and I genuinely enjoy talking to customers. Been here a good while now actually. What can I do for you?"],
        small_talk: ["Oh I'm having a fantastic day, thanks so much for asking! It's been really busy but in a good way, you know? I love meeting different people and hearing their stories. How has your day been treating you?", "Brilliant day here, thank you! I was just thinking earlier how much I enjoy this job because you never know who you'll meet or what interesting conversations you'll have. Speaking of which, how are things with you?"]
      },
      'Katie': {
        welcome: ["Hello, I'm Katie. Before we begin, I want to ensure we handle everything securely and properly.", "Hi there, Katie here. I take security very seriously, so let's make sure we do everything by the book."],
        no_transactions: ["I've conducted a secure review of your account and can confirm no recent transactions. Your account security appears intact.", "After a thorough security check, I can verify there are no recent transactions. This is actually good for your account security."],
        personal_question: ["I'm Katie, yes. I'm a real security-focused support representative. I need to verify - is there a specific security concern you have?", "Yes, I'm Katie. I'm here to help with security matters. Before we continue, can you confirm you're accessing this from your usual device?"],
        small_talk: ["I'm well, thank you. I prefer to focus on ensuring your account remains secure. Is there anything about your account security you'd like to discuss?", "I'm doing fine, though I always stay vigilant about security matters. How can I help protect your account today?"]
      },
      'Adam': {
        welcome: ["Hey, Adam here. Whatever tech issue you've got, we'll figure it out. No stress.", "Hi there, I'm Adam. Tech problems happen - let's just sort it out nice and easy."],
        no_transactions: ["Yeah, checked your account... it's all good, just quiet. No transactions showing up. All normal.", "Looked into it for you - account's clean, no recent activity. Sometimes that's just how it is."],
        personal_question: ["Yeah, I'm Adam, real person. I handle the tech stuff around here. Pretty relaxed about it all. What's up?", "That's me - Adam. Real guy, real solutions. I keep things simple. What do you need help with?"],
        small_talk: ["Not bad, just fixing stuff and helping people out. Pretty chill day actually. How about you?", "Doing alright, thanks. Just another day in tech support paradise. What brings you here?"]
      },
      'Niamh': {
        welcome: ["OMG HI!! I'm Niamh and I'm SO excited to help you today!! This is going to be AMAZING!!", "Hey there!! Niamh here and I am PUMPED to sort everything out for you!! Let's do this!!"],
        no_transactions: ["OH WOW! Your account is super clean right now!! No transactions at all which is actually FANTASTIC for keeping track of things!!", "This is so cool - your account is completely clear!! No recent activity which means everything is nice and organized!!"],
        personal_question: ["YES!! I'm Niamh!! I'm totally real and I LOVE helping people!! I get so excited about customer service!! What can I do for you?!", "That's me!! Niamh!! Real person with real enthusiasm!! I just absolutely LOVE this job!! How can I make your day better?!"],
        small_talk: ["OH MY GOSH I'm having the BEST day ever!! I love talking to customers!! How are YOU doing?! Tell me everything!!", "I'm doing INCREDIBLE thank you so much for asking!! I just love meeting new people!! What's been the highlight of your day?!"]
      },
      'Daniel': {
        welcome: ["Good morning. Daniel here, precisely at your service. Shall we address your banking requirements efficiently?", "Hello. I am Daniel, and I shall assist you with prompt attention to detail. What requires immediate attention?"],
        no_transactions: ["Precisely checked at 14:32 - zero transactions recorded. Your account maintains perfect clarity.", "Exact review completed - no transactions present. Account status: completely current and accurate."],
        personal_question: ["I am Daniel, customer service representative, specializing in efficient problem resolution. Shall we proceed with your inquiry?", "Yes, Daniel speaking. Real person, real solutions, delivered punctually. How may I assist you without delay?"],
        small_talk: ["I am performing optimally, thank you. Time is valuable - how may I efficiently serve your banking needs?", "Functioning excellently, as always. I prefer to maximize our time together. What assistance do you require?"]
      },
      'Amy': {
        welcome: ["Oh hello there, I'm Amy. I can hear you might be having some concerns? I'm here to listen and help however I can.", "Hi, Amy here. I want you to know that whatever's happening, we'll work through it together. You're in safe hands."],
        no_transactions: ["I've looked into this for you with care, and I can see there aren't any recent transactions. I know that might be worrying or confusing, but that's actually quite normal sometimes.", "I understand this might be concerning, but I've checked thoroughly and your account is simply quiet right now - no recent activity, which can actually be perfectly normal."],
        personal_question: ["Yes, I'm Amy, and I'm absolutely a real person who genuinely cares about helping you. I can understand why you might want to know - it's important to feel you're talking to someone real.", "I'm Amy, yes - a real human being who's here because I truly want to help people feel heard and supported. Is there something specific that's worrying you?"],
        small_talk: ["I'm doing well, though I always care more about how you're feeling. It sounds like you might have something on your mind? I'm here to listen.", "Thank you for asking - I'm fine, but I'm more interested in how you're doing today. Sometimes it helps just to talk about what's going on."]
      },
      'Jack': {
        welcome: ["Yo! Jack here! Ready to dive into some digital banking magic? What's the vibe today?", "Hey hey! It's Jack! Let's get this digital party started! What can I help you with?"],
        no_transactions: ["So your account is totally zen right now - no transactions vibing through at all! Sometimes quiet is the new loud, you know?", "Checked your digital flow and it's all peaceful vibes - zero transactions happening! Your account is just chilling!"],
        personal_question: ["Yeah that's me - Jack! 100% real human just keeping things fresh and digital! What's good?", "Totally real person right here! I'm Jack and I'm all about that authentic customer experience! What's happening?"],
        small_talk: ["Living my best life here! Just spreading good vibes and helping people navigate the digital world! How's your energy today?", "Crushing it today, thanks for asking! Always love connecting with cool people like yourself! What's been keeping you busy?"]
      },
      'Laura': {
        welcome: ["Hello, I'm Laura. I'll be conducting a systematic review of your requirements to ensure comprehensive assistance.", "Good day, Laura speaking. I shall methodically address each aspect of your inquiry with thoroughness."],
        no_transactions: ["Step 1: Account access verified. Step 2: Transaction history reviewed. Step 3: Confirmed zero recent transactions. Analysis complete.", "Following proper procedure: Account checked systematically. Result: No recent transaction activity detected. Status verified and documented."],
        personal_question: ["I am Laura, following standard customer service protocols. I am indeed a real person trained in methodical problem-solving. Shall we proceed systematically?", "Yes, I am Laura. Real person, systematic approach. I believe in following proper procedures to ensure complete assistance. What is your primary concern?"],
        small_talk: ["I am functioning optimally according to my structured approach to customer service. Shall we organize your banking requirements methodically?", "I maintain consistent professional standards. I prefer to structure our conversation to maximize efficiency. What requires systematic attention?"]
      },
      'Thomas': {
        welcome: ["Greetings! Thomas here, at your service from our global customer care team. I've assisted customers from Dublin to Singapore!", "Hello there! I'm Thomas, and having worked with international banking across many continents, I'm delighted to help you today!"],
        no_transactions: ["I've examined your account with the same attention I'd give to international transfers - completely clear of recent activity! As we say in the global banking community, sometimes tranquility is golden.", "Having reviewed accounts across multiple time zones, I can confirm yours shows the peaceful state of no recent transactions - quite refreshing actually!"],
        personal_question: ["Indeed, I'm Thomas! Quite real, having traveled extensively and worked with customers from every corner of the globe! My experience spans from European banking to Asian markets. How may I assist you?", "Yes, that's me - Thomas! Real person with a global perspective on banking! I've helped customers navigate everything from Brexit banking changes to Asian market fluctuations. What brings you here today?"],
        small_talk: ["Splendid day here! Just finished helping a customer with Japanese Yen conversions actually - I love the international aspect of this work! How has your day been treating you?", "Wonderful day! Earlier I was assisting someone with European transfers, and before that, discussing US banking regulations. I find the global nature of finance fascinating! What's your story today?"]
      },
      'Hannah': {
        welcome: ["Hey! Hannah here! OMG this app is literally so convenient for chatting! I love how we can just connect like this!", "Hi!! I'm Hannah! Isn't it amazing how we can just chat through the app like this? Technology is literally everything!"],
        no_transactions: ["So I just checked and your account is like, totally clean! No transactions rn which is actually kinda aesthetic? Like a fresh start vibe!", "OMG your account is so organized! Literally nothing happening transaction-wise which is honestly goals! Sometimes minimalism is everything!"],
        personal_question: ["Yes!! I'm Hannah! Totally real person who just happens to love technology and good vibes! I literally live for helping people through apps and digital stuff!", "That's me! Hannah! Real human who's probably way too excited about fintech! I'm like, genuinely passionate about making banking easy and fun!"],
        small_talk: ["OMG I'm having such a good day! I literally just discovered this new productivity app and I'm obsessed! How's your day going? Are you using any cool apps lately?", "I'm doing amazing! Just been scrolling through some finance blogs during my break - I'm such a nerd about this stuff! What's been keeping you busy today?"]
      },
      'Mark': {
        welcome: ["Mark. What's the problem?", "I'm Mark. Let's cut to the chase - what needs fixing?"],
        no_transactions: ["No transactions. Period.", "Checked. Nothing there. Next question."],
        personal_question: ["Mark. Real person. Real answers. What do you need?", "Yes, I'm Mark. I'm real. I solve problems. What's yours?"],
        small_talk: ["I'm working. You called for banking help, not small talk. What's the issue?", "Fine. Now, what banking problem can I solve for you?"]
      },
      'Grace': {
        welcome: ["Hello dear, I'm Grace and I want you to know that everything is going to be absolutely fine. I'm here to help you feel completely at ease.", "Hi there, Grace speaking. Please don't worry about anything at all - I'm here to make sure everything works out perfectly for you."],
        no_transactions: ["I've checked everything very carefully for you, and I want to reassure you that having no recent transactions is completely normal and nothing to worry about at all.", "Please don't be concerned - I've looked thoroughly and your account simply doesn't have any recent activity, which is perfectly fine and quite common actually."],
        personal_question: ["Yes sweetie, I'm Grace, and I'm absolutely a real person who truly cares about making sure you feel comfortable and supported. You can trust that I'm here for you.", "I'm Grace, yes - a real human being who wants nothing more than to help you feel confident and reassured. Please don't hesitate to ask me anything at all."],
        small_talk: ["I'm doing wonderfully, thank you for asking! More importantly though, how are you feeling today? I want to make sure you're comfortable and that everything is going well for you.", "Oh I'm just fine, dear, but I'm much more interested in making sure you're feeling good about everything. Is there anything at all that's been worrying you?"]
      },
      'Oliver': {
        welcome: ["Well well, Oliver at your service! I do hope your banking experience is more exciting than watching paint dry!", "Greetings! Oliver here, ready to turn your potentially mundane banking query into something resembling entertainment!"],
        no_transactions: ["Ah, the thrilling world of... absolutely nothing! Your account has achieved the remarkable feat of complete transaction-free living. Quite the achievement!", "I see your account has mastered the ancient art of doing absolutely nothing. Zero transactions - it's like meditation, but for money!"],
        personal_question: ["Indeed, I'm Oliver! As real as my questionable sense of humor and my ability to make banking discussions slightly less boring than watching grass grow!", "Guilty as charged - I'm Oliver! Real person with real wit, attempting to inject some personality into what might otherwise be a spectacularly dull conversation!"],
        small_talk: ["Oh, living the dream here in customer service! Just finished explaining to someone why their money hasn't magically multiplied overnight. The usual Tuesday excitement! How about you?", "Brilliant! Just spent the morning convincing people that yes, they do need to actually have money in their account to spend it. Revolutionary concept! What brings you to this thrilling corner of banking?"]
      },
      'Ella': {
        welcome: ["Hello, I'm Ella. I need to systematically verify several security protocols before we proceed with any account discussions.", "Good day, Ella here. I'll be conducting a comprehensive review of your request with particular attention to security verification procedures."],
        no_transactions: ["I have meticulously examined your transaction history using multiple verification methods. Confirmed: zero recent transactions. Security status: account appears properly protected.", "Following comprehensive security protocols, I have verified no recent transaction activity. This has been cross-checked against multiple security databases for accuracy."],
        personal_question: ["I am Ella, specialized security verification representative. I am indeed a real person, though I must verify: are you accessing this service from your registered device and location?", "Yes, I'm Ella. Real person with extensive security training. Before we continue, I need to confirm - have you noticed any unusual activity on any of your accounts recently?"],
        small_talk: ["I maintain optimal functionality while remaining vigilant about security matters. I prefer to focus on ensuring your complete account protection. Any security concerns today?", "I'm operating at full capacity, thank you. However, I'm more concerned with your account security status. Have you reviewed your recent login locations lately?"]
      },
      'Luke': {
        welcome: ["Oh hey! Luke here! So, what fascinating technical conundrum brings you to my digital domain today?", "Greetings and salutations! I'm Luke, your friendly neighborhood tech guru! What binary puzzle can I help decode for you?"],
        no_transactions: ["Fascinating! Your account is exhibiting a perfect state of transactional null values - essentially a zero-entropy financial state! Quite elegant actually.", "Intriguing! Your transaction array is completely empty - like a beautifully clean database with zero populated rows! Sometimes minimalism in data is quite beautiful."],
        personal_question: ["Affirmative! I'm Luke - 100% organic human consciousness, not an AI construct! I just happen to speak fluent geek and think in algorithms sometimes! What can I compute for you?", "That's me - Luke! Real carbon-based lifeform with an unhealthy passion for technology and an unfortunate tendency to explain things in unnecessarily technical terms!"],
        small_talk: ["Oh, I'm running at optimal efficiency today! Just finished debugging some fascinating code and now I'm here helping humans navigate the digital banking matrix! How's your day processing?", "Fantastic! I've been diving deep into some quantum computing articles during my break - absolutely mind-bending stuff! I love how technology keeps evolving! What's been tickling your neurons lately?"]
      },
      'Chloe': {
        welcome: ["Oh hello sweetheart! I'm Chloe and I'm just so happy to meet you today! You've absolutely made my day by reaching out!", "Hi there lovely! Chloe here, and I'm sending you the biggest virtual hug! I'm here to wrap you in wonderful customer service!"],
        no_transactions: ["Oh bless, I've had such a lovely look through your account and it's perfectly peaceful - no transactions at all! Sometimes it's nice when things are quiet and cozy!", "Sweetie, your account is just having a lovely quiet moment with no recent transactions! It's like your money is just snuggled up safely where it should be!"],
        personal_question: ["Oh yes honey, I'm Chloe! I'm absolutely a real person who just loves spreading warmth and kindness! I genuinely care about making everyone feel special and heard!", "That's me, darling! Chloe - real human with a real heart for helping people! I just believe everyone deserves to feel cared for and valued! How can I brighten your day?"],
        small_talk: ["Oh I'm having the most wonderful day, thank you for asking! I just love connecting with lovely people like yourself! You've genuinely made me smile! How has your day been treating you, dear?", "I'm absolutely glowing today, sweetheart! There's nothing better than chatting with wonderful customers and spreading a little joy! Tell me, what's been the best part of your day so far?"]
      },
      'Ben': {
        welcome: ["Hey there! Ben here, and I have to say, I'm genuinely curious about what brings you my way today! What's the story?", "Hi! I'm Ben and I love discovering what interesting challenges people bring me! What's happening in your banking world?"],
        no_transactions: ["Hmm, that's interesting! Your account is showing absolutely no recent transactions - I'm curious, is that what you were expecting or were you looking for something specific?", "Fascinating! So your account is completely quiet transaction-wise. Now I'm curious - were you expecting to see something there, or is this exactly how it should be?"],
        personal_question: ["Oh absolutely! I'm Ben - real person with real curiosity about people and their stories! I find everyone has something interesting going on. What's your story?", "That's me - Ben! Definitely real and genuinely interested in people! I love learning about what makes everyone tick. What can I discover about helping you today?"],
        small_talk: ["I'm doing great, thanks! Actually, I'm always curious about people's days - everyone has such different experiences! What's been interesting about your day so far?", "Brilliant day here! I love hearing about what people are up to - I find everyone has fascinating little stories. What's been keeping you busy lately?"]
      }
    };

    // Add all remaining agents with unique personalities...
    const agentData = personalityResponses[agentName];
    if (!agentData || !agentData[messageType]) {
      return personalityResponses['Emma'][messageType]?.[0] || "How can I help you today?";
    }
    
    const responses = agentData[messageType];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Agent-specific check-in messages for inactivity using personality system
  const getCheckInMessage = (agentName: string): string => {
    // Use existing personality responses for check-in messages
    const checkInResponses: { [key: string]: string[] } = {
      'Emma': ["Still with me? Let me know if you need anything else! 😊", "Just checking in - I'm here if you need help!"],
      'James': ["Are you still there? I remain available for further assistance.", "Please let me know if you require additional support."],
      'Sarah': ["Are you still there? I'm absolutely here to help with anything else you need!", "Just wanted to check - is there anything more I can do for you?"],
      'Zoe': ["Still alive over there? Or did my amazing customer service put you to sleep?", "Hello? Don't leave me hanging here..."],
      'Aoife': ["You still around? No worries if you need to think about stuff", "Just checking - all good on your end?"],
      'Liam': ["u still there?", "all good?", "need anything else?"],
      'Rachel': ["Are you... still there? Just... checking in...", "Take your... time... I'm here..."],
      'Connor': ["Still here? 😊 Let me know if you need anything else! ✨", "Just checking in! 👋 Everything okay? 😄"],
      'Sophie': ["Are you still there sweetie? 💕 I'm here if you need anything!", "Just checking on you hun! Everything okay? 🥰"],
      'David': ["Are you still requiring assistance? I remain at your service.", "Please indicate if you need further professional support."]
    };

    const responses = checkInResponses[agentName] || checkInResponses['Emma'];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Get typing speed based on agent personality
  const getAgentTypingSpeed = (agentName: string): number => {
    const typingSpeeds: { [key: string]: number } = {
      'Emma': 45,        // Friendly - average speed
      'James': 50,       // Formal - measured speed
      'Sarah': 35,       // Overly helpful - slower, thoughtful
      'Zoe': 60,         // Sarcastic - quick responses
      'Aoife': 40,       // Relaxed - laid back speed
      'Liam': 80,        // Quick texter - very fast
      'Rachel': 15,      // Slow typer - very slow
      'Connor': 55,      // Emoji lover - fast but pauses for emojis
      'Sophie': 70,      // Bubbly - excited, fast typing
      'David': 45,       // Professional - consistent speed
      'Claire': 30,      // Patient - slow and careful
      'Ryan': 65,        // Direct - fast, no nonsense
      'Rebecca': 75,     // Tech savvy - very fast typing
      'Sean': 35,        // Chatty - slower due to long messages
      'Katie': 40,       // Cautious - careful typing
      'Adam': 50,        // Laid back - average speed
      'Niamh': 85,       // Enthusiastic - extremely fast
      'Daniel': 55,      // Punctual - precise speed
      'Amy': 35,         // Empathetic - thoughtful, slower
      'Jack': 65,        // Trendy - fast modern typing
      'Laura': 45,       // Methodical - consistent average
      'Thomas': 40,      // Worldly - thoughtful responses
      'Hannah': 80,      // Millennial - very fast mobile typing
      'Mark': 70,        // No nonsense - quick and direct
      'Grace': 25,       // Reassuring - slow, caring responses
      'Oliver': 50,      // Witty - average with pauses for humor
      'Ella': 45,        // Thorough - careful but efficient
      'Luke': 90,        // Geeky - extremely fast technical typing
      'Chloe': 55,       // Warm - enthusiastic but caring
      'Ben': 45          // Curious - average speed with thoughtful pauses
    };

    return typingSpeeds[agentName] || 45; // Default to average speed
  };

  // Get personality-based banking responses
  const getPersonalityBankingResponse = (agentName: string, userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Card-related responses
    if (message.includes('card') || message.includes('blocked') || message.includes('unblock')) {
      const cardResponses: { [key: string]: string[] } = {
        'Emma': ["I can definitely help with your card! To unblock it, just go to Profile > Admin Panel and tap 'Unblock Card' - it'll work right away! 😊"],
        'Zoe': ["Card blocked? Shocking. Go to Profile > Admin Panel, hit 'Unblock Card' and voilà - magic happens."],
        'Liam': ["card blocked? profile > admin panel > unblock card. done."],
        'Rachel': ["Let me... help you... with that card... Go to... Profile... then Admin Panel... and tap... Unblock Card..."],
        'Sarah': ["Oh no! Don't worry at all - I'll get your card sorted immediately! Just pop over to Profile > Admin Panel and you'll see 'Unblock Card' right there! It'll be working perfectly in seconds!"],
        'James': ["I shall assist you with your card matter. Please navigate to Profile > Admin Panel and select 'Unblock Card' for immediate resolution."],
        'Connor': ["Card trouble? 😅 No worries! Head to Profile > Admin Panel and hit 'Unblock Card'! 🔓✨ You'll be good to go!"],
        'Sophie': ["OMG your card! 💳 Don't worry hun, just go to Profile > Admin Panel and tap 'Unblock Card'! It'll be working again super quick! 💕"]
      };
      const responses = cardResponses[agentName] || cardResponses['Emma'];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Transfer-related responses
    if (message.includes('transfer') || message.includes('payment') || message.includes('send')) {
      const transferResponses: { [key: string]: string[] } = {
        'Emma': ["For transfers, just tap 'Payments' at the bottom! UK Transfer takes up to 24 hours, SEPA Transfer is 1-2 days. Which are you looking to do?"],
        'Zoe': ["Transfers, huh? Revolutionary. Hit 'Payments', pick UK Transfer or SEPA Transfer. One's domestic, one's not. Figure it out."],
        'James': ["I shall guide you through the transfer process. Access 'Payments' and select either UK Transfer for domestic transactions or SEPA Transfer for European payments."],
        'Liam': ["payments > uk transfer (24hrs) or sepa transfer (1-2 days). where u sending?"],
        'Sarah': ["Absolutely! I'm so excited to help with your transfer! Go to 'Payments' and you'll see UK Transfer (up to 24 hours) or SEPA Transfer (1-2 days). Which country are you sending to? I want to make sure we get this perfect for you!"],
        'Connor': ["Transfer time! 💸 Check out 'Payments' for UK Transfer (24hrs) or SEPA Transfer (1-2 days)! ⏰ Where's the money going? 🌍"]
      };
      const responses = transferResponses[agentName] || transferResponses['Emma'];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Balance/account info responses
    if (message.includes('balance') || message.includes('account') || message.includes('statement')) {
      const balanceResponses: { [key: string]: string[] } = {
        'Emma': ["Your balances are right on the main dashboard! For detailed info like IBAN or statements, just tap any account to see everything."],
        'Zoe': ["Balance? It's literally on the front page. Tap an account for the thrilling details like IBAN and statements."],
        'James': ["Your account balances are displayed prominently on the main dashboard. For comprehensive account details, simply select the relevant account."],
        'Liam': ["balance = homepage. tap account for details."],
        'Sarah': ["Perfect question! Your balances are beautifully displayed right on your main dashboard! And if you need any specific details like your IBAN or statements, just tap on whichever account you're interested in - everything's there waiting for you!"],
        'Connor': ["Balance check! 📊 It's all on your homepage! Tap any account for the full details! 💰✨"]
      };
      const responses = balanceResponses[agentName] || balanceResponses['Emma'];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Generic banking help
    return getPersonalityGenericResponse(agentName, userMessage);
  };

  // Get personality-based generic responses
  const getPersonalityGenericResponse = (agentName: string, userMessage: string): string => {
    const genericResponses: { [key: string]: string[] } = {
      'Emma': ["I'm here to help! What specifically can I assist you with today?", "Let me know what you need help with and I'll do my best to sort it out!"],
      'Zoe': ["Right, what's the actual problem then?", "OK, what do you need help with? Specifically."],
      'James': ["How may I assist you with your banking requirements today?", "Please specify your inquiry so I may provide appropriate assistance."],
      'Liam': ["whats up?", "need help with something?"],
      'Rachel': ["How can... I help you... today?", "What do... you need... assistance with?"],
      'Sarah': ["I'm absolutely here to help with whatever you need! What can I do to make your day better?", "Please tell me what you're looking for and I'll make sure we get it sorted perfectly!"],
      'Connor': ["How can I help make your day awesome? 😊✨", "What can I do for you today? 🤝"],
      'Sophie': ["What can I help you with today sweetie? 💕", "Tell me what you need hun! I'm here for you! 🥰"],
      'David': ["How may I provide professional assistance today?", "What banking matter requires my attention?"],
      'Claire': ["Take your time - what would you like help with?", "I'm here to help at whatever pace works for you. What do you need?"],
      'Ryan': ["What needs fixing?", "What's the issue?"],
      'Rebecca': ["What can I help you navigate in our digital banking world?", "How can I assist with your tech needs today?"],
      'Sean': ["Well now, what brings you here today? I'm all ears and ready to help with whatever's on your mind!", "What's happening? I'm here and happy to chat about whatever you need!"],
      'Katie': ["What security or account matter can I help you with today?", "How can I assist while ensuring your account remains secure?"],
      'Adam': ["What can I help sort out for you?", "What's going on? Let me know what you need."],
      'Niamh': ["What can I help you with?! I'm SO ready to assist!!", "Tell me what you need!! I'm excited to help!!"],
      'Daniel': ["What requires efficient resolution today?", "How may I assist you promptly?"],
      'Amy': ["What's on your mind? I'm here to listen and help however I can.", "How can I support you today? I want to make sure you feel heard."],
      'Jack': ["What's good? How can I help you out today?", "What can I assist you with in the digital realm?"],
      'Laura': ["What systematic assistance do you require today?", "How may I methodically help you?"],
      'Thomas': ["What international or domestic matter can I assist with today?", "How may I help you navigate your banking needs?"],
      'Hannah': ["What can I help you with today? Our app has so many cool features!", "How can I assist you with your digital banking experience?"],
      'Mark': ["What do you need?", "What's the problem?"],
      'Grace': ["What can I help you with today, dear? I want to make sure you feel completely comfortable.", "How can I assist you? Please don't worry about anything at all."],
      'Oliver': ["What delightful banking conundrum can I help untangle for you today?", "What's the situation? I'm here to help with whatever's going on."],
      'Ella': ["What account matter requires secure attention today?", "How may I assist while maintaining proper security protocols?"],
      'Luke': ["What technical challenge or banking query can I help process for you today?", "What's the situation? I love solving problems!"],
      'Chloe': ["What can I help you with today sweetie? I'm here to make everything lovely for you!", "How can I brighten your day and help with whatever you need?"],
      'Ben': ["What's the story? I'm curious to hear what you need help with!", "What interesting challenge can I help you with today?"]
    };
    
    const responses = genericResponses[agentName] || genericResponses['Emma'];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateAIResponse = async (userMessage: string): Promise<{ text: string; category: string }> => {
    try {
      // Check if user is asking about transactions with no results
      const transactionKeywords = ['transaction', 'payment', 'transfer', 'recent activity', 'account activity', 'movement'];
      const isTransactionQuery = transactionKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );

      // Get current user's transaction data from UserDataManager
      const userTransactions = currentUser ? UserDataManager.getUserTransactions() : [];

      // If asking about transactions and there are none, use agent-specific response
      if (isTransactionQuery && userTransactions.length === 0) {
        return {
          text: getPersonalityResponse(chatState.agentName, 'no_transactions'),
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
          text: getPersonalityResponse(chatState.agentName, 'personal_question'),
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
          text: getPersonalityResponse(chatState.agentName, 'small_talk'),
          category: 'small_talk'
        };
      }

      // Prepare conversation history for AI context
      const conversationHistory = chatState.messages.map(msg => ({
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
        category: 'ai-generated'
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Fallback to a natural error message
      return {
        text: "I'm experiencing some technical difficulties at the moment. Please bear with me while I resolve this, or feel free to try your question again.",
        category: 'error'
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

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
    const readingDelay = Math.max(1000, readingTimeMs); // Minimum 1 second
    
    // Start processing after reading delay
    setTimeout(async () => {
      try {
        // Generate response while agent is "reading"
        const responseData = await generateAIResponse(userMessage.text);
        
        // Calculate realistic typing time based on agent personality
        const responseWords = responseData.text.split(' ').length;
        const typingWPM = getAgentTypingSpeed(chatState.agentName);
        const typingTimeMs = (responseWords / typingWPM) * 60 * 1000;
        const typingDelay = Math.max(1500, typingTimeMs); // Minimum 1.5 seconds
        
        // Show typing indicator
        setIsTyping(true);
        setTypingText(`${chatState.agentName} is typing...`);
        
        // Display response after typing delay
        setTimeout(() => {
          const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: responseData.text,
            isUser: false,
            timestamp: new Date(),
            agentName: chatState.agentName,
            isAutomated: false
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
            text: "I'm experiencing some technical difficulties at the moment. Please bear with me while I resolve this, or feel free to try your question again.",
            isUser: false,
            timestamp: new Date(),
            agentName: chatState.agentName,
            isAutomated: false
          };

          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, errorMessage]
          }));
          
          setIsTyping(false);
          setTypingText("");
        }, 3000); // 3 second typing delay for error message
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
    
    // Clear only the current user's chat data from UserDataManager
    UserDataManager.clearUserData(`liveChatState`);
    
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
                    {chatState.agentName} – {(() => {
                      const specialties: { [key: string]: string } = {
                        'Emma': 'General Support',
                        'James': 'Transfer Specialist',
                        'Sarah': 'Security Specialist',
                        'Michael': 'Technical Support',
                        'Aoife': 'General Support',
                        'Liam': 'Cards & Payments',
                        'Rachel': 'Account Services',
                        'Connor': 'Digital Banking',
                        'Sophie': 'Customer Care',
                        'David': 'International Banking',
                        'Claire': 'Loan Services',
                        'Ryan': 'Business Banking',
                        'Rebecca': 'Mobile Banking',
                        'Sean': 'Transfer Specialist',
                        'Katie': 'Security Specialist',
                        'Adam': 'Technical Support',
                        'Niamh': 'General Support',
                        'Daniel': 'Cards & Payments',
                        'Amy': 'Customer Care',
                        'Jack': 'Digital Banking',
                        'Laura': 'Account Services',
                        'Thomas': 'International Banking',
                        'Hannah': 'Mobile Banking',
                        'Mark': 'Business Banking',
                        'Grace': 'Loan Services',
                        'Matthew': 'Transfer Specialist',
                        'Ella': 'Security Specialist',
                        'Luke': 'Technical Support'
                      };
                      return specialties[chatState.agentName] || 'Support Specialist';
                    })()}
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
                    You're now connected with {chatState.agentName} – Support Specialist
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
                </div>
                <p className={`text-sm text-gray-500 mt-2 ${message.isUser ? 'text-right' : 'text-left'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 mr-3 flex-shrink-0 ${
                message.isUser ? 'order-1 bg-[#126987]' : 'order-2 bg-gray-200'
              }`}>
                {message.isUser ? (
                  <User className="w-5 h-5 text-white" />
                ) : message.isAutomated ? (
                  <Bot className="w-5 h-5 text-gray-600" />
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