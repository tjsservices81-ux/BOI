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

    // Generate a fresh session ID for each new chat
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      messages: [],
      isActive: true,
      agentName: '',
      sessionId,
      lastResponseIndex: {},
      queueStatus: 'waiting' as const,
      queueStartTime: new Date(),
      estimatedWaitTime: Math.floor(Math.random() * 120000) + 60000 // 1-3 minutes
    };
  };

  const [chatState, setChatState] = useState<ChatState>(initializeFreshChat);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [queueTimeRemaining, setQueueTimeRemaining] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEndChatConfirm, setShowEndChatConfirm] = useState(false);
  const [isEndingChat, setIsEndingChat] = useState(false);
  const [endChatCountdown, setEndChatCountdown] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endChatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages]);

  // Load persisted chat state only if user exists and chat was already active
  useEffect(() => {
    if (!currentUser) return;
    
    const userChatKey = `liveChatState_${currentUser}`;
    const savedState = localStorage.getItem(userChatKey);
    
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        
        // Only restore if the session was actually active (not just ended)
        if (parsedState.isActive && parsedState.queueStatus !== 'ended') {
          setChatState(prev => ({
            ...prev,
            ...parsedState,
            queueStartTime: parsedState.queueStartTime ? new Date(parsedState.queueStartTime) : null
          }));
        }
      } catch (error) {
        console.error('Failed to restore chat state:', error);
      }
    }
  }, [currentUser, isOpen]);

  // Persist chat state to localStorage
  useEffect(() => {
    if (!currentUser) return;
    
    const userChatKey = `liveChatState_${currentUser}`;
    
    // Only persist if the chat is actually active
    if (chatState.isActive && chatState.queueStatus !== 'ended') {
      const persistentState = {
        ...chatState,
        queueStartTime: chatState.queueStartTime?.toISOString() || null
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
            // Natural, varied welcome messages that sound like real Bank of Ireland support staff
            const welcomeMessages: { [key: string]: string[] } = {
              'Emma': [
                `Hey there, you're through to the Bank of Ireland team — I'm Emma, how can I help you today?`,
                `Good to have you here — this is Emma from Bank of Ireland support, what can I do for you?`,
                `Hi, this is Emma here from Bank of Ireland — what can I help you with?`,
                `Hello, welcome to Bank of Ireland support. Emma speaking — how's your day going?`,
                `You've reached the Bank of Ireland team, Emma here — what brings you to chat today?`,
                `Hi there! Emma from Bank of Ireland support — what can I sort out for you?`,
                `Good day! This is Emma with Bank of Ireland — what's on your mind?`,
                `Hello there, Bank of Ireland support here — Emma speaking, how can I help?`,
                `Hi, Emma here from the Bank of Ireland team — what can I do for you today?`,
                `Hey! You're through to Bank of Ireland support, Emma speaking — how can I help?`
              ],
              'James': [
                `Hi there, James here from Bank of Ireland — how can I help you today?`,
                `Good to see you! I'm James from the Bank of Ireland support team — what can I do for you?`,
                `Hello, you've reached Bank of Ireland support — James speaking, what's going on?`,
                `Hey, this is James from Bank of Ireland — what can I help you with?`,
                `Hi there! James here from the support team — how can I assist you today?`,
                `Good day! You're through to James at Bank of Ireland — what brings you here?`,
                `Hello there, James from Bank of Ireland support — how's everything going?`,
                `Hi, you've got James from the Bank of Ireland team — what can I sort out for you?`,
                `Hey there! James speaking from Bank of Ireland support — what's up?`,
                `Good to have you here — I'm James from Bank of Ireland, how can I help?`
              ],
              'Sarah': [
                `Hi there, Sarah here from Bank of Ireland — what can I help you with today?`,
                `Hello! You've reached Sarah at Bank of Ireland support — how can I assist?`,
                `Good to see you! I'm Sarah from the Bank of Ireland team — what's going on?`,
                `Hi, this is Sarah from Bank of Ireland — how can I help you today?`,
                `Hey there! Sarah speaking from Bank of Ireland support — what brings you here?`,
                `Hello there, you're through to Sarah at Bank of Ireland — what can I do for you?`,
                `Good day! Sarah here from the support team — how can I help?`,
                `Hi there! You've got Sarah from Bank of Ireland — what's on your mind?`,
                `Hello, Sarah from Bank of Ireland support here — how's your day going?`,
                `Hey! This is Sarah from the Bank of Ireland team — what can I sort out for you?`
              ]
            };
            
            const agentNames = ['Emma', 'James', 'Sarah'];
            const selectedAgent = agentNames[Math.floor(Math.random() * agentNames.length)];
            const agentMessages = welcomeMessages[selectedAgent];
            const selectedMessage = agentMessages[Math.floor(Math.random() * agentMessages.length)];
            
            setChatState(prev => ({
              ...prev,
              agentName: selectedAgent
            }));
            
            const welcomeMessage: ChatMessage = {
              id: `msg_${Date.now()}`,
              text: selectedMessage,
              isUser: false,
              timestamp: new Date(),
              agentName: selectedAgent
            };
            
            setChatState(prev => ({
              ...prev,
              messages: [...prev.messages, welcomeMessage]
            }));
          }, 2000 + Math.random() * 3000); // 2-5 second delay for realism
          
          // Clear the timer
          if (queueTimerRef.current) {
            clearInterval(queueTimerRef.current);
            queueTimerRef.current = null;
          }
        }
      };
      
      // Initial update
      updateTimer();
      
      // Set up interval
      queueTimerRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (queueTimerRef.current) {
          clearInterval(queueTimerRef.current);
          queueTimerRef.current = null;
        }
      };
    }
  }, [chatState.queueStatus, chatState.estimatedWaitTime, chatState.queueStartTime]);

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
    <div 
      className="fixed bg-black bg-opacity-60 z-40 backdrop-animate-in" 
      style={{ 
        top: 0,
        left: 0,
        right: 0,
        bottom: '88px',
        height: 'calc(100vh - 88px)'
      }}
    >
      <div 
        className={`bg-white w-full chat-container shadow-2xl absolute ${
          isAnimating ? 'chat-animate-out' : 'chat-animate-in'
        }`}
        style={{ 
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          maxHeight: '100%'
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
              ) : chatState.queueStatus === 'connected' ? (
                <>
                  <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {chatState.agentName} – Support Specialist
                  </h3>
                  <p className="text-white/80 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Online now
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Live Chat Support
                  </h3>
                  <p className="text-white/80 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Available 24/7
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {(chatState.queueStatus === 'waiting' || chatState.queueStatus === 'connected') && (
              <button
                onClick={handleEndChatRequest}
                className="px-4 py-2 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors text-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                End Chat
              </button>
            )}
            <button
              onClick={handleCloseChat}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
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
                      ? 'bg-[#126987] text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-base leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {message.text}
                  </p>
                </div>
                <div className={`flex items-center mt-2 space-x-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  {!message.isUser && (
                    <div className="w-8 h-8 bg-[#126987] rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {!message.isUser && message.agentName && `${message.agentName} • `}
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {message.isUser && (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[75%]">
                <div className="bg-white text-gray-900 border border-gray-200 px-5 py-4 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {chatState.agentName} is typing...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        </div>

        {/* Input Area */}
        {chatState.queueStatus === 'connected' ? (
          <div className="chat-input-area bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#126987] focus:border-transparent text-base"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  disabled={chatState.queueStatus !== 'connected'}
                />
              </div>
              <button
                className="w-12 h-12 bg-[#126987] text-white rounded-2xl flex items-center justify-center hover:bg-[#0f5a75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!inputText.trim() || chatState.queueStatus !== 'connected'}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-input-area bg-gray-100 border-t border-gray-200 px-6 py-6">
            <div className="text-center">
              <p className="text-gray-500 text-base" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Please wait to be connected before sending messages...
              </p>
            </div>
          </div>
        )}

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
          <div className="absolute inset-0 bg-[#126987] flex items-center justify-center z-50">
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