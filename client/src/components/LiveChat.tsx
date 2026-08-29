import { useState, useRef, useEffect } from "react";
import { getAppDate } from "../utils/appTime";
import { X, Send, MessageCircle, User } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";
import { getUserCurrency, type Currency } from "../utils/currencyUtils";
import { getLocalChatResponse, buildChatContext } from "../utils/chatEngine";
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

    // Pool of agent names used for realism - every agent shares the same
    // professional Bank of Ireland customer-support tone (no personality variance).
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
          text: getCheckInMessage(chatState.agentName),
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
              const welcomeText = getWelcomeMessage(chatState.agentName);
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

  // Single, consistent professional welcome message - agent name varies, tone never does.
  const getWelcomeMessage = (agentName: string): string => {
    return `Hello, this is ${agentName} from Bank of Ireland Customer Support. How can I help you today?`;
  };

  // Single, consistent professional inactivity check-in message.
  const getCheckInMessage = (_agentName: string): string => {
    return "Are you still there? Let me know if you need anything else.";
  };

  // Human typing pace: varies a little per message (like a real person) but
  // capped so a longer reply never drags - it always feels responsive.
  const HUMAN_TYPING_WPM_MIN = 45;
  const HUMAN_TYPING_WPM_MAX = 70;
  const MIN_TYPING_DELAY_MS = 600;
  const MAX_TYPING_DELAY_MS = 3200;

  const getHumanTypingDelayMs = (responseText: string): number => {
    const words = responseText.split(/\s+/).filter(Boolean).length;
    const wpm = HUMAN_TYPING_WPM_MIN + Math.random() * (HUMAN_TYPING_WPM_MAX - HUMAN_TYPING_WPM_MIN);
    const rawMs = (words / wpm) * 60 * 1000;
    return Math.min(MAX_TYPING_DELAY_MS, Math.max(MIN_TYPING_DELAY_MS, rawMs));
  };

  const generateAIResponse = async (userMessage: string, messages: ChatMessage[]): Promise<{ text: string; category: string; pdfData?: string; pdfFileName?: string }> => {
    const conversationHistory = messages.map(msg => ({ text: msg.text, isUser: msg.isUser }));

    // Compute the local, rule-based reply first. It's instant, works offline,
    // and is the guaranteed fallback if the AI endpoint isn't available. When
    // the AI reply comes back it carries no PDF, so we keep the local reply's
    // PDF (e.g. a transfer confirmation) if the local engine produced one.
    const local = getLocalChatResponse(userMessage, conversationHistory);

    // Try the AI endpoint for a genuinely understood reply. The agent persona
    // (name, human tone) is preserved server-side. If AI isn't configured or
    // the call fails, the server returns { ok: false } and we use the local
    // reply so nothing ever breaks.
    try {
      const res = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          agentName: chatState.agentName,
          history: conversationHistory,
          context: buildChatContext(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && typeof data.text === 'string' && data.text.trim()) {
          return {
            text: data.text.trim(),
            category: 'ai',
            // Attach the local engine's PDF if it generated one (the AI reply
            // is text-only, but a "send me the receipt" ask should still work).
            pdfData: local.pdfData,
            pdfFileName: local.pdfFileName,
          };
        }
      }
    } catch (error) {
      // Network/parse failure - fall through to the local reply.
      console.warn('AI chat unavailable, using local engine:', error);
    }

    return {
      text: local.text,
      category: 'local',
      pdfData: local.pdfData,
      pdfFileName: local.pdfFileName,
    };
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
        // Show the typing indicator up front so there's never a dead gap while
        // the agent "thinks" (the AI reply can take a moment to come back).
        setIsTyping(true);
        setTypingText(`${chatState.agentName} is typing...`);

        // Generate response while agent is "reading/typing" - use captured messages for context
        const genStart = Date.now();
        const responseData = await generateAIResponse(userMessage.text, currentMessages);
        const genElapsed = Date.now() - genStart;

        // Calculate a natural, human-paced typing delay - varies per message
        // but never drags on. Subtract time already spent generating so the
        // typing indicator that showed during the wait counts toward it.
        const typingDelay = Math.max(200, getHumanTypingDelayMs(responseData.text) - genElapsed);

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
          height: 'calc(100dvh - 88px)',
          maxHeight: 'calc(100dvh - 88px)'
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
                  <p className="text-base leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif', whiteSpace: 'pre-line' }}>
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