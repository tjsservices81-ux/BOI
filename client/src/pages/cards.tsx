import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Cards() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-full bg-[#f5f5f5] overflow-hidden flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header */}
      <div className="bg-[#4a6b75] text-white px-4 py-6 status-bar-safe">
        <div className="flex items-center mb-2">
          <button 
            onClick={() => setLocation('/')}
            className="mr-3 p-1 hover:bg-white/20 rounded-full transition-colors haptic-feedback"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-white boi-regular-font">Manage Card</h1>
          </div>
          <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Details */}
      <div className="flex-1 overflow-y-auto bg-white ios-scroll -mt-2">
        <div className="bg-white rounded-t-2xl pt-6">
          <div className="px-4 pb-4">
            <p className="text-center text-sm text-gray-600 mb-4 boi-regular-font">CREDIT CARD -1111</p>
            
            {/* Card Display */}
            <div className="relative mb-6">
              <div className="bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] rounded-xl p-4 text-white shadow-lg">
                <div className="flex justify-between items-start mb-8">
                  <div className="bg-white/20 rounded p-2">
                    <span className="text-xs font-bold">VISA</span>
                  </div>
                  <div className="text-right">
                    <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-4 filter brightness-0 invert" />
                    <p className="text-xs mt-1 opacity-80 boi-regular-font">Credit Card</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-mono">**** **** **** 1111</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-80">John Smith</p>
                      <p className="text-xs font-mono">05/27 ***</p>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-6 h-4 bg-red-500 rounded-sm opacity-80"></div>
                      <div className="w-6 h-4 bg-yellow-400 rounded-sm opacity-80"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card Indicators */}
              <div className="flex justify-center mt-3 space-x-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-[#4a6b75] rounded-full"></div>
              </div>
            </div>

            {/* Card Controls */}
            <div className="space-y-4">
              {/* Freeze Card */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 boi-regular-font">Freeze card</p>
                    <p className="text-xs text-gray-500 boi-regular-font">Limit use of card for now</p>
                  </div>
                </div>
                <button className="w-12 h-6 bg-gray-200 rounded-full relative transition-colors">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform shadow-sm"></div>
                </button>
              </div>

              {/* Report lost or stolen */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('Report Lost or Stolen:\n• Immediately block your card\n• Request emergency replacement\n• Get temporary card access\n• 24/7 emergency support available')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 boi-regular-font">Report lost or stolen</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>

              {/* Replace damaged card */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('Replace Damaged Card:\n• Order replacement for damaged card\n• Keep existing card number\n• 3-5 business days delivery\n• No charge for replacement')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 boi-regular-font">Replace damaged card</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>

              {/* View card PIN */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('View Card PIN:\n• Secure PIN viewing\n• Requires biometric authentication\n• PIN will be displayed for 30 seconds\n• Use for ATM and chip & PIN transactions')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 boi-regular-font">View card PIN</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>

              {/* Set up Apple Pay */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('Set up Apple Pay:\n• Add card to Apple Wallet\n• Secure contactless payments\n• Use with iPhone, Apple Watch, iPad, Mac\n• Enhanced security with Face ID/Touch ID')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2L3 7v6c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-7-5z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 boi-regular-font">Set up Apple Pay</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 ios-safe-bottom">
        <div className="flex justify-around items-center py-3">
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors haptic-feedback"
            onClick={() => setLocation('/')}
          >
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span className="text-xs font-medium boi-regular-font">Accounts</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Payments: Transfer money, pay bills, manage payees')}
          >
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-xs font-medium boi-regular-font">Payments</span>
          </button>
          
          <button className="flex flex-col items-center text-[#4a6b75] relative">
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            <span className="text-xs font-medium boi-regular-font">Cards</span>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#4a6b75]"></div>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Services: Branch locator, statements, security settings')}
          >
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs font-medium boi-regular-font">Services</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Apply: Apply for loans, credit cards, and other products')}
          >
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span className="text-xs font-medium boi-regular-font">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}