import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, User, Home, ArrowRightLeft, CreditCard, Landmark, FileText, AlertTriangle, X, Shield } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

export default function Cards() {
  const [, navigate] = useLocation();
  const [freezeToggle, setFreezeToggle] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("JOHN MURPHY");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isCardBlocked, setIsCardBlocked] = useState(false);
  const [accountNumber, setAccountNumber] = useState("3704");

  useEffect(() => {
    const loadCardholderName = () => {
      const userProfile = UserDataManager.getUserProfile();
      if (userProfile && userProfile.name) {
        setCardHolderName(userProfile.name.toUpperCase());
      } else {
        setCardHolderName('JOHN MURPHY');
      }
    };

    const loadCardStatus = () => {
      const blocked = UserDataManager.getUserData('cardBlocked', false);
      setIsCardBlocked(blocked);
    };

    const loadAccountNumber = async () => {
      try {
        const customerNumber = localStorage.getItem('customerNumber');
        if (customerNumber) {
          const response = await fetch(`/api/accounts/${customerNumber}`);
          if (response.ok) {
            const accounts = await response.json();
            if (accounts && accounts.length > 0) {
              const accNum = accounts[0].accountNumber;
              setAccountNumber(accNum.slice(-4));
            }
          }
        }
      } catch (error) {
        console.error('Error loading account:', error);
      }
    };

    loadCardholderName();
    loadCardStatus();
    loadAccountNumber();

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

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cardUnblocked', handleCardUnblocked);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('adminProfileUpdate', handleProfileUpdate);
    window.addEventListener('userProfileUpdate', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cardUnblocked', handleCardUnblocked);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate);
    };
  }, []);

  const handleReportLostStolen = () => {
    setShowBlockModal(true);
  };

  const confirmBlockCard = () => {
    setIsCardBlocked(true);
    UserDataManager.setUserData('cardBlocked', true);
    UserDataManager.clearCache('cardBlocked');
    setShowBlockModal(false);
  };

  const navigateWithAnimation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="h-screen flex flex-col bg-white" style={{ maxWidth: '430px', margin: '0 auto' }}>
      
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ 
          backgroundColor: '#126987',
          paddingTop: 'env(safe-area-inset-top, 12px)'
        }}
      >
        <button 
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-semibold">
          Manage Card
        </h1>
        <button 
          onClick={() => navigate('/profile')}
          className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center"
        >
          <User className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white overflow-y-auto pb-24">
        {/* Account Label */}
        <div className="text-center py-4 border-b border-gray-100">
          <p style={{ 
            fontSize: '16px', 
            color: '#333',
            fontWeight: 500,
            letterSpacing: '0.5px'
          }}>
            CURRENT ACCOUNT ~{accountNumber}
          </p>
        </div>

        {/* Card Display */}
        <div className="px-8 py-6">
          <div className="relative">
            {/* Bank of Ireland Debit Card */}
            <div 
              style={{
                background: 'linear-gradient(135deg, #0077B6 0%, #00A8E8 50%, #48CAE4 100%)',
                borderRadius: '12px',
                padding: '24px',
                aspectRatio: '1.586',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
            >
              {/* Top Row - Logo and Card Type */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <img 
                    src="/boi_logo.svg" 
                    alt="Bank of Ireland" 
                    className="h-5 filter brightness-0 invert"
                  />
                  <span className="text-white text-sm font-medium opacity-90">Bank of Ireland</span>
                </div>
                <span className="text-white text-sm">Debit Card</span>
              </div>

              {/* Card Number */}
              <div style={{ marginTop: '32px' }}>
                <p style={{ 
                  color: 'white', 
                  fontSize: '18px', 
                  fontFamily: 'monospace',
                  letterSpacing: '2px'
                }}>
                  **** **** **** {accountNumber}
                </p>
              </div>

              {/* Cardholder Name */}
              <div style={{ marginTop: '16px' }}>
                <p style={{ 
                  color: 'white', 
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  {cardHolderName}
                </p>
              </div>

              {/* Bottom Row - Expiry, CVV, VISA */}
              <div className="flex justify-between items-end" style={{ marginTop: '16px' }}>
                <div className="flex gap-6">
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>Expires</p>
                    <p style={{ color: 'white', fontSize: '14px' }}>11/29</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>CVV</p>
                    <p style={{ color: 'white', fontSize: '14px' }}>***</p>
                  </div>
                </div>
                <div className="text-right">
                  <span style={{ 
                    color: 'white', 
                    fontSize: '24px', 
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontFamily: 'serif'
                  }}>
                    VISA
                  </span>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', marginTop: '-4px' }}>Debit</p>
                </div>
              </div>
            </div>

            {/* Freeze Overlay */}
            {freezeToggle && !isCardBlocked && (
              <div className="absolute inset-0 bg-gray-500 bg-opacity-60 rounded-xl flex items-center justify-center">
                <div className="bg-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a5490">
                    <path d="M12 2L14.39 6.26L19 7.27L15.5 10.97L16.24 15.63L12 13.38L7.76 15.63L8.5 10.97L5 7.27L9.61 6.26L12 2Z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Frozen</span>
                </div>
              </div>
            )}

            {/* Blocked Card Overlay */}
            {isCardBlocked && (
              <div className="absolute inset-0 bg-red-600 bg-opacity-90 rounded-xl flex items-center justify-center">
                <div className="bg-white px-4 py-3 rounded-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <div className="text-center">
                    <span className="text-sm font-bold text-red-600 block">BLOCKED</span>
                    <span className="text-xs text-gray-600">Lost/Stolen</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Actions */}
        <div>
          {/* Freeze Card */}
          <div 
            className="flex items-center justify-between px-4 py-4 border-b border-gray-100"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#1a5490">
                <path d="M12 2L14.39 6.26L19 7.27L15.5 10.97L16.24 15.63L12 13.38L7.76 15.63L8.5 10.97L5 7.27L9.61 6.26L12 2Z"/>
                <circle cx="12" cy="12" r="2" fill="#1a5490"/>
                <line x1="12" y1="2" x2="12" y2="6" stroke="#1a5490" strokeWidth="1.5"/>
                <line x1="12" y1="18" x2="12" y2="22" stroke="#1a5490" strokeWidth="1.5"/>
                <line x1="2" y1="12" x2="6" y2="12" stroke="#1a5490" strokeWidth="1.5"/>
                <line x1="18" y1="12" x2="22" y2="12" stroke="#1a5490" strokeWidth="1.5"/>
              </svg>
              <div>
                <p style={{ fontSize: '16px', color: '#333', fontWeight: 500 }}>Freeze card</p>
                <p style={{ fontSize: '13px', color: '#666' }}>Limit use of card for now</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '14px', color: '#666' }}>{freezeToggle ? 'On' : 'Off'}</span>
              <button 
                onClick={() => setFreezeToggle(!freezeToggle)}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  backgroundColor: freezeToggle ? '#1a5490' : '#E5E7EB',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: freezeToggle ? '22px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
          </div>

          {/* Add to Apple Wallet */}
          <button 
            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-4">
              <div style={{ 
                border: '1px solid #333', 
                borderRadius: '4px', 
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                <span style={{ fontFamily: 'system-ui' }}>Pay</span>
              </div>
              <p style={{ fontSize: '16px', color: '#333', fontWeight: 500 }}>Add to Apple Wallet</p>
            </div>
            <ChevronRight size={20} color="#999" />
          </button>

          {/* Report Lost or Stolen */}
          <button 
            onClick={handleReportLostStolen}
            disabled={isCardBlocked}
            className={`w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 ${isCardBlocked ? 'opacity-50' : ''}`}
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a5490" strokeWidth="1.5">
                <rect x="3" y="6" width="18" height="12" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="7" y1="14" x2="13" y2="14"/>
              </svg>
              <p style={{ fontSize: '16px', color: '#333', fontWeight: 500 }}>
                {isCardBlocked ? 'Card blocked - Contact us' : 'Report lost or stolen'}
              </p>
            </div>
            <ChevronRight size={20} color="#999" />
          </button>

          {/* Replace Damaged Card */}
          <button 
            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a5490" strokeWidth="1.5">
                <path d="M4 4V9H9"/>
                <path d="M20 20V15H15"/>
                <path d="M4 9C5.5 5.5 9 3 13 3C17.97 3 22 7.03 22 12"/>
                <path d="M20 15C18.5 18.5 15 21 11 21C6.03 21 2 16.97 2 12"/>
              </svg>
              <p style={{ fontSize: '16px', color: '#333', fontWeight: 500 }}>Replace damaged card</p>
            </div>
            <ChevronRight size={20} color="#999" />
          </button>

          {/* View Card PIN */}
          <button 
            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a5490" strokeWidth="1.5">
                <path d="M21 10C21 7 19 5 16 5H8C5 5 3 7 3 10V14C3 17 5 19 8 19H16C19 19 21 17 21 14V10Z"/>
                <circle cx="12" cy="12" r="2"/>
                <path d="M8 5V3"/>
                <path d="M16 5V3"/>
              </svg>
              <p style={{ fontSize: '16px', color: '#333', fontWeight: 500 }}>View card PIN</p>
            </div>
            <ChevronRight size={20} color="#999" />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center flex-shrink-0">
        <button 
          onClick={() => navigateWithAnimation('/dashboard')}
          className="flex flex-col items-center gap-1 p-2"
        >
          <Home className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Accounts</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/payments')}
          className="flex flex-col items-center gap-1 p-2"
        >
          <ArrowRightLeft className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Payments</span>
        </button>
        <button 
          className="flex flex-col items-center gap-1 p-2"
        >
          <CreditCard className="h-5 w-5 text-[#1a5276]" />
          <span className="text-xs text-[#1a5276] font-medium">Cards</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/more')}
          className="flex flex-col items-center gap-1 p-2"
        >
          <Landmark className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Services</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/apply')}
          className="flex flex-col items-center gap-1 p-2"
        >
          <FileText className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Apply</span>
        </button>
      </div>

      {/* Block Card Confirmation Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Block This Card?
              </h3>
              
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                This will immediately block your card and prevent all transactions. You'll need to order a new card and only an administrator can reverse this action.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={confirmBlockCard}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold"
                >
                  Yes, Block Card
                </button>
                
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
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
