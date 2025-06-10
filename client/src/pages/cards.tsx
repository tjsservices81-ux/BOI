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
              {/* Card Layout exactly like BOI app */}
              <div className="flex space-x-3 mb-4">
                {/* Card Selector */}
                <div className="w-16 h-24 bg-[#1a365d] rounded-lg flex flex-col items-center justify-center text-white relative">
                  <span className="text-xs boi-bold-font">Debit Card</span>
                  <span className="text-2xl boi-bold-font mt-1">9</span>
                  <div className="absolute bottom-2 text-xs boi-bold-font">VISA</div>
                </div>
                
                {/* Active Card with exact BOI styling */}
                <div className="flex-1 relative">
                  <div className="bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
                    {/* BOI Logo and Card Type */}
                    <div className="flex justify-between items-start mb-8">
                      <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-4 filter brightness-0 invert" />
                      <span className="text-xs boi-regular-font">Credit Card</span>
                    </div>
                    
                    {/* Card Number */}
                    <div className="mb-6">
                      <p className="text-lg boi-regular-font tracking-wider">**** **** **** 1111</p>
                    </div>
                    
                    {/* Cardholder and Date */}
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs boi-regular-font mb-1">John Smith</p>
                        <p className="text-xs boi-regular-font">05/27 ***</p>
                      </div>
                      {/* Mastercard logo */}
                      <div className="flex items-center space-x-1">
                        <div className="w-6 h-4 bg-red-500 rounded-sm opacity-90"></div>
                        <div className="w-6 h-4 bg-yellow-400 rounded-sm opacity-90"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Frozen State Overlay */}
                  <div className="absolute inset-0 bg-gray-600 bg-opacity-70 rounded-xl flex items-center justify-center">
                    <div className="bg-gray-700 px-4 py-2 rounded-full flex items-center space-x-2">
                      <img src="/Icons_Fingerprint.svg" alt="Frozen" className="w-4 h-4 filter brightness-0 invert" />
                      <span className="text-white text-sm boi-bold-font">Frozen</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card Indicators */}
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-[#4a6b75] rounded-full"></div>
              </div>
            </div>

            {/* Card Controls */}
            <div className="space-y-4">
              {/* Freeze Card */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <img src="/Icons_Fingerprint.svg" alt="Freeze" className="w-6 h-6" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 boi-regular-font">Freeze card</p>
                    <p className="text-xs text-gray-500 boi-regular-font">Limit use of card for now</p>
                  </div>
                </div>
                <button className="w-12 h-6 bg-[#4a6b75] rounded-full relative transition-colors">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform shadow-sm"></div>
                  <span className="absolute left-1 top-0.5 text-xs text-white boi-bold-font">On</span>
                </button>
              </div>

              {/* Info Banner */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm">i</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700 boi-regular-font">
                    If your card is lost or stolen <span className="text-blue-600 underline">contact us</span> immediately.
                  </p>
                </div>
              </div>

              {/* Report lost or stolen */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('Report Lost or Stolen')}
              >
                <div className="flex items-center space-x-3">
                  <img src="/credit_card_services.svg" alt="Report" className="w-5 h-5" />
                  <span className="text-sm font-medium text-gray-900 boi-regular-font">Report lost or stolen</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>

              {/* Replace damaged card */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('Replace Damaged Card')}
              >
                <div className="flex items-center space-x-3">
                  <img src="/device.svg" alt="Replace" className="w-5 h-5" />
                  <span className="text-sm font-medium text-gray-900 boi-regular-font">Replace damaged card</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>

              {/* View card PIN */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('View Card PIN')}
              >
                <div className="flex items-center space-x-3">
                  <img src="/bgpin.png" alt="PIN" className="w-5 h-5" />
                  <span className="text-sm font-medium text-gray-900 boi-regular-font">View card PIN</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>

              {/* Set up Apple Pay */}
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors haptic-feedback"
                onClick={() => alert('Set up Apple Pay')}
              >
                <div className="flex items-center space-x-3">
                  <img src="/apple_Pay_Mark.svg" alt="Apple Pay" className="w-5 h-5" />
                  <span className="text-sm font-medium text-gray-900 boi-regular-font">Set up Apple Pay</span>
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