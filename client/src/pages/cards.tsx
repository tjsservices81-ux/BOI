import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Snowflake, Shield, Lock, CreditCard, AlertTriangle, X } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

export default function Cards() {
  const [, navigate] = useLocation();
  const [currentCard, setCurrentCard] = useState(0);
  const [freezeToggle, setFreezeToggle] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("JOHN MURPHY");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isCardBlocked, setIsCardBlocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cards = [
    {
      type: "DEBIT CARD",
      typeShort: "21",
      bank: "Bank of Ireland",
      number: "5375 4140 1234 5678",
      maskedNumber: "**** **** **** 5678",
      name: cardHolderName,
      expiry: "05/27",
      cvv: "***",
      gradient: "from-[#1e3a8a] via-[#3b82f6] to-[#1e40af]",
      logo: "VISA",
      logoColor: "text-white"
    },
    {
      type: "CREDIT CARD", 
      typeShort: "22",
      bank: "Bank of Ireland",
      number: "4532 1500 1234 5678",
      maskedNumber: "**** **** **** 5678",
      name: cardHolderName, 
      expiry: "08/26",
      cvv: "***",
      gradient: "from-[#0891b2] via-[#0284c7] to-[#0369a1]",
      logo: "VISA",
      logoColor: "text-white"
    }
  ];

  // Load cardholder name and card status from profile and listen for updates
  useEffect(() => {
    // Load name from profile data
    const loadCardholderName = () => {
      const userProfile = UserDataManager.getUserProfile();
      if (userProfile && userProfile.name) {
        setCardHolderName(userProfile.name.toUpperCase());
      } else {
        setCardHolderName('JOHN MURPHY');
      }
    };

    // Load card blocked status
    const loadCardStatus = () => {
      const blocked = UserDataManager.getUserData('cardBlocked', false);
      setIsCardBlocked(blocked);
    };

    loadCardholderName();
    loadCardStatus();

    // Listen for profile updates and card unblock events
    const handleStorageChange = () => {
      loadCardholderName();
      loadCardStatus();
    };

    const handleCardUnblocked = () => {
      loadCardStatus();
    };

    const handleProfileUpdate = () => {
      loadCardholderName();
    };

    const handleCardNameUpdate = () => {
      loadCardholderName();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cardUnblocked', handleCardUnblocked);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('adminProfileUpdate', handleProfileUpdate);
    window.addEventListener('userProfileUpdate', handleProfileUpdate);
    window.addEventListener('cardNameUpdate', handleCardNameUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cardUnblocked', handleCardUnblocked);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate);
      window.removeEventListener('cardNameUpdate', handleCardNameUpdate);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const scrollLeft = scrollRef.current.scrollLeft;
        const cardWidth = scrollRef.current.offsetWidth;
        const newIndex = Math.round(scrollLeft / cardWidth);
        setCurrentCard(newIndex);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleReportLostStolen = () => {
    setShowBlockModal(true);
  };

  const confirmBlockCard = () => {
    // Block the card and save to storage
    setIsCardBlocked(true);
    UserDataManager.setUserData('cardBlocked', true);
    // Clear cache to ensure fresh data is loaded when navigating back
    UserDataManager.clearCache('cardBlocked');
    setShowBlockModal(false);
  };

  return (
    <div className="h-screen flex flex-col bg-white ios-safe-top ios-safe-bottom page-fade-in">
      
      {/* Header */}
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button 
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          Manage Card
        </h1>
        <button 
          className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-150 ease-out active:scale-95"
          onClick={() => navigate('/profile')}
        >
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 px-4 py-6 pb-32 ios-scroll overflow-y-auto">
        {/* Card Type Label */}
        <div className="text-center mb-6">
          <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            {cards[currentCard].type} - {cards[currentCard].typeShort}
          </p>
        </div>

        {/* Card Display */}
        <div className="relative mb-8">
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            {cards.map((card, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-full px-2 snap-center stagger-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  {/* Card */}
                  <div className={`w-full h-56 rounded-2xl shadow-xl bg-gradient-to-br ${card.gradient} relative overflow-hidden`}>
                    {/* Bank Logo */}
                    <div className="absolute top-6 left-6">
                      <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-6 filter brightness-0 invert" />
                    </div>

                    {/* Card Type */}
                    <div className="absolute top-6 right-6">
                      <span className="text-white text-xs font-medium opacity-80" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {card.type.split(' ')[0]}
                      </span>
                    </div>

                    {/* Chip */}
                    <div className="absolute top-16 left-6 w-10 h-8 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-md opacity-90"></div>

                    {/* Card Number */}
                    <div className="absolute top-28 left-6">
                      <p className="text-white text-lg font-mono tracking-wider" style={{ fontFamily: 'Courier, monospace' }}>
                        {card.maskedNumber}
                      </p>
                    </div>

                    {/* Card Details */}
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                      <div>
                        <p className="text-white text-xs opacity-70 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {card.name}
                        </p>
                        <p className="text-white text-xs opacity-70" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {card.expiry}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-2xl font-bold ${card.logoColor}`} style={{ fontFamily: 'serif' }}>
                          {card.logo}
                        </span>
                      </div>
                    </div>

                    {/* Contactless Symbol */}
                    <div className="absolute top-16 right-6">
                      <div className="w-6 h-6 border-2 border-white opacity-60 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 border border-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Freeze Overlay */}
                  {freezeToggle && !isCardBlocked && (
                    <div className="absolute inset-0 bg-gray-500 bg-opacity-50 rounded-2xl flex items-center justify-center">
                      <div className="bg-white px-3 py-2 rounded-lg flex items-center space-x-2">
                        <Snowflake className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Frozen
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Blocked Card Overlay */}
                  {isCardBlocked && (
                    <div className="absolute inset-0 bg-red-600 bg-opacity-90 rounded-2xl flex items-center justify-center">
                      <div className="bg-white px-4 py-3 rounded-lg flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-red-600" />
                        <div className="text-center">
                          <span className="text-sm font-bold text-red-600 block" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            BLOCKED
                          </span>
                          <span className="text-xs text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            Lost/Stolen
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Card Indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {cards.map((_, index) => (
              <div
                key={index}
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
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <Snowflake className="w-5 h-5 text-blue-600" />
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
                <span className="text-xs text-gray-500 mr-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {freezeToggle ? 'On' : 'Off'}
                </span>
                <button 
                  onClick={() => setFreezeToggle(!freezeToggle)}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                    freezeToggle ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform duration-200 ${
                    freezeToggle ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Report Lost or Stolen */}
          <button 
            onClick={handleReportLostStolen}
            disabled={isCardBlocked}
            className={`w-full bg-white rounded-2xl p-4 ios-card flex items-center justify-between active:scale-98 transition-transform ${
              isCardBlocked ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${isCardBlocked ? 'bg-red-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                {isCardBlocked ? (
                  <Shield className="w-4 h-4 text-red-600" />
                ) : (
                  <img src="/cert.svg" alt="Report" className="w-4 h-4" />
                )}
              </div>
              <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {isCardBlocked ? 'Card blocked - Contact us' : 'Report lost or stolen'}
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

      {/* Block Card Confirmation Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Block This Card?
              </h3>
              
              <p className="text-sm text-gray-600 mb-6 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                This will immediately block your card and prevent all transactions. You'll need to order a new card and only an administrator can reverse this action.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={confirmBlockCard}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Yes, Block Card
                </button>
                
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}