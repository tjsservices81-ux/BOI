import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function Insights() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full bg-[#f5f5f5] overflow-hidden flex flex-col ios-safe-top ios-safe-bottom page-slide-up">
      {/* Header */}
      <div className="bg-[#126987] text-white px-4 py-6 status-bar-safe">
        <div className="flex items-center mb-2">
          <button 
            onClick={() => setLocation('/dashboard')}
            className="mr-3 p-1 hover:bg-white/20 rounded-full transition-colors haptic-feedback"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-white boi-regular-font">Insights</h1>
          </div>
          <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <img src="/contact_icon.svg" alt="Profile" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white ios-scroll -mt-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[#126987] rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
        <div className="bg-white rounded-t-2xl pt-6">
          {/* Filter Tabs */}
          <div className="px-4 mb-6">
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-[#126987] text-white rounded-full text-sm font-medium boi-regular-font">
                ALL INSIGHTS (7)
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium boi-regular-font hover:bg-gray-200 transition-colors">
                UNREAD INSIGHTS (3)
              </button>
            </div>
          </div>

          {/* Insights List */}
          <div className="space-y-4 px-4">
            {/* Monthly Money Tracker */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-gray-500 boi-regular-font">12/25</p>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 boi-semibold-font">Your monthly money tracker</h3>
              <p className="text-xs text-gray-600 mb-4 boi-regular-font">See what came in and went out of your accounts this month</p>
              
              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 boi-regular-font">May</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 boi-regular-font">Apr</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#126987] h-2 rounded-full" style={{width: '45%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Refund Insight */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-gray-500 boi-regular-font">12/25</p>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 boi-semibold-font">You got a refund</h3>
              <p className="text-xs text-gray-600 mb-4 boi-regular-font">A refund was paid into your accounts recently</p>
              
              {/* Illustration */}
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg p-6 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div className="w-12 h-1 bg-purple-300 rounded mx-auto mb-1"></div>
                  <div className="w-8 h-1 bg-purple-200 rounded mx-auto"></div>
                </div>
              </div>
            </div>

            {/* Subscription Increase */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-gray-500 boi-regular-font">12/25</p>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 boi-semibold-font">Subscription increase</h3>
              <p className="text-xs text-gray-600 mb-4 boi-regular-font">Your payment to Spotify was higher than usual</p>
              
              {/* Progress Bars for Subscription */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 boi-regular-font">01 May</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#126987] h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 boi-regular-font">01 Apr</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-gray-300 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 boi-regular-font">01 Mar</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-gray-300 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spending Pattern Insight */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-gray-500 boi-regular-font">11/25</p>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 boi-semibold-font">Weekend spending alert</h3>
              <p className="text-xs text-gray-600 mb-4 boi-regular-font">You spent 40% more this weekend compared to last weekend</p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <img src="/faqs_icon.svg" alt="Warning" className="w-4 h-4" />
                  <p className="text-xs text-orange-800 boi-regular-font">Consider setting a weekend spending limit</p>
                </div>
              </div>
            </div>

            {/* Savings Goal Progress */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-gray-500 boi-regular-font">10/25</p>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 boi-semibold-font">Savings goal update</h3>
              <p className="text-xs text-gray-600 mb-4 boi-regular-font">You're 60% towards your €5,000 holiday savings goal</p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="w-full bg-green-100 rounded-full h-3 mb-2">
                  <div className="bg-green-500 h-3 rounded-full" style={{width: '60%'}}></div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-green-700 boi-regular-font">€3,000 saved</span>
                  <span className="text-xs text-green-700 boi-regular-font">€5,000 goal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-20"></div>
        </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 ios-safe-bottom">
        <div className="flex justify-around items-center py-3">
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#126987] transition-colors haptic-feedback"
            onClick={() => setLocation('/dashboard')}
          >
            <img src="/icon-footer-accounts.svg" alt="Accounts" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Accounts</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#126987] transition-colors"
            onClick={() => alert('Payments: Transfer money, pay bills, manage payees')}
          >
            <img src="/icon-footer-payments.svg" alt="Payments" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Payments</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#126987] transition-colors"
            onClick={() => setLocation('/cards')}
          >
            <img src="/icon-footer-cards.svg" alt="Cards" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Cards</span>
          </button>
          
          <button className="flex flex-col items-center text-[#126987] relative">
            <img src="/icon-footer-services-highlight.svg" alt="Services" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium boi-regular-font">Services</span>
            <div className="absolute -bottom-3 left-1/2 w-12 h-1 bg-[#126987]" style={{ marginLeft: '-24px' }}></div>
          </button>
          
          <button 
            className="flex flex-col items-center text-gray-400 hover:text-[#126987] transition-colors"
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