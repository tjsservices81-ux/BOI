import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, CreditCard, Home, DollarSign, Car, Building2, Briefcase } from "lucide-react";

interface ProductTile {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  popular?: boolean;
}

export default function Apply() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];

  const products: ProductTile[] = [
    {
      id: 'credit-card',
      title: 'Credit Card',
      description: 'Get instant access to credit with competitive rates and rewards',
      icon: '/credit_card_services.svg',
      category: 'Cards'
    },
    {
      id: 'personal-loan',
      title: 'Personal Loan',
      description: 'Fixed rate personal loans from 2,000 to 75,000',
      icon: '/Loan_medium.png',
      category: 'Loans',
      popular: true
    },
    {
      id: 'mortgage',
      title: 'Mortgage',
      description: 'First-time buyer and home mover mortgages available',
      icon: '/home-solid.svg',
      category: 'Property'
    },
    {
      id: 'car-finance',
      title: 'Car Finance',
      description: 'Competitive rates for new and used car purchases',
      icon: '/loan-calculator.svg',
      category: 'Finance'
    },
    {
      id: 'current-account',
      title: 'Current Account',
      description: 'Everyday banking with digital features and overdraft options',
      icon: '/add_account.svg',
      category: 'Accounts'
    },
    {
      id: 'savings-account',
      title: 'Savings Account',
      description: 'Grow your money with our range of savings products',
      icon: '/Saver_medium.png',
      category: 'Savings'
    },
    {
      id: 'business-account',
      title: 'Business Account',
      description: 'Banking solutions designed for your business needs',
      icon: '/Business.svg',
      category: 'Business'
    }
  ];

  const handleApplyClick = (productId: string, productTitle: string) => {
    // For demo purposes, show an alert - in real app would navigate to application form
    alert(`Application for ${productTitle} would begin here. This would typically open a detailed application form with eligibility checks and required documentation.`);
  };

  return (
    <div className="h-screen flex flex-col bg-white ios-safe-top ios-safe-bottom page-slide-down">
      {/* Header - BOI Style */}
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button 
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6 mr-2" />
          <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Apply
          </span>
        </button>
        <div className="w-6 h-6" /> {/* Spacer for center alignment */}
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 px-4 py-6 pb-32 ios-scroll overflow-y-auto">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Apply for Products
          </h1>
          <p className="text-gray-600 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Choose from our range of banking and financial products
          </p>
        </div>

        {/* Product Tiles */}
        <div className="space-y-4">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 stagger-item card-interactive"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Product Icon */}
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    {product.icon.endsWith('.svg') ? (
                      <img 
                        src={product.icon} 
                        alt={product.title}
                        className="w-7 h-7"
                        style={{ 
                          filter: 'brightness(0) saturate(100%) invert(25%) sepia(85%) saturate(1011%) hue-rotate(168deg) brightness(93%) contrast(88%)'
                        }}
                      />
                    ) : (
                      <img 
                        src={product.icon} 
                        alt={product.title}
                        className="w-9 h-9 rounded object-cover"
                      />
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {product.title}
                      </h3>
                      {product.popular && (
                        <span className="bg-[#126987] text-white text-xs px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {product.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {product.category}
                    </p>
                  </div>
                </div>
                
                {/* Apply Button */}
                <button
                  onClick={() => handleApplyClick(product.id, product.title)}
                  className="ml-4 bg-[#126987] text-white px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all duration-200 hover:bg-[#0f5a6b] flex items-center space-x-1"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  <span>Apply</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Information Section */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Need Help?
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Our team is here to help you choose the right product. Visit any branch, call us, or book an appointment online.
          </p>
          <div className="mt-3 flex space-x-3">
            <button className="text-[#126987] text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Find a Branch
            </button>
            <button className="text-[#126987] text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Book Appointment
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            <strong>Important:</strong> All applications are subject to Bank of Ireland's lending criteria and approval. 
            Terms and conditions apply. Full details available on request.
          </p>
        </div>
      </div>
    </div>
  );
}