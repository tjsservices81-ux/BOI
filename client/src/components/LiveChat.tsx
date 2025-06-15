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
  queueStatus: 'waiting' | 'connected' | 'ended';
  queueStartTime?: Date;
  estimatedWaitTime?: number;
}

export default function LiveChat({ isOpen, onClose }: LiveChatProps) {
  const [chatState, setChatState] = useState<ChatState>(() => {
    // Load persistent chat state
    const saved = UserDataManager.getUserData('liveChatState', null);
    if (saved) {
      return {
        ...saved,
        messages: saved.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };
    }
    
    // Initialize new chat session
    const agentNames = ['Mark', 'Sarah', 'James', 'Emma', 'David', 'Lisa'];
    const randomAgent = agentNames[Math.floor(Math.random() * agentNames.length)];
    
    // Generate random wait time between 1-2.5 minutes (60000-150000ms)
    const waitTime = Math.floor(Math.random() * 90000) + 60000;
    
    return {
      messages: [],
      isActive: true,
      agentName: randomAgent,
      sessionId: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  // Save chat state whenever it changes
  useEffect(() => {
    if (chatState.messages.length > 0 || !chatState.isActive) {
      UserDataManager.setUserData('liveChatState', chatState);
    }
  }, [chatState]);

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
      triggers: ['unblock card', 'card blocked', 'card not working', 'blocked card', 'card issue'],
      responses: [
        "I can help you with your card issue. To unblock your card, go to Profile > Admin Panel and tap 'Unblock Card'. Your card will be available immediately.",
        "Let me assist you with that card problem. You can unblock your card through Profile > Admin Panel > 'Unblock Card'. It takes effect right away.",
        "I see you're having card troubles. The quickest way to unblock it is through your Profile > Admin Panel. Look for the 'Unblock Card' option.",
        "No worries, I can guide you through unblocking your card. Navigate to Profile > Admin Panel and select 'Unblock Card' for instant activation."
      ]
    },
    {
      id: '2',
      category: 'transfers',
      triggers: ['transfer money', 'send money', 'make transfer', 'how to transfer', 'payment'],
      responses: [
        "For transfers, tap 'Payments' in the bottom menu. Choose 'UK Transfer' for domestic or 'IBAN Transfer' for international. Which type do you need?",
        "I can help with transfers! Go to 'Payments' at the bottom, then select UK Transfer for domestic or IBAN Transfer for international payments. What are you looking to do?",
        "Transfer process is straightforward - use the 'Payments' section at the bottom. UK Transfer handles domestic payments, IBAN Transfer covers international. Which suits your needs?",
        "Money transfers are easy through our 'Payments' feature. You'll find UK Transfer and IBAN Transfer options there. Are you sending domestically or internationally?"
      ]
    },
    {
      id: '3',
      category: 'balance',
      triggers: ['check balance', 'account balance', 'how much money', 'balance'],
      responses: [
        "Your account balances appear on the main dashboard. You can also tap any account for detailed transaction history and current balance.",
        "Check your balances right on the dashboard when you log in. Tap on any account to see more details and transaction history too.",
        "All your account balances are displayed on the main screen. For more detailed information, just tap on the specific account you're interested in.",
        "Your balances are visible on the dashboard homepage. Want to see transaction details? Just tap on any account for the full breakdown."
      ]
    },
    {
      id: '4',
      category: 'pin_issues',
      triggers: ['forgot pin', 'reset pin', 'pin not working', 'pin problem'],
      responses: [
        "For security, PIN resets require secure verification. Please visit your nearest Bank of Ireland branch with valid ID, or call customer service at 0818 365 365.",
        "PIN resets need to be handled securely. You can visit any Bank of Ireland branch with photo ID, or contact our customer service team at 0818 365 365.",
        "I understand PIN issues are frustrating. For your security, you'll need to visit a branch with valid ID or call our secure line at 0818 365 365 for reset assistance.",
        "PIN problems require secure authentication. Head to your local Bank of Ireland branch with ID, or give us a call at 0818 365 365 for secure PIN reset."
      ]
    },
    {
      id: '5',
      category: 'technical',
      triggers: ['app not working', 'technical issue', 'bug', 'error', 'crash', 'problem'],
      responses: [
        "Sorry you're experiencing technical difficulties. Try closing and reopening the app first. If issues persist, our technical support team can help further.",
        "That's frustrating! First, try force-closing and restarting the app. If the problem continues, our tech support team has additional troubleshooting steps.",
        "Technical issues can be annoying. Start by fully closing and reopening the app. Still having trouble? Our technical support can dig deeper into the issue.",
        "I apologize for the technical trouble. Please try restarting the app completely. If that doesn't resolve it, our tech team can provide more advanced solutions."
      ]
    },
    {
      id: '6',
      category: 'hours',
      triggers: ['opening hours', 'branch hours', 'when open', 'hours'],
      responses: [
        "Most Bank of Ireland branches operate Monday-Friday 10:00-16:00, with some offering extended hours. Use our ATM/Branch locator in the app for specific locations.",
        "Branch hours are typically Monday-Friday 10:00-16:00, though some locations have different schedules. Check the ATM/Branch locator for exact hours near you.",
        "Standard hours are Monday-Friday 10:00-16:00 for most branches. Some locations offer extended service. The app's branch locator shows specific hours for each location.",
        "You'll find most branches open Monday-Friday 10:00-16:00. For precise hours and locations, use the ATM/Branch locator feature in your app."
      ]
    },
    {
      id: '7',
      category: 'fees',
      triggers: ['fees', 'charges', 'cost', 'how much', 'price'],
      responses: [
        "Transaction fees depend on transfer type and destination. UK transfers typically cost less than international ones. You'll see all fees before confirming.",
        "Fees vary by transaction type and destination country. Domestic transfers are usually cheaper than international. All costs are shown before you confirm.",
        "Transfer costs depend on where you're sending money. UK transfers have lower fees than international ones. We display all charges before final confirmation.",
        "Pricing varies based on transfer destination and type. Domestic UK transfers are more affordable than international. You'll see exact fees before proceeding."
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
      category: 'goodbye',
      triggers: ['bye', 'goodbye', 'see you', 'thanks bye', 'done'],
      responses: [
        "Goodbye! Have a great day and don't hesitate to reach out if you need anything else.",
        "Take care! Feel free to contact us anytime you need banking assistance.",
        "Have a wonderful day! We're always here when you need banking support.",
        "Goodbye! Thanks for using Bank of Ireland. Contact us anytime you need help."
      ]
    }
  ];

  const getChatResponses = (): ChatResponse[] => {
    const stored = UserDataManager.getUserData('chatResponses', null);
    return stored || getDefaultResponses();
  };

  const findResponse = (userMessage: string): { text: string; category: string } => {
    const responses = getChatResponses();
    const lowerMessage = userMessage.toLowerCase();
    
    for (const response of responses) {
      for (const trigger of response.triggers) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
          // Get next response variation to avoid repetition
          const lastIndex = chatState.lastResponseIndex[response.category] || 0;
          const nextIndex = (lastIndex + 1) % response.responses.length;
          
          setChatState(prev => ({
            ...prev,
            lastResponseIndex: {
              ...prev.lastResponseIndex,
              [response.category]: nextIndex
            }
          }));
          
          return {
            text: response.responses[nextIndex],
            category: response.category
          };
        }
      }
    }
    
    const fallbackResponses = [
      "I'd be happy to help you with that. Could you provide a bit more detail about what you're looking for?",
      "I want to make sure I understand correctly. Can you tell me more about what you need assistance with?",
      "Let me help you with that. Could you elaborate on the specific issue you're experiencing?",
      "I'm here to assist! Can you provide more details so I can give you the best possible help?"
    ];
    
    const fallbackIndex = Math.floor(Math.random() * fallbackResponses.length);
    return {
      text: fallbackResponses[fallbackIndex],
      category: 'fallback'
    };
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

    setTimeout(() => {
      const responseData = findResponse(userMessage.text);
      
      // Calculate realistic typing delay based on response length
      // 3-5 words per second = 200-333ms per word
      const words = responseData.text.split(' ').length;
      const wordsPerSecond = Math.random() * 2 + 3; // 3-5 words per second
      const realisticDelay = Math.max(1000, (words / wordsPerSecond) * 1000);
      
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
    }, 800); // Brief delay before starting to type
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndChat = () => {
    setChatState(prev => ({
      ...prev,
      isActive: false
    }));
    
    // Clear chat state
    localStorage.removeItem('liveChatState');
    
    // Reset to initial state
    const agentNames = ['Mark', 'Sarah', 'James', 'Emma', 'David', 'Lisa'];
    const randomAgent = agentNames[Math.floor(Math.random() * agentNames.length)];
    const waitTime = Math.floor(Math.random() * 90000) + 60000;
    
    setChatState({
      messages: [],
      isActive: true,
      agentName: randomAgent,
      sessionId: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastResponseIndex: {},
      queueStatus: 'waiting',
      queueStartTime: new Date(),
      estimatedWaitTime: waitTime
    });
    
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
                <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-left">
                  {typingText}
                </p>
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