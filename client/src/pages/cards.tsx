import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User } from "lucide-react";

export default function Cards() {
  const [, navigate] = useLocation();
  const [currentCard, setCurrentCard] = useState(0);

  console.log("Cards component is rendering");

  const cards = [
    {
      type: "DEBIT CARD",
      bank: "Bank of Ireland",
      number: "**** **** **** 1111",
      name: "John Smith",
      expiry: "05/21",
      cvv: "***",
      image: "/roi_debit_card_consumer-200px.png"
    },
    {
      type: "CREDIT CARD", 
      bank: "Bank of Ireland",
      number: "**** **** **** 2222",
      name: "John Smith", 
      expiry: "08/24",
      cvv: "***",
      image: "/roi_credit_card_classic-clear-twin-personal@200.png"
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-white ios-safe-top ios-safe-bottom">
      
      {/* Header */}
      <div className="bg-[#4a6b75] px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-semibold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          Manage Card
        </h1>
        <button className="text-white active:scale-95 transition-transform">
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 px-4 py-6 ios-scroll overflow-y-auto">
        {/* Card Type Label */}
        <div className="text-center mb-6">
          <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            {cards[currentCard].type} - {cards[currentCard].expiry.split('/')[1]}
          </p>
        </div>

        {/* Card Display */}
        <div className="relative mb-8">
          <div className="flex space-x-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {cards.map((card, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-80 h-48 rounded-2xl shadow-lg snap-center relative overflow-hidden"
              >
                <img 
                  src={card.image} 
                  alt={`${card.type} - ${card.bank}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Card Indicators */}
          <div className="flex justify-center space-x-2 mt-4">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCard(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentCard ? 'bg-gray-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card Actions */}
        <div className="space-y-3">
          {/* Freeze Card */}
          <div className="bg-white rounded-2xl p-4 ios-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C13.1 2 14 2.9 14 4V5.5C17.11 6.22 19.78 8.61 20.74 11.74C20.91 12.29 20.59 12.86 20.04 13.03C19.5 13.2 18.93 12.88 18.76 12.33C18.12 10.36 16.16 9 14 9H10C7.79 9 6 10.79 6 13S7.79 17 10 17H14C16.21 17 18 15.21 18 13C18 12.45 17.55 12 17 12S16 12.45 16 13C16 14.1 15.1 15 14 15H10C8.9 15 8 14.1 8 13S8.9 11 10 11H14C14.18 11 14.35 11.02 14.53 11.05V4C14.53 2.9 13.63 2 12.53 2H12Z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Freeze card
                  </p>
                  <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Limit use of card for now
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Off
                </span>
                <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Lost or Stolen */}
          <button className="w-full bg-white rounded-2xl p-4 ios-card flex items-center justify-between active:scale-98 transition-transform">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <img src="/cert.svg" alt="Report" className="w-4 h-4" />
              </div>
              <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Report lost or stolen
              </span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Replace Damaged Card */}
          <button className="w-full bg-white rounded-2xl p-4 ios-card flex items-center justify-between active:scale-98 transition-transform">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <img src="/reorder_card_icon.svg" alt="Replace" className="w-4 h-4" />
              </div>
              <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Replace damaged card
              </span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* View Card PIN */}
          <button className="w-full bg-white rounded-2xl p-4 ios-card flex items-center justify-between active:scale-98 transition-transform">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                </svg>
              </div>
              <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                View card PIN
              </span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Set up Apple Pay */}
          <button className="w-full bg-white rounded-2xl p-4 ios-card flex items-center justify-between active:scale-98 transition-transform">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <img src="/apple_Pay_Mark.svg" alt="Apple Pay" className="w-4 h-4" />
              </div>
              <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Set up Apple Pay
              </span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 ios-safe-bottom">
        <div className="flex justify-around items-center">
          <button 
            className="flex flex-col items-center space-y-1 py-2 active:scale-95 transition-transform"
            onClick={() => navigate("/")}
          >
            <img src="/icon-footer-accounts.svg" alt="Accounts" className="w-6 h-6" />
            <span className="text-xs text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Accounts
            </span>
          </button>
          <button className="flex flex-col items-center space-y-1 py-2 active:scale-95 transition-transform">
            <img src="/icon-footer-payments.svg" alt="Payments" className="w-6 h-6" />
            <span className="text-xs text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              Payments
            </span>
          </button>
          <button className="flex flex-col items-center space-y-1 py-2 active:scale-95 transition-transform relative">
            <img src="/icon-footer-cards-highlight.svg" alt="Cards" className="w-6 h-6" />
            <span className="text-xs text-[#4a6b75] font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Cards
            </span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#4a6b75] rounded-full"></div>
          </button>
          <button 
            className="flex flex-col items-center space-y-1 py-2 active:scale-95 transition-transform"
            onClick={() => navigate("/insights")}
          >
            <img src="/icon-footer-services.svg" alt="Services" className="w-6 h-6" />
            <span className="text-xs text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Services
            </span>
          </button>
          <button className="flex flex-col items-center space-y-1 py-2 active:scale-95 transition-transform">
            <img src="/icon-footer-more.svg" alt="Apply" className="w-6 h-6" />
            <span className="text-xs text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              Apply
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}