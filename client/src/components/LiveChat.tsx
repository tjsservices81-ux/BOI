import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, User, Bot } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";
import { getUserCurrency, type Currency } from "../utils/currencyUtils";

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
  responses: string[];
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
  lastResponseIndex: { [key: string]: number };
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

  // Professional Bank of Ireland agent names
  const agentNames = [
    'Emma', 'James', 'Sarah', 'Michael', 'Aoife', 'Liam', 'Rachel', 'Connor', 
    'Sophie', 'David', 'Claire', 'Ryan', 'Rebecca', 'Sean', 'Katie', 'Adam', 
    'Niamh', 'Daniel', 'Amy', 'Jack', 'Laura', 'Thomas', 'Hannah', 'Mark', 
    'Grace', 'Oliver', 'Ella', 'Luke', 'Chloe', 'Ben'
  ];

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

  // Professional Bank of Ireland representative responses
  const getProfessionalResponse = (messageType: string): string => {
    const responses = {
      welcome: [
        "You're speaking with a Bank of Ireland representative. How can I assist you today?",
        "Hello, this is a Bank of Ireland representative. How may I help you with your banking needs?",
        "Good day, you're connected to Bank of Ireland customer service. What can I assist you with?"
      ],
      no_transactions: [
        "I've reviewed your account and there are no recent transactions to display.",
        "After checking your account activity, I can confirm there are no recent transactions.",
        "Your account shows no recent transaction activity at this time."
      ],
      personal_question: [
        "I'm a Bank of Ireland customer service representative. How can I assist you with your account today?",
        "Yes, I'm here to help with your Bank of Ireland services. What do you need assistance with?",
        "I'm a Bank of Ireland representative. Please let me know how I can help with your banking needs."
      ],
      small_talk: [
        "I'm here to help with Bank of Ireland services. Please let me know how I can assist with your account or transactions.",
        "Thank you for asking. How can I help you with your banking needs today?",
        "I'm here to assist with your Bank of Ireland account. What do you need help with?"
      ],
      off_topic: [
        "I'm here to help with Bank of Ireland services. Please let me know how I can assist with your account or transactions."
      ]
    };

    const categoryResponses = responses[messageType as keyof typeof responses];
    if (categoryResponses && categoryResponses.length > 0) {
      return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    }
    
    return "You're speaking with a Bank of Ireland representative. How can I assist you today?";
  };

  // Professional banking response function with natural language understanding
  const getBankingResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Check for off-topic content first
    const bankingKeywords = ['bank', 'account', 'transfer', 'balance', 'card', 'payment', 'transaction', 'money', 'iban', 'sort code', 'loan', 'deposit', 'atm', 'pin', 'statement', 'overdraft'];
    const hasBankingKeyword = bankingKeywords.some(keyword => message.includes(keyword));
    
    if (!hasBankingKeyword) {
      return "I'm here to help with Bank of Ireland services. Please let me know how I can assist with your account or transactions.";
    }
    
    // Card-related responses (flexible matching)
    if (message.includes('card') || message.includes('blocked') || message.includes('unblock') || 
        message.includes('block') || message.includes('freeze') || message.includes('debit') || 
        message.includes('credit card')) {
      return "I can help with your card. To unblock a card, go to Profile > Admin Panel and select 'Unblock Card'. This will restore access immediately.";
    }
    
    // Transfer-related responses (flexible matching)
    if (message.includes('transfer') || message.includes('send money') || message.includes('payment') ||
        message.includes('sent money') || message.includes('send cash') || message.includes('wire') ||
        message.includes('pay someone') || message.includes('move money')) {
      return "For transfers, you can send money to UK accounts (24 hours processing) or SEPA transfers (1 business day). Would you like help with a specific transfer?";
    }
    
    // Balance/account info responses (flexible matching)
    if (message.includes('balance') || message.includes('statement') || message.includes('account info') ||
        message.includes('how much') || message.includes('account details') || message.includes('iban') ||
        message.includes('sort code') || message.includes('account number')) {
      return "Your account balances are displayed on the main dashboard. Tap any account to view detailed information including IBAN and statements.";
    }
    
    // Transaction history (flexible matching)
    if (message.includes('transaction') || message.includes('history') || message.includes('recent activity') ||
        message.includes('last payment') || message.includes('where is my') || message.includes('recent transfers') ||
        message.includes('sent earlier') || message.includes('paid today')) {
      return "Transaction history is available on your main dashboard. You can view all recent account activity and detailed transaction information there.";
    }
    
    // Login/access issues (flexible matching)
    if (message.includes('login') || message.includes('access') || message.includes('locked out') ||
        message.includes('sign in') || message.includes('log in') || message.includes('password') ||
        message.includes('pin') || message.includes('cant get in')) {
      return "For account access issues, please ensure you're using the correct customer number and PIN. If you need assistance, I can help verify your account details.";
    }

    // ATM issues
    if (message.includes('atm') || message.includes('cash machine') || message.includes('withdraw')) {
      return "For ATM issues, your daily withdrawal limit is €300. If you're having trouble accessing cash, please check if your card is blocked or contact your local branch.";
    }
    
    // General banking help
    return "I'm here to help with your Bank of Ireland account. Could you please specify what you need assistance with - transfers, balance inquiries, card issues, or something else?";
  };

  // Initialize currency preference
  useEffect(() => {
    setUserCurrency(getUserCurrency());
  }, []);

  // Load persisted chat state when component opens
  useEffect(() => {
    if (isOpen && currentUser) {
      const userChatKey = `liveChatState_${currentUser}`;
      const saved = localStorage.getItem(userChatKey);
      
      if (saved) {
        try {
          const parsedState = JSON.parse(saved);
          if (parsedState && parsedState.isActive && parsedState.queueStatus !== 'ended') {
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
        } catch (error) {
          console.error('Error parsing chat state:', error);
        }
      }
      
      setChatState(initializeFreshChat());
    }
  }, [isOpen, currentUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, isTyping]);

  // Save chat state to localStorage
  useEffect(() => {
    if (currentUser && chatState.isActive) {
      const userChatKey = `liveChatState_${currentUser}`;
      localStorage.setItem(userChatKey, JSON.stringify(chatState));
    }
  }, [chatState, currentUser]);

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
        }, waitTime - 8000);
      }
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, waitTime - elapsed);
        
        setQueueTimeRemaining(remaining);
        
        if (remaining <= 0) {
          setIsTyping(true);
          setTypingText(`${chatState.agentName} is typing...`);
          
          setTimeout(() => {
            setIsTyping(false);
            setChatState(prev => ({
              ...prev,
              queueStatus: 'connected',
              isInQueue: false
            }));
            
            setTimeout(() => {
              const welcomeText = getProfessionalResponse('welcome');
              
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
              }, 2000);
            }, 1000);
          }, 3000);
          
          if (queueTimerRef.current) {
            clearInterval(queueTimerRef.current);
            queueTimerRef.current = null;
          }
        }
      };
      
      updateTimer();
      queueTimerRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (queueTimerRef.current) {
        clearInterval(queueTimerRef.current);
        queueTimerRef.current = null;
      }
    };
  }, [chatState.queueStatus, chatState.estimatedWaitTime, chatState.queueStartTime, chatState.agentName]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || chatState.queueStatus !== 'connected') return;

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

    const userMessageText = inputText.trim();
    setInputText("");

    // Simulate realistic typing delay
    setIsTyping(true);
    setTypingText(`${chatState.agentName} is typing...`);

    setTimeout(() => {
      let botResponse: string;
      
      // Check for personal questions about the agent
      if (userMessageText.toLowerCase().includes('are you real') || 
          userMessageText.toLowerCase().includes('are you a person') ||
          userMessageText.toLowerCase().includes('human') ||
          userMessageText.toLowerCase().includes('bot')) {
        botResponse = getProfessionalResponse('personal_question');
      }
      // Check for small talk
      else if (userMessageText.toLowerCase().includes('how are you') || 
               userMessageText.toLowerCase().includes('how\'s your day') ||
               userMessageText.toLowerCase().includes('good morning') ||
               userMessageText.toLowerCase().includes('good afternoon')) {
        botResponse = getProfessionalResponse('small_talk');
      }
      // Use banking response system for everything else
      else {
        botResponse = getBankingResponse(userMessageText);
      }

      const botMessage: ChatMessage = {
        id: Date.now().toString(),
        text: botResponse,
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
    }, Math.random() * 2000 + 1000); // 1-3 second delay
  };

  const handleEndChat = () => {
    setIsEndingChat(true);
    setEndChatCountdown(5);
    
    endChatTimerRef.current = setInterval(() => {
      setEndChatCountdown(prev => {
        if (prev <= 1) {
          // End the chat
          setChatState(prev => ({
            ...prev,
            queueStatus: 'ended',
            isActive: false
          }));
          
          if (currentUser) {
            const userChatKey = `liveChatState_${currentUser}`;
            localStorage.removeItem(userChatKey);
          }
          
          setIsEndingChat(false);
          setShowEndChatConfirm(false);
          
          setTimeout(() => {
            setIsAnimating(true);
            setTimeout(() => {
              onClose();
              setIsAnimating(false);
            }, 300);
          }, 1000);
          
          if (endChatTimerRef.current) {
            clearInterval(endChatTimerRef.current);
            endChatTimerRef.current = null;
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelEndChat = () => {
    setIsEndingChat(false);
    setShowEndChatConfirm(false);
    if (endChatTimerRef.current) {
      clearInterval(endChatTimerRef.current);
      endChatTimerRef.current = null;
    }
  };

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className={`bg-white rounded-t-2xl w-full max-w-md h-[600px] flex flex-col transition-all duration-300 ${isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}>
        {/* Chat Header */}
        <div className="bg-[#126987] text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Bank of Ireland Support
              </h3>
              <div className="flex items-center space-x-2">
                {chatState.queueStatus === 'connected' && (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm opacity-90">{chatState.agentName}</span>
                  </>
                )}
                {chatState.queueStatus === 'waiting' && (
                  <>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-sm opacity-90">Connecting...</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {chatState.queueStatus === 'connected' && (
              <button
                onClick={() => setShowEndChatConfirm(true)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                disabled={isEndingChat}
              >
                End Chat
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatState.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.isUser ? 'bg-[#126987] ml-2' : 'bg-gray-300 mr-2'}`}>
                  {message.isUser ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className={`p-3 rounded-2xl ${message.isUser ? 'bg-[#126987] text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <p className="text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {message.text}
                  </p>
                  <div className={`text-xs mt-1 ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {message.agentName && !message.isUser && ` • ${message.agentName}`}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2 max-w-[80%]">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 p-3 rounded-2xl">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{typingText}</div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* End Chat Confirmation */}
        {showEndChatConfirm && (
          <div className="bg-yellow-50 border-t border-yellow-200 p-4">
            <div className="text-center">
              <p className="text-sm text-yellow-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {isEndingChat 
                  ? `Ending chat in ${endChatCountdown} seconds...`
                  : "Are you sure you want to end this chat session?"
                }
              </p>
              {!isEndingChat && (
                <div className="flex space-x-3">
                  <button
                    onClick={handleEndChat}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    Yes, End Chat
                  </button>
                  <button
                    onClick={cancelEndChat}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {isEndingChat && (
                <button
                  onClick={cancelEndChat}
                  className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Input */}
        {chatState.queueStatus === 'connected' && !isEndingChat && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="bg-[#126987] text-white p-2 rounded-full hover:bg-[#0d4e63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}