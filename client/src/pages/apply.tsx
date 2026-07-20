import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Home, ArrowRightLeft, CreditCard, Landmark, FileText, User } from "lucide-react";
import { getUserCurrency, type Currency } from "../utils/currencyUtils";

interface ProductCard {
  id: string;
  title: string;
  icon: JSX.Element;
}

interface ListItem {
  id: string;
  title: string;
}

export default function Apply() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');

  useEffect(() => {
    setUserCurrency(getUserCurrency());
  }, []);

  const currencySymbol = userCurrency === 'EUR' ? '€' : '£';

  const productCards: ProductCard[] = [
    {
      id: 'home-insurance',
      title: 'Home Insurance',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <ellipse cx="32" cy="52" rx="20" ry="3" fill="#E8F4FC"/>
          <path d="M32 8L12 28H20V48H44V28H52L32 8Z" fill="#5BB5E0" stroke="#1a5490" strokeWidth="2"/>
          <path d="M24 48V36H32V48" stroke="#1a5490" strokeWidth="2"/>
          <circle cx="38" cy="38" r="3" fill="#1a5490"/>
          <path d="M16 20L32 8L48 20" stroke="#1a5490" strokeWidth="3" strokeLinecap="round"/>
          <path d="M20 52C20 52 26 48 32 48C38 48 44 52 44 52" stroke="#5BB5E0" strokeWidth="8" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'personal-loan',
      title: 'Personal Loan',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <path d="M20 40C20 40 24 36 32 36C40 36 44 40 44 40V52H20V40Z" fill="#1a5490"/>
          <circle cx="24" cy="28" r="6" fill="#7BC67B"/>
          <circle cx="32" cy="24" r="6" fill="#5BB5E0"/>
          <circle cx="40" cy="28" r="6" fill="#1a5490"/>
          <path d="M24 28L24 22M32 24L32 18M40 28L40 22" stroke="white" strokeWidth="2"/>
          <path d="M22 30L26 26M30 26L34 22M38 30L42 26" stroke="white" strokeWidth="1.5"/>
        </svg>
      )
    },
    {
      id: 'personal-credit-cards',
      title: 'Personal Credit Cards',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="20" width="36" height="24" rx="3" fill="#1a5490" transform="rotate(-10 8 20)"/>
          <rect x="12" y="26" width="36" height="24" rx="3" fill="#5BB5E0"/>
          <rect x="16" y="32" width="28" height="4" fill="#1a5490"/>
          <text x="18" y="46" fill="white" fontSize="6" fontFamily="monospace">CREDIT</text>
          <circle cx="44" cy="22" r="6" fill="#7BC67B"/>
        </svg>
      )
    },
    {
      id: 'business-loans',
      title: 'Business Loans',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="20" y="44" width="24" height="6" rx="1" fill="#7BC67B"/>
          <rect x="20" y="36" width="24" height="6" rx="1" fill="#1a5490"/>
          <rect x="20" y="28" width="24" height="6" rx="1" fill="#5BB5E0"/>
          <rect x="20" y="20" width="24" height="6" rx="1" fill="#1a5490"/>
          <rect x="20" y="12" width="24" height="6" rx="1" fill="#7BC67B"/>
        </svg>
      )
    },
    {
      id: 'business-overdraft',
      title: 'Business Overdraft',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <ellipse cx="32" cy="44" rx="16" ry="10" fill="#1a5490"/>
          <ellipse cx="32" cy="40" rx="16" ry="10" fill="#5BB5E0"/>
          <ellipse cx="32" cy="36" rx="12" ry="6" fill="#1a5490"/>
          <circle cx="44" cy="24" r="10" fill="#7BC67B"/>
          <path d="M44 20V28M40 24H48" stroke="white" strokeWidth="2"/>
        </svg>
      )
    },
    {
      id: 'mortgage-appointment',
      title: 'Mortgage Appointment',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="12" y="16" width="40" height="36" rx="3" fill="white" stroke="#1a5490" strokeWidth="2"/>
          <rect x="12" y="16" width="40" height="10" fill="#1a5490"/>
          <circle cx="20" cy="12" r="3" fill="#5BB5E0"/>
          <circle cx="44" cy="12" r="3" fill="#5BB5E0"/>
          <line x1="20" y1="12" x2="20" y2="20" stroke="#5BB5E0" strokeWidth="2"/>
          <line x1="44" y1="12" x2="44" y2="20" stroke="#5BB5E0" strokeWidth="2"/>
          <rect x="18" y="32" width="8" height="8" fill="#7BC67B"/>
          <rect x="28" y="32" width="8" height="8" fill="#5BB5E0"/>
          <rect x="38" y="32" width="8" height="8" fill="#5BB5E0"/>
          <rect x="18" y="42" width="8" height="6" fill="#5BB5E0"/>
          <circle cx="46" cy="44" r="8" fill="#7BC67B"/>
          <path d="M43 44L45 46L49 42" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 'mortgage-online',
      title: 'Mortgage Online Application',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <path d="M32 12L12 28H18V48H46V28H52L32 12Z" fill="#1a5490"/>
          <rect x="26" y="34" width="12" height="14" fill="#5BB5E0"/>
          <rect x="22" y="24" width="8" height="8" fill="#5BB5E0"/>
          <rect x="34" y="24" width="8" height="8" fill="#5BB5E0"/>
        </svg>
      )
    },
    {
      id: 'investments',
      title: 'Investments',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="12" y="36" width="10" height="16" fill="#1a5490"/>
          <rect x="27" y="28" width="10" height="24" fill="#5BB5E0"/>
          <rect x="42" y="20" width="10" height="32" fill="#1a5490"/>
          <path d="M16 32L32 20L48 12" stroke="#7BC67B" strokeWidth="3" strokeLinecap="round"/>
          <polygon points="48,8 52,16 44,16" fill="#7BC67B"/>
        </svg>
      )
    },
    {
      id: 'pension',
      title: 'Pension',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <path d="M24 20C24 20 28 12 32 12C36 12 40 20 40 20L42 48H22L24 20Z" fill="#1a5490"/>
          <ellipse cx="32" cy="48" rx="12" ry="4" fill="#1a5490"/>
          <circle cx="32" cy="28" r="8" fill="#5BB5E0"/>
          <text x="29" y="32" fill="white" fontSize="10" fontWeight="bold">{currencySymbol}</text>
        </svg>
      )
    },
    {
      id: 'mortgagesaver',
      title: 'MortgageSaver',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <path d="M20 40C20 40 24 36 32 36C40 36 44 40 44 40V52H20V40Z" fill="#1a5490"/>
          <path d="M28 24L20 32H24V40H36V32H40L28 24Z" fill="#5BB5E0" transform="translate(4, -4)"/>
          <circle cx="44" cy="20" r="8" fill="#7BC67B"/>
          <text x="41" y="24" fill="white" fontSize="10" fontWeight="bold">{currencySymbol}</text>
        </svg>
      )
    },
    {
      id: 'goalsaver',
      title: 'GoalSaver',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <ellipse cx="32" cy="44" rx="18" ry="8" fill="#1a5490"/>
          <path d="M14 36C14 30 22 26 32 26C42 26 50 30 50 36V44C50 50 42 54 32 54C22 54 14 50 14 44V36Z" fill="#1a5490"/>
          <ellipse cx="32" cy="36" rx="18" ry="8" fill="#5BB5E0"/>
          <rect x="28" y="20" width="8" height="4" fill="#5BB5E0"/>
          <circle cx="32" cy="36" r="6" fill="white"/>
          <text x="29" y="40" fill="#1a5490" fontSize="10" fontWeight="bold">{currencySymbol}</text>
        </svg>
      )
    },
    {
      id: 'supersaver',
      title: 'SuperSaver',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <path d="M20 40C20 40 24 36 32 36C40 36 44 40 44 40V52H20V40Z" fill="#1a5490"/>
          <rect x="24" y="20" width="16" height="20" rx="2" fill="#5BB5E0"/>
          <rect x="26" y="24" width="12" height="3" fill="white"/>
          <rect x="26" y="29" width="12" height="3" fill="white"/>
          <rect x="26" y="34" width="12" height="3" fill="white"/>
          <circle cx="44" cy="24" r="8" fill="#7BC67B"/>
          <text x="41" y="28" fill="white" fontSize="10" fontWeight="bold">{currencySymbol}</text>
        </svg>
      )
    },
    {
      id: 'instant-access',
      title: 'Instant Access Demand',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <path d="M24 20C24 20 28 12 32 12C36 12 40 20 40 20L42 48H22L24 20Z" fill="#1a5490"/>
          <ellipse cx="32" cy="48" rx="12" ry="4" fill="#1a5490"/>
          <circle cx="32" cy="28" r="8" fill="#5BB5E0"/>
          <text x="29" y="32" fill="white" fontSize="10" fontWeight="bold">{currencySymbol}</text>
          <rect x="38" y="38" width="16" height="12" rx="2" fill="#7BC67B"/>
          <rect x="40" y="42" width="12" height="2" fill="white"/>
          <rect x="40" y="46" width="8" height="2" fill="white"/>
        </svg>
      )
    },
    {
      id: 'fixed-term',
      title: 'Advantage Fixed Term Deposit',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="20" y="12" width="24" height="40" rx="4" fill="white" stroke="#1a5490" strokeWidth="2"/>
          <rect x="24" y="18" width="16" height="24" fill="#E8F4FC"/>
          <rect x="28" y="46" width="8" height="2" rx="1" fill="#1a5490"/>
          <rect x="26" y="24" width="12" height="12" rx="2" fill="#7BC67B"/>
          <text x="29" y="34" fill="white" fontSize="12" fontWeight="bold">{currencySymbol}</text>
        </svg>
      )
    },
    {
      id: 'personal-overdraft',
      title: 'Personal Overdraft',
      icon: (
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <rect x="16" y="20" width="32" height="24" rx="3" fill="#1a5490"/>
          <rect x="20" y="28" width="24" height="4" fill="#5BB5E0"/>
          <rect x="36" y="34" width="8" height="6" fill="#7BC67B"/>
          <rect x="20" y="36" width="12" height="2" fill="white"/>
        </svg>
      )
    }
  ];

  const insuranceItems: ListItem[] = [
    { id: 'home-insurance-list', title: 'Home Insurance' },
    { id: 'travel-insurance', title: 'Travel Insurance' },
    { id: 'family-protection', title: 'Family Protection' }
  ];

  const savingsItems: ListItem[] = [
    { id: 'supersaver-list', title: 'SuperSaver' },
    { id: 'goalsaver-list', title: 'GoalSaver' },
    { id: 'instant-access-list', title: 'Instant Access Demand' },
    { id: 'mortgagesaver-list', title: 'MortgageSaver' },
    { id: 'investments-list', title: 'Investments' },
    { id: 'fixed-term-list', title: 'Advantage Fixed Term Deposit' }
  ];

  const creditCardItems: ListItem[] = [
    { id: 'aer-credit', title: 'Aer Credit Card' },
    { id: 'classic-credit', title: 'Classic Credit Card' },
    { id: 'platinum-credit', title: 'Platinum Credit Card' },
    { id: 'student-credit', title: 'Student Credit Card' },
    { id: 'add-cardholder', title: 'Add Card Holder' },
    { id: 'instalment-plan', title: 'Instalment Plan' }
  ];

  const loanItems: ListItem[] = [
    { id: 'personal-loan-list', title: 'Personal Loan' },
    { id: 'student-loan', title: 'Student Loan' },
    { id: 'graduate-loan', title: 'Graduate Loan' }
  ];

  const productUrls: Record<string, string> = {
    'Home Insurance': 'https://personalbanking.bankofireland.com/insure-and-protect/insurance/home/',
    'Travel Insurance': 'https://personalbanking.bankofireland.com/insure-and-protect/insurance/travel/',
    'Family Protection': 'https://personalbanking.bankofireland.com/insure-and-protect/life-insurance/',
    'Personal Loan': 'https://personalbanking.bankofireland.com/borrow/personal-loan/',
    'Personal Credit Cards': 'https://personalbanking.bankofireland.com/borrow/credit-cards/',
    'Aer Credit Card': 'https://personalbanking.bankofireland.com/borrow/credit-cards/aer-credit-card/',
    'Classic Credit Card': 'https://personalbanking.bankofireland.com/borrow/credit-cards/classic-credit-card/',
    'Platinum Credit Card': 'https://personalbanking.bankofireland.com/borrow/credit-cards/platinum-credit-card/',
    'Student Credit Card': 'https://personalbanking.bankofireland.com/borrow/credit-cards/student-credit-card/',
    'Add Card Holder': 'https://personalbanking.bankofireland.com/borrow/credit-cards/',
    'Instalment Plan': 'https://personalbanking.bankofireland.com/borrow/credit-cards/',
    'Student Loan': 'https://personalbanking.bankofireland.com/borrow/student-loan/',
    'Graduate Loan': 'https://personalbanking.bankofireland.com/borrow/graduate-loan/',
    'Mortgage Online Application': 'https://personalbanking.bankofireland.com/borrow/mortgages/',
    'Mortgage Appointment': 'https://personalbanking.bankofireland.com/borrow/mortgages/mortgage-appointment/',
    'MortgageSaver': 'https://personalbanking.bankofireland.com/save/mortgagesaver/',
    'SuperSaver': 'https://personalbanking.bankofireland.com/save/supersaver/',
    'GoalSaver': 'https://personalbanking.bankofireland.com/save/goalsaver/',
    'Instant Access Demand': 'https://personalbanking.bankofireland.com/save/demand-deposit/',
    'Investments': 'https://personalbanking.bankofireland.com/invest/',
    'Advantage Fixed Term Deposit': 'https://personalbanking.bankofireland.com/save/fixed-term-deposit/',
    'Pension': 'https://personalbanking.bankofireland.com/invest/pensions/',
    'Business Loans': 'https://businessbanking.bankofireland.com/borrow/business-loans/',
    'Business Overdraft': 'https://businessbanking.bankofireland.com/borrow/business-overdraft/',
    'Personal Overdraft': 'https://personalbanking.bankofireland.com/borrow/overdraft/'
  };

  const handleProductClick = (title: string) => {
    const url = productUrls[title];
    if (url) {
      window.open(url, '_blank');
    } else {
      alert(`Opening ${title} application...`);
    }
  };

  const navigateWithAnimation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="h-screen flex flex-col bg-white" style={{ maxWidth: '100%', width: '100%', margin: '0 auto' }}>
      {/* Header - Fixed on top */}
      <div 
        className="flex items-center px-4 py-3 flex-shrink-0 relative z-10"
        style={{ 
          backgroundColor: '#126987',
          paddingTop: 'env(safe-area-inset-top, 12px)'
        }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-white text-lg font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>Apply</h1>
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Content - Slides down underneath header */}
      <div className="flex-1 overflow-y-auto bg-white px-5 py-6 pb-24 content-slide-under">
        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: 400, 
              color: '#1a5490',
              marginBottom: '8px'
            }}>
              Apply for a product
            </h2>
            <div style={{ 
              width: '50px',
              height: '3px',
              backgroundColor: '#1a5490',
              borderRadius: '2px'
            }} />
          </div>
        </div>

        {/* Product Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
          marginBottom: '32px'
        }}>
          {productCards.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product.title)}
              style={{
                backgroundColor: 'white',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '120px',
                cursor: 'pointer'
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                {product.icon}
              </div>
              <span style={{ 
                fontSize: '14px', 
                color: '#333',
                textAlign: 'center',
                lineHeight: 1.3
              }}>
                {product.title}
              </span>
            </button>
          ))}
        </div>

        {/* Insurance Section */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#333',
            marginBottom: '12px'
          }}>
            Insurance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insuranceItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleProductClick(item.title)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '16px', color: '#333' }}>{item.title}</span>
                <ChevronRight size={20} color="#999" />
              </button>
            ))}
          </div>
        </div>

        {/* Savings Section */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#333',
            marginBottom: '12px'
          }}>
            Savings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savingsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleProductClick(item.title)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '16px', color: '#333' }}>{item.title}</span>
                <ChevronRight size={20} color="#999" />
              </button>
            ))}
          </div>
        </div>

        {/* Personal Credit Cards Section */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#333',
            marginBottom: '12px'
          }}>
            Personal Credit Cards
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {creditCardItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleProductClick(item.title)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '16px', color: '#333' }}>{item.title}</span>
                <ChevronRight size={20} color="#999" />
              </button>
            ))}
          </div>
        </div>

        {/* Loans Section */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#333',
            marginBottom: '12px'
          }}>
            Loans
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loanItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleProductClick(item.title)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '16px', color: '#333' }}>{item.title}</span>
                <ChevronRight size={20} color="#999" />
              </button>
            ))}
          </div>
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
          onClick={() => navigateWithAnimation('/cards')}
          className="flex flex-col items-center gap-1 p-2"
        >
          <CreditCard className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Cards</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/more')}
          className="flex flex-col items-center gap-1 p-2"
        >
          <Landmark className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Services</span>
        </button>
        <button 
          className="flex flex-col items-center gap-1 p-2"
        >
          <FileText className="h-5 w-5 text-[#1a5276]" />
          <span className="text-xs text-[#1a5276] font-medium">Apply</span>
        </button>
      </div>
    </div>
  );
}
