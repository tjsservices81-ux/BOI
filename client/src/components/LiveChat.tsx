import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, User, Bot } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";
import { getUserCurrency } from "../utils/currencyUtils";

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

export default function LiveChat({ isOpen, onClose }: LiveChatProps) {
  const currentUser = UserDataManager.getCurrentUser();
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentName] = useState("Emma");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getDefaultResponses = (): ChatResponse[] => {
    const primaryCurrency = getUserCurrency();
    const isGBP = primaryCurrency === 'GBP';
    
    return [
      {
        id: '1',
        category: 'card_issues',
        triggers: ['unblock card', 'card blocked', 'card not working', 'blocked card', 'card issue'],
        responses: [
          "I can help you with your card issue right away. To unblock your card, go to Profile > Admin Panel and tap 'Unblock Card'. Your card will be available immediately for transactions.",
          "No worries at all, let me sort that card problem for you. You can unblock your card through Profile > Admin Panel > 'Unblock Card'. It takes effect instantly."
        ]
      },
      {
        id: '2',
        category: 'transfers',
        triggers: ['transfer money', 'send money', 'make transfer', 'how to transfer', 'payment'],
        responses: isGBP ? [
          "I'll help you with transfers. For UK transfers, tap 'Payments' then 'UK Transfer' - these typically take 2-24 hours. For SEPA zone transfers, use 'SEPA Transfer' which usually takes 2-24 hours as well.",
          "Use the 'Payments' section - UK Transfer for domestic payments (2-24 hours) or SEPA Transfer for transfers within the SEPA zone (2-24 hours processing)."
        ] : [
          "I'll help you with transfers. For UK transfers, tap 'Payments' then 'UK Transfer' - these typically take up to 24 hours. For SEPA zone transfers, use 'SEPA Transfer' which usually takes 1-2 business days.",
          "Use the 'Payments' section - UK Transfer for domestic payments (up to 24 hours) or SEPA Transfer for transfers within the SEPA zone (1-2 business days processing)."
        ]
      },
      {
        id: '3',
        category: 'account_info',
        triggers: ['check balance', 'account balance', 'how much money', 'balance', 'statement'],
        responses: [
          "Your account balances are displayed right on the main dashboard when you log in. For detailed statements or account numbers, just tap on any account to see the full breakdown.",
          "All your balances are visible on the homepage dashboard. If you need detailed statements, tap on the specific account and you'll find all those details there."
        ]
      },
      {
        id: '4',
        category: 'greeting',
        triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        responses: [
          "Hey there! Good to hear from you. What can I help you with today?",
          "Hi! How's your day going? What brings you to Bank of Ireland support?",
          "Hello there! What can I sort out for you today?"
        ]
      },
      {
        id: '5',
        category: 'thanks',
        triggers: ['thank you', 'thanks', 'appreciate', 'helpful'],
        responses: [
          "You're very welcome! Is there anything else I can help you with today?",
          "Brilliant, happy to help! Feel free to reach out if you need any other assistance.",
          "You're welcome! I'm here if you need help with anything else."
        ]
      }
    ];
  };

  const getChatResponses = (): ChatResponse[] => {
    const stored = UserDataManager.getUserData('chatResponses', null);
    return stored || getDefaultResponses();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findMatchingResponse = (userInput: string): string => {
    const responses = getChatResponses();
    const lowerInput = userInput.toLowerCase();
    
    for (const response of responses) {
      for (const trigger of response.triggers) {
        if (lowerInput.includes(trigger.toLowerCase())) {
          const randomIndex = Math.floor(Math.random() * response.responses.length);
          return response.responses[randomIndex];
        }
      }
    }
    
    return "I understand you need help. Could you tell me more about what you're looking for? I'm here to assist with your banking needs.";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: findMatchingResponse(inputText),
        isUser: false,
        timestamp: new Date(),
        agentName: agentName
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50">
      <div 
        className="bg-white w-full h-full md:w-[90vw] md:h-[90vh] md:rounded-3xl md:max-w-4xl md:max-h-[800px] shadow-2xl absolute"
        style={{ 
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: 'calc(100vh - 100px)'
        }}
      >
        {/* Header */}
        <div className="bg-[#126987] text-white p-4 rounded-t-3xl flex justify-between items-center">
          <div className="flex items-center">
            <MessageCircle className="w-6 h-6 mr-3" />
            <div>
              <h3 className="font-semibold">Bank of Ireland Support</h3>
              <p className="text-sm text-white/80">
                {agentName} • Online
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 h-[400px] md:h-[500px]">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Hi there! 👋</p>
              <p>I'm {agentName} from Bank of Ireland support.</p>
              <p>How can I help you today?</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.isUser ? 'bg-[#126987]' : 'bg-gray-300'}`}>
                  {message.isUser ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    message.isUser
                      ? 'bg-[#126987] text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.isUser ? 'text-white/70' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#126987] focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="bg-[#126987] text-white p-2 rounded-full hover:bg-[#0f5a73] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}