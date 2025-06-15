import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, User, Bot } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  agentName?: string;
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
}

export default function LiveChat({ isOpen, onClose }: LiveChatProps) {
  const currentUser = UserDataManager.getCurrentUser();
  
  const [chatState, setChatState] = useState<ChatState>(() => {
    if (!currentUser) {
      // No user logged in - return inactive state
      return {
        messages: [],
        isActive: false,
        agentName: '',
        sessionId: '',
        lastResponseIndex: {},
        queueStatus: 'ended',
        queueStartTime: undefined,
        estimatedWaitTime: 0
      };
    }

    // Load user-specific chat state using customer number
    const userChatKey = `liveChatState_${currentUser}`;
    const saved = localStorage.getItem(userChatKey);
    
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        if (parsedState && parsedState.isActive) {
          return {
            ...parsedState,
            messages: parsedState.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })),
            queueStartTime: parsedState.queueStartTime ? new Date(parsedState.queueStartTime) : undefined
          };
        }
      } catch (error) {
        console.error('Error parsing chat state:', error);
      }
    }
    
    // Initialize new chat session for this specific user
    const agentNames = ['Mark', 'Sarah', 'James', 'Emma', 'David', 'Lisa'];
    const randomAgent = agentNames[Math.floor(Math.random() * agentNames.length)];
    
    // Generate random wait time between 1-2.5 minutes (60000-150000ms)
    const waitTime = Math.floor(Math.random() * 90000) + 60000;
    
    return {
      messages: [],
      isActive: true,
      agentName: randomAgent,
      sessionId: `chat_${currentUser}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastResponseIndex: {},
      queueStatus: 'waiting',
      queueStartTime: new Date(),
      estimatedWaitTime: waitTime
    };
  });

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [queueTimeRemaining, setQueueTimeRemaining] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, isTyping]);

  // Save user-specific chat state to persist across page navigation
  useEffect(() => {
    if (currentUser && chatState.isActive) {
      const userChatKey = `liveChatState_${currentUser}`;
      localStorage.setItem(userChatKey, JSON.stringify(chatState));
    }
  }, [chatState, currentUser]);

  // Queue timer effect
  useEffect(() => {
    if (chatState.queueStatus === 'waiting' && chatState.estimatedWaitTime && chatState.queueStartTime) {
      const startTime = chatState.queueStartTime.getTime();
      const waitTime = chatState.estimatedWaitTime;
      
      // Update remaining time every second
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, waitTime - elapsed);
        
        setQueueTimeRemaining(remaining);
        
        if (remaining <= 0) {
          // Connect to agent
          setChatState(prev => ({
            ...prev,
            queueStatus: 'connected'
          }));
          
          // Add welcome message from agent with realistic typing delay
          setTimeout(() => {
            const welcomeText = `Hi there! I'm ${chatState.agentName} from Bank of Ireland support. How can I help you today?`;
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
                agentName: chatState.agentName
              };
              
              setChatState(prev => ({
                ...prev,
                messages: [welcomeMessage]
              }));
              
              setIsTyping(false);
              setTypingText("");
            }, finalDelay);
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
  }, [chatState.queueStatus, chatState.estimatedWaitTime, chatState.queueStartTime, chatState.agentName]);

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
        "Let me sort that card problem for you. You can unblock your card through Profile > Admin Panel > 'Unblock Card'. It takes effect instantly, so you'll be able to use it straight away.",
        "I see you're having card troubles - that's frustrating! The quickest way to unblock it is through your Profile > Admin Panel. Look for the 'Unblock Card' option and it'll be working again in seconds.",
        "No problem at all, I'll walk you through unblocking your card. Navigate to Profile > Admin Panel and select 'Unblock Card' for instant activation. If you're still having issues after that, just let me know."
      ]
    },
    {
      id: '2',
      category: 'transfers',
      triggers: ['transfer money', 'send money', 'make transfer', 'how to transfer', 'payment', 'pending transfer', 'international transfer', 'swift code', 'iban transfer', 'uk transfer', 'transfer limit', 'transfer fee'],
      responses: [
        "Absolutely, I'll help you with transfers. For UK transfers, tap 'Payments' then 'UK Transfer' - these are usually instant and free between UK accounts. For international transfers, use 'IBAN Transfer' which typically takes 1-3 working days. What type of transfer are you looking to make?",
        "I can definitely help with that transfer. Use the 'Payments' section at the bottom - UK Transfer for domestic payments (instant and usually free) or IBAN Transfer for international (small fee applies, 1-3 days). Are you sending money within the UK or abroad?",
        "No problem! The transfer process is quite simple. Go to 'Payments' at the bottom of your screen. UK Transfer handles domestic payments instantly, while IBAN Transfer covers international payments with competitive exchange rates. Which country are you sending to?",
        "I'll walk you through the transfer options. In 'Payments', you'll see UK Transfer for domestic payments (instant, no fees) and IBAN Transfer for international (£2-15 fee depending on amount, arrives 1-3 working days). What's the destination for your transfer?"
      ]
    },
    {
      id: '3',
      category: 'account_info',
      triggers: ['check balance', 'account balance', 'how much money', 'balance', 'statement', 'iban', 'sort code', 'account number', 'account details', 'routing number'],
      responses: [
        "Your account balances are displayed right on the main dashboard when you log in. For detailed statements or account numbers, just tap on any account to see the full breakdown including IBAN and sort code.",
        "All your balances are visible on the homepage dashboard. If you need your IBAN, sort code, or detailed statements, tap on the specific account and you'll find all those details there.",
        "You can see all your account balances on the main screen. For account numbers, IBAN details, or monthly statements, just tap the account you're interested in - everything's there.",
        "Your current balances are shown on the dashboard. Need your account details like IBAN or sort code? Tap on any account and you'll see the full account information plus transaction history."
      ]
    },
    {
      id: '4',
      category: 'login_issues',
      triggers: ['forgot pin', 'reset pin', 'pin not working', 'pin problem', 'login issues', 'password reset', 'cant log in', "can't access", 'locked out', 'forgotten password'],
      responses: [
        "I understand how frustrating login issues can be. For security reasons, PIN resets need to be done through secure channels. You can visit any Bank of Ireland branch with photo ID, or call our customer service team at 0818 365 365 and they'll sort it out for you.",
        "Login problems are definitely annoying! For your security, PIN resets require verification at a branch with valid ID, or you can call our secure line at 0818 365 365 where the team can help reset it safely.",
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
        "Hello! I'm here to help with your banking needs. What can I assist you with today?",
        "Hi there! Welcome to Bank of Ireland support. How can I help you today?",
        "Good to see you! I'm ready to assist with any banking questions or issues you might have.",
        "Hello! Thanks for reaching out. What banking matter can I help you with today?"
      ]
    },
    {
      id: '9',
      category: 'thanks',
      triggers: ['thank you', 'thanks', 'appreciate', 'helpful'],
      responses: [
        "You're very welcome! Is there anything else I can help you with today?",
        "Happy to help! Feel free to reach out if you need any other assistance.",
        "Glad I could assist! Let me know if you have any other questions.",
        "You're welcome! I'm here if you need help with anything else."
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

  const generateAIResponse = async (userMessage: string): Promise<{ text: string; category: string }> => {
    try {
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
          customerNumber: currentUser
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
      messages: [...prev.messages, userMessage]
    }));
    
    setInputText("");
    setIsTyping(true);
    setTypingText(`${chatState.agentName} is typing...`);

    // Realistic typing delay based on message length
    const baseDelay = 800;
    const typingSpeed = 50; // ms per character
    const responseLength = Math.random() * 100 + 20; // Estimated response length
    const typingDelay = baseDelay + (responseLength * typingSpeed);

    setTimeout(async () => {
      try {
        const responseData = await generateAIResponse(userMessage.text);
        
        // Calculate realistic typing delay based on response length
        // 3-5 words per second = 200-333ms per word
        const words = responseData.text.split(' ').length;
        const wordsPerSecond = Math.random() * 2 + 3; // 3-5 words per second
        const realisticDelay = Math.max(1500, (words / wordsPerSecond) * 1000);
        
        // Add some natural variation (±20%)
        const variation = (Math.random() - 0.5) * 0.4;
        const finalDelay = realisticDelay * (1 + variation);
        
        setTypingText(`${chatState.agentName} is typing...`);
        
        setTimeout(() => {
          const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: responseData.text,
            isUser: false,
            timestamp: new Date(),
            agentName: chatState.agentName
          };

          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, botMessage]
          }));
          
          setIsTyping(false);
          setTypingText("");
        }, finalDelay);
      } catch (error) {
        console.error('Error in AI response handling:', error);
        // Create fallback response on error
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: "I'm experiencing some technical difficulties at the moment. Please bear with me while I resolve this, or feel free to try your question again.",
          isUser: false,
          timestamp: new Date(),
          agentName: chatState.agentName
        };

        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, errorMessage]
        }));
        
        setIsTyping(false);
        setTypingText("");
      }
    }, 800); // Brief delay before starting to type
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndChat = () => {
    if (!currentUser) return;
    
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
    
    // Close the chat completely
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md h-[85vh] max-h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-[#126987] rounded-t-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              {chatState.queueStatus === 'waiting' ? (
                <>
                  <h3 className="text-white font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Live Chat Support
                  </h3>
                  <p className="text-white/80 text-xs" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Connecting you to an agent...
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-white font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {chatState.agentName} – Support Specialist
                  </h3>
                  <p className="text-white/80 text-xs" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {isTyping ? typingText : 'Online now'}
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Queue status message */}
          {chatState.queueStatus === 'waiting' && (
            <div className="flex justify-center">
              <div className="bg-orange-50 text-orange-800 px-4 py-4 rounded-2xl text-sm text-center max-w-[90%] border border-orange-200">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse mr-2"></div>
                  <p className="font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    You're now in the queue
                  </p>
                </div>
                <p style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Please wait while we connect you to an available agent...
                </p>
                {queueTimeRemaining > 0 && (
                  <p className="text-xs text-orange-600 mt-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Estimated wait time: {Math.ceil(queueTimeRemaining / 1000 / 60)} minute{Math.ceil(queueTimeRemaining / 1000 / 60) !== 1 ? 's' : ''}
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
              <div className={`max-w-[80%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    message.isUser
                      ? 'bg-[#126987] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {message.text}
                  </p>
                </div>
                <p className={`text-xs text-gray-500 mt-1 ${message.isUser ? 'text-right' : 'text-left'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ml-2 mr-2 flex-shrink-0 ${
                message.isUser ? 'order-1 bg-[#126987]' : 'order-2 bg-gray-200'
              }`}>
                {message.isUser ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-gray-600" />
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
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          {chatState.queueStatus === 'connected' && (
            <div className="mb-3 flex justify-center">
              <button
                onClick={handleEndChat}
                className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                End Chat
              </button>
            </div>
          )}
          
          {chatState.queueStatus === 'waiting' ? (
            <div className="text-center">
              <p className="text-gray-500 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Please wait to be connected before sending messages...
              </p>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  disabled={isTyping}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="w-12 h-12 bg-[#126987] rounded-full flex items-center justify-center hover:bg-[#0d4e63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}