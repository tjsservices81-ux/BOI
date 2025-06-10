import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, User, ArrowUpDown, Globe, MapPin } from "lucide-react";

export default function Payments() {
  const [, navigate] = useLocation();
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);

  const paymentOptions = [
    {
      id: 'iban',
      title: 'International Transfer',
      subtitle: 'IBAN transfer to any European bank',
      icon: <Globe className="w-6 h-6 text-[#4a6b75]" />,
      description: 'Send money internationally using IBAN',
      popular: true
    },
    {
      id: 'domestic',
      title: 'UK Bank Transfer',
      subtitle: 'Account number and sort code',
      icon: <MapPin className="w-6 h-6 text-[#4a6b75]" />,
      description: 'Transfer to UK bank accounts',
      popular: false
    },
    {
      id: 'internal',
      title: 'Between BOI Accounts',
      subtitle: 'Move money between your accounts',
      icon: <ArrowUpDown className="w-6 h-6 text-[#4a6b75]" />,
      description: 'Instant transfer between your BOI accounts',
      popular: false
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-white ios-safe-top ios-safe-bottom">
      {/* Header */}
      <div className="bg-[#4a6b75] px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6 mr-2" />
          <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Payments
          </span>
        </button>
        <button className="text-white active:scale-95 transition-transform">
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 px-4 py-6 pb-32 ios-scroll overflow-y-auto">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Send Money
          </h1>
          <p className="text-gray-600 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Choose how you'd like to send your payment
          </p>
        </div>

        {/* Payment Options */}
        <div className="space-y-4 mb-8">
          {paymentOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedPaymentType(option.id)}
              className="w-full bg-white rounded-2xl p-5 shadow-sm active:scale-98 transition-all duration-200 border-2 border-transparent hover:border-[#4a6b75]/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    {option.icon}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {option.title}
                      </h3>
                      {option.popular && (
                        <span className="bg-[#4a6b75] text-white text-xs px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {option.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-blue-50 rounded-xl p-4 text-center active:scale-95 transition-transform">
              <div className="w-8 h-8 bg-[#4a6b75] rounded-full flex items-center justify-center mx-auto mb-2">
                <img src="/icon-footer-payments.svg" alt="Recent" className="w-4 h-4 filter brightness-0 invert" />
              </div>
              <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Recent Payees
              </span>
            </button>
            <button className="bg-blue-50 rounded-xl p-4 text-center active:scale-95 transition-transform">
              <div className="w-8 h-8 bg-[#4a6b75] rounded-full flex items-center justify-center mx-auto mb-2">
                <img src="/Add-payee.svg" alt="Add" className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Add Payee
              </span>
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Recent Payments
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Sarah Johnson', account: 'IE29 AIBK 9311 5212 3456 78', amount: '€125.00', date: 'Today' },
              { name: 'Electric Ireland', account: '12-34-56 87654321', amount: '€89.50', date: 'Yesterday' },
              { name: 'James Wilson', account: 'GB82 WEST 1234 5698 7654 32', amount: '€250.00', date: '2 days ago' }
            ].map((payment, index) => (
              <button key={index} className="w-full flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 active:bg-gray-50 transition-colors">
                <div className="text-left">
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {payment.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {payment.account}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {payment.amount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {payment.date}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}