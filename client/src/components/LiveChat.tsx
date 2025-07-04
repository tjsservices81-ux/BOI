import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Send, Clock, Users, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isActive: false,
    agentName: '',
    sessionId: '',
    lastResponseIndex: {},
    queueStatus: 'closed',
    queueStartTime: null,
    estimatedWaitTime: 0,
    queuePosition: 0,
    isInQueue: false,
    lastActivityTime: new Date(),
    hasCheckedIn: false
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [queueTimeRemaining, setQueueTimeRemaining] = useState(0);
  const [isEndingChat, setIsEndingChat] = useState(false);
  const [endChatCountdown, setEndChatCountdown] = useState(0);
  const [showEndChatConfirm, setShowEndChatConfirm] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endChatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Professional Bank of Ireland agents
  const agents = [
    'James Murphy', 'Sarah O\'Connor', 'David Kelly', 'Emma Walsh', 
    'Michael Ryan', 'Catherine Byrne', 'John O\'Brien', 'Lisa Carroll'
  ];

  // Professional responses for banking queries
  const getBankingResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase().trim();
    
    // Check for balance/transaction queries
    if (message.includes('balance') || message.includes('transaction') || message.includes('payment')) {
      return "I can help you with account balance and transaction inquiries. Could you please specify which account you'd like me to check?";
    }
    
    // Check for transfer queries  
    if (message.includes('transfer') || message.includes('send money')) {
      return "I can assist you with transfers and payments. Are you looking to make a domestic or international transfer?";
    }
    
    // Check for login/access issues
    if (message.includes('login') || message.includes('access') || message.includes('password') || message.includes('locked')) {
      return "I can help resolve access issues with your account. For security purposes, I'll need to verify some details with you first.";
    }
    
    // Check for card issues
    if (message.includes('card') || message.includes('debit') || message.includes('credit')) {
      return "I can assist with card-related queries. Are you experiencing issues with payments, or do you need to report a lost or stolen card?";
    }
    
    // Check for branch/ATM locations
    if (message.includes('branch') || message.includes('atm') || message.includes('location')) {
      return "I can help you find nearby Bank of Ireland branches and ATMs. Could you tell me your location or preferred area?";
    }
    
    // Check for off-topic queries
    if (message.includes('weather') || message.includes('news') || message.includes('sports') || 
        message.includes('recipe') || message.includes('joke') || message.includes('story')) {
      return "I'm here to help with Bank of Ireland services. For other queries, I'd recommend checking the appropriate websites or apps. How can I assist with your banking today?";
    }
    
    // Generic banking assistance
    return "I'm here to help with your Bank of Ireland services. Could you tell me more about what you need assistance with today?";
  };

  // Initialize chat when opened
  useEffect(() => {
    if (isOpen && !chatState.isActive) {
      const selectedAgent = agents[Math.floor(Math.random() * agents.length)];
      const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setChatState(prev => ({
        ...prev,
        isActive: true,
        agentName: selectedAgent,
        sessionId,
        queueStatus: 'connected',
        messages: []
      }));

      // Add welcome message
      setTimeout(() => {
        const welcomeMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          text: "You're speaking with a Bank of Ireland representative. How can I assist you today?",
          isUser: false,
          timestamp: new Date(),
          agentName: selectedAgent,
          isAutomated: false
        };
        
        setChatState(prev => ({
          ...prev,
          messages: [welcomeMessage]
        }));
      }, 1000);
    }
  }, [isOpen]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      lastActivityTime: new Date()
    }));

    setInputText('');
    
    // Simulate typing and response
    setIsTyping(true);
    setTypingText(`${chatState.agentName} is typing...`);

    setTimeout(() => {
      const responseText = getBankingResponse(userMessage.text);
      
      const botMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        text: responseText,
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
      setTypingText('');
    }, 1500 + Math.random() * 2000);
  };

  // Handle ending chat
  const handleEndChat = () => {
    setChatState(prev => ({
      ...prev,
      queueStatus: 'ended',
      isActive: false
    }));
    
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages, isTyping]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-[#1a5490] text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">Bank of Ireland Live Chat</h3>
              <p className="text-sm text-blue-100">
                {chatState.queueStatus === 'connected' && chatState.agentName ? 
                  `Connected with ${chatState.agentName}` : 
                  'Connecting...'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-700">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatState.messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.isUser 
                  ? 'bg-[#1a5490] text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="text-sm">{message.text}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <p className="text-sm italic">{typingText}</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a5490]"
              disabled={chatState.queueStatus !== 'connected'}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputText.trim() || chatState.queueStatus !== 'connected'}
              className="bg-[#1a5490] hover:bg-[#144a7c]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Bank of Ireland Secure Chat
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEndChat}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              End Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}