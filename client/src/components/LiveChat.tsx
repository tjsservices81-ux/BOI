import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, User, Bot } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatResponse {
  triggers: string[];
  response: string;
  id: string;
}

interface LiveChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveChat({ isOpen, onClose }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hi! I'm here to help you with your banking needs. How can I assist you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getDefaultResponses = (): ChatResponse[] => [
    {
      id: '1',
      triggers: ['unblock card', 'card blocked', 'card not working', 'blocked card'],
      response: "To unblock your card, go to Profile > Admin Panel and tap 'Unblock Card'. The card will be immediately available for use. If you need further assistance, please let me know!"
    },
    {
      id: '2',
      triggers: ['transfer money', 'send money', 'make transfer', 'how to transfer'],
      response: "You can transfer money by tapping 'Payments' in the bottom menu, then selecting either 'UK Transfer' for domestic transfers or 'IBAN Transfer' for international transfers. Would you like specific help with either option?"
    },
    {
      id: '3',
      triggers: ['check balance', 'account balance', 'how much money'],
      response: "Your account balances are displayed on the main dashboard when you log in. You can also tap on any account to see detailed transaction history and current balance."
    },
    {
      id: '4',
      triggers: ['forgot pin', 'reset pin', 'pin not working'],
      response: "For security reasons, PIN resets need to be done through our secure channels. Please visit your nearest Bank of Ireland branch with valid ID, or call our customer service line at 0818 365 365."
    },
    {
      id: '5',
      triggers: ['app not working', 'technical issue', 'bug', 'error'],
      response: "I'm sorry you're experiencing technical difficulties. Please try closing and reopening the app first. If the issue persists, you can contact our technical support team or visit a branch for assistance."
    },
    {
      id: '6',
      triggers: ['opening hours', 'branch hours', 'when open'],
      response: "Most Bank of Ireland branches are open Monday-Friday 10:00-16:00, with some locations offering extended hours. You can find specific branch hours and locations using the ATM/Branch locator in the app."
    },
    {
      id: '7',
      triggers: ['fees', 'charges', 'cost', 'how much'],
      response: "Transaction fees vary depending on the type of transfer and destination. UK transfers typically have lower fees than international transfers. You'll see all applicable fees before confirming any transaction."
    },
    {
      id: '8',
      triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
      response: "Hello! Welcome to Bank of Ireland customer support. I'm here to help you with any questions about your accounts, transfers, cards, or app features. What can I assist you with today?"
    }
  ];

  const getChatResponses = (): ChatResponse[] => {
    const stored = UserDataManager.getUserData('chatResponses', null);
    return stored || getDefaultResponses();
  };

  const findResponse = (userMessage: string): string => {
    const responses = getChatResponses();
    const lowerMessage = userMessage.toLowerCase();
    
    for (const response of responses) {
      for (const trigger of response.triggers) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
          return response.response;
        }
      }
    }
    
    return "I'm sorry, I didn't quite understand that. Would you like me to connect you with a live agent for personalized assistance? You can also try asking about transfers, card issues, account balances, or app features.";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate typing delay for more realistic feel
    setTimeout(() => {
      const response = findResponse(userMessage.text);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // 1-3 second delay
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md h-[85vh] max-h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-[#126987] rounded-t-3xl sm:rounded-t-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Live Chat Support
              </h3>
              <p className="text-white/80 text-xs" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                We're here to help
              </p>
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
          {messages.map((message) => (
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
        </div>
      </div>
    </div>
  );
}