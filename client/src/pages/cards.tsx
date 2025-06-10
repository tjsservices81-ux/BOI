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
                    <span className="text-xs boi-bold-font">VISA</span>
                  </div>
                  <div className="text-right">
                    <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-4 filter brightness-0 invert" />
                    <p className="text-xs mt-1 opacity-80 boi-regular-font">Credit Card</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm boi-regular-font">**** **** **** 1111</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-80 boi-regular-font">John Smith</p>
                      <p className="text-xs boi-regular-font">05/27 ***</p>
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
                  <img src="/Icons_Fingerprint.svg" alt="Freeze" className="w-6 h-6" />
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
                  <img src="/credit_card_services.svg" alt="Report Card" className="w-6 h-6" />
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
                  <img src="/device.svg" alt="Replace Card" className="w-6 h-6" />
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
                  <img src="/bgpin.png" alt="PIN" className="w-6 h-6" />
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
                  <img src="/apple_Pay_Mark.svg" alt="Apple Pay" className="w-6 h-6" />
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
            <img src="/icon-footer-accounts.svg" alt="Accounts" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Accounts</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Payments: Transfer money, pay bills, manage payees')}
          >
            <img src="/icon-footer-payments.svg" alt="Payments" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Payments</span>
          </button>
          
          <button className="flex flex-col items-center text-[#4a6b75] relative">
            <img src="/icon-footer-cards-highlight.svg" alt="Cards" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Cards</span>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#4a6b75]"></div>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => setLocation('/insights')}
          >
            <img src="/icon-footer-services.svg" alt="Services" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Services</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Apply: Apply for loans, credit cards, and other products')}
          >
            <img src="/icon-footer-apply.svg" alt="Apply" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}