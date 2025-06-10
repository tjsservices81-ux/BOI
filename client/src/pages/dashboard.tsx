import { ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
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
      <div className="flex-1 px-0 -mt-8 overflow-y-auto">
        <div className="bg-white rounded-t-3xl shadow-lg min-h-full">
          <div className="pt-6 pb-24">
            {/* Current Account */}
            <button 
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              onClick={() => setLocation('/transactions')}
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
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              onClick={() => alert('Credit Card: €2,000.00 available credit')}
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
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              onClick={() => alert('Savings Account: €7,500.00 balance')}
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
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              onClick={() => alert('Personal Loan: €2,500.00 outstanding balance')}
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
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              onClick={() => alert('365 Monthly Saver: €100.00 - Withdraw funds available')}
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
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around items-center py-3">
          <button className="flex flex-col items-center text-[#4a6b75] relative">
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span className="text-xs font-medium boi-regular-font">Accounts</span>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#4a6b75]"></div>
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
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Cards: Manage your debit and credit cards')}
          >
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            <span className="text-xs font-medium boi-regular-font">Cards</span>
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