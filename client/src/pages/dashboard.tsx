import { ChevronRight, User } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right">
      {/* Header with scenic background matching screenshot */}
      <div className="text-white relative flex-shrink-0 h-32">
        {/* Full scenic background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background.jpg')`
          }}
        />
        {/* Teal overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] opacity-75" />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between p-4 pt-12">
            <div className="flex items-center space-x-2">
              <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-6 filter brightness-0 invert" />
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
          
          <div className="px-4 pb-4 mt-auto">
            <h1 className="text-lg font-medium boi-brand-font">Welcome</h1>
            <p className="text-white/80 text-sm boi-regular-font">Last login: 14.07 GMT 27/04/2021</p>
          </div>
        </div>
      </div>

      {/* Main content area - matching screenshot exactly */}
      <div className="flex-1 px-4 -mt-4 overflow-y-auto pb-20">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Current Account */}
          <button 
            className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            onClick={() => alert('Current Account Details: €2,322.40 available')}
          >
            <div className="text-left">
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide boi-bold-font">CURRENT ACCOUNT</p>
              <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-2091</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75] boi-bold-font">€2,322.40</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </button>
          
          {/* Credit Card */}
          <button 
            className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            onClick={() => alert('Credit Card: €2,000.00 available credit')}
          >
            <div className="text-left">
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide boi-bold-font">CREDIT CARD</p>
              <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-1820</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75] boi-bold-font">€2,000.00</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </button>
          
          {/* Savings Account */}
          <button 
            className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            onClick={() => alert('Savings Account: €7,500.00 balance')}
          >
            <div className="text-left">
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide boi-bold-font">SAVINGS ACCOUNT</p>
              <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-0978</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75] boi-bold-font">€7,500.00</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </button>

          {/* Personal Loan */}
          <button 
            className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            onClick={() => alert('Personal Loan: €2,500.00 outstanding balance')}
          >
            <div className="text-left">
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide boi-bold-font">PERSONAL LOAN</p>
              <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">-8923</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75] boi-bold-font">€2,500.00</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </button>

          {/* Deposit */}
          <button 
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            onClick={() => alert('365 Monthly Saver: €100.00 - Withdraw funds available')}
          >
            <div className="text-left">
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide boi-bold-font">DEPOSIT - 7908</p>
              <p className="text-xs text-[#4a6b75] mt-0.5 boi-regular-font">365 MONTHLY SAVER</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-gray-400 boi-bold-font">€100.00</p>
              <p className="text-xs text-[#4a6b75] ml-2 boi-regular-font">Withdraw funds</p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation - 5 tabs exactly like screenshot */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button className="flex-1 flex flex-col items-center py-3 text-[#4a6b75] relative">
            <img src="/icon-footer-accounts-highlight.svg" alt="Accounts" className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Accounts</span>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-[#4a6b75] rounded-t-full"></div>
          </button>
          
          <button 
            className="flex-1 flex flex-col items-center py-3 text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Payments: Transfer money, pay bills, manage payees')}
          >
            <img src="/icon-footer-payments.svg" alt="Payments" className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Payments</span>
          </button>
          
          <button 
            className="flex-1 flex flex-col items-center py-3 text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Cards: Manage your debit and credit cards')}
          >
            <img src="/credit_card_services.svg" alt="Cards" className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Cards</span>
          </button>
          
          <button 
            className="flex-1 flex flex-col items-center py-3 text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Services: Branch locator, statements, security settings')}
          >
            <img src="/icon-footer-services.svg" alt="Services" className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Services</span>
          </button>
          
          <button 
            className="flex-1 flex flex-col items-center py-3 text-gray-400 hover:text-[#4a6b75] transition-colors"
            onClick={() => alert('Apply: Apply for loans, credit cards, and other products')}
          >
            <img src="/icon-footer-apply.svg" alt="Apply" className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}