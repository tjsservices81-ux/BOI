import { ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header with scenic background matching screenshot exactly */}
      <div className="text-white relative flex-shrink-0 h-44">
        {/* Full scenic background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background.jpg')`
          }}
        />
        {/* Teal overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] opacity-85" />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between px-4 pt-16 pb-4">
            <div className="flex items-center space-x-3">
              <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-5 filter brightness-0 invert" />
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white/40 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                onClick={() => alert('Profile Menu: Settings, Security, Logout')}
              >
                <User className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="px-4 pb-8 mt-auto">
            <h1 className="text-xl font-normal boi-regular-font">Welcome</h1>
            <p className="text-white/75 text-sm boi-regular-font mt-0.5">Last login: 14.07 GMT 27/04/2021</p>
          </div>
        </div>
      </div>

      {/* Main content area - white card with rounded top corners */}
      <div className="flex-1 px-0 -mt-8 overflow-y-auto ios-scroll">
        <div className="bg-white rounded-t-3xl shadow-lg min-h-full">
          <div className="pt-6 pb-24">
            {/* Current Account */}
            <button 
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors haptic-feedback"
              onClick={() => setLocation('/transactions?account=current&balance=2322.40&number=2091')}
            >
              <div className="text-left">
                <p className="font-medium text-sm text-gray-800 boi-regular-font">CURRENT ACCOUNT</p>
                <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-2091</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-[#4a6b75] boi-semibold-font">€ 2,322.40</p>
                <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
              </div>
            </button>
            
            {/* Credit Card */}
            <button 
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors haptic-feedback"
              onClick={() => setLocation('/transactions?account=credit&balance=2000.00&number=1820')}
            >
              <div className="text-left">
                <p className="font-medium text-sm text-gray-800 boi-regular-font">CREDIT CARD</p>
                <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-1820</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-[#4a6b75] boi-semibold-font">€2,000.00</p>
                <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
              </div>
            </button>
            
            {/* Savings Account */}
            <button 
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors haptic-feedback"
              onClick={() => setLocation('/transactions?account=savings&balance=7500.00&number=0978')}
            >
              <div className="text-left">
                <p className="font-medium text-sm text-gray-800 boi-regular-font">SAVINGS ACCOUNT</p>
                <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-0978</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-[#4a6b75] boi-semibold-font">€7,500.00</p>
                <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
              </div>
            </button>

            {/* Personal Loan */}
            <button 
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors haptic-feedback"
              onClick={() => setLocation('/transactions?account=loan&balance=2500.00&number=8923')}
            >
              <div className="text-left">
                <p className="font-medium text-sm text-gray-800 boi-regular-font">PERSONAL LOAN</p>
                <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-8923</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-[#4a6b75] boi-semibold-font">€2,500.00</p>
                <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
              </div>
            </button>

            {/* Deposit */}
            <button 
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors haptic-feedback"
              onClick={() => setLocation('/transactions?account=deposit&balance=100.00&number=7908')}
            >
              <div className="text-left">
                <p className="font-medium text-sm text-gray-800 boi-regular-font">DEPOSIT - 7908</p>
                <p className="text-xs text-[#4a6b75] mt-0.5 boi-regular-font">365 MONTHLY SAVER</p>
              </div>
              <div className="flex items-center text-right">
                <div>
                  <p className="text-lg font-semibold text-gray-400 boi-semibold-font">€100.00</p>
                  <p className="text-xs text-[#4a6b75] boi-regular-font">Withdraw funds</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - matching screenshot exactly */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 ios-safe-bottom">
        <div className="flex justify-around items-center h-12">
          <button className="flex flex-col items-center space-y-1 py-2 text-[#4a6b75] relative active:scale-95 transition-transform">
            <img src="/icon-footer-accounts-highlight.svg" alt="Accounts" className="w-6 h-6" />
            <span className="text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Accounts</span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#4a6b75] rounded-full"></div>
          </button>
          
          <button 
            className="flex flex-col items-center space-y-1 py-2 text-gray-400 hover:text-[#4a6b75] transition-colors active:scale-95"
            onClick={() => alert('Payments: Transfer money, pay bills, manage payees')}
          >
            <img src="/icon-footer-payments.svg" alt="Payments" className="w-6 h-6" />
            <span className="text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Payments</span>
          </button>
          
          <button 
            className="flex flex-col items-center space-y-1 py-2 text-gray-400 hover:text-[#4a6b75] transition-colors active:scale-95"
            onClick={() => setLocation('/cards')}
          >
            <img src="/credit_card_services.svg" alt="Cards" className="w-6 h-6" />
            <span className="text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Cards</span>
          </button>
          
          <button 
            className="flex flex-col items-center space-y-1 py-2 text-gray-400 hover:text-[#4a6b75] transition-colors active:scale-95"
            onClick={() => setLocation('/insights')}
          >
            <img src="/icon-footer-services.svg" alt="Services" className="w-6 h-6" />
            <span className="text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Services</span>
          </button>
          
          <button 
            className="flex flex-col items-center space-y-1 py-2 text-gray-400 hover:text-[#4a6b75] transition-colors active:scale-95"
            onClick={() => alert('Apply: Apply for loans, credit cards, and other products')}
          >
            <img src="/icon-footer-more.svg" alt="More" className="w-6 h-6" />
            <span className="text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>More</span>
          </button>
        </div>
      </div>
    </div>
  );
}