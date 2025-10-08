import { useLocation } from "wouter";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import { getUserCurrency } from "../utils/currencyUtils";
import ukLogoPath from "@assets/IMG_1505_1759859367310.png";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function Help() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [userCurrency] = useState(() => getUserCurrency());
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const faqData: FAQItem[] = [
  {
    category: "Account & Login",
    question: "How do I enable Face ID for login?",
    answer: "Go to More > Settings and toggle on 'Face ID'. You'll be prompted to register your biometric authentication. Once set up, you can use Face ID to quickly and securely access your account."
  },
  {
    category: "Account & Login",
    question: "How long does my login session last?",
    answer: "Your session remains active for 1 year from your last login. This means you won't need to re-enter your PIN unless you log out or your session expires."
  },
  {
    category: "Account & Login",
    question: "Can I use this app on multiple devices?",
    answer: "Each device requires its own one-time access code. iOS devices receive 2 access attempts, while Android and other devices receive 1 access attempt per code. Contact support if you need additional access codes."
  },
  {
    category: "Transfers & Payments",
    question: "How do I make a transfer?",
    answer: userCurrency === 'GBP' 
      ? "From your dashboard, tap 'Transfer' and choose between 'UK Transfer' for domestic payments or 'Irish Transfer' for international payments. Enter the recipient details, amount, and confirm to complete the transfer."
      : "From your dashboard, tap 'Transfer' and choose between 'Irish Transfer' for domestic payments or 'UK Transfer' for international payments. Enter the recipient details, amount, and confirm to complete the transfer."
  },
  {
    category: "Transfers & Payments",
    question: "Are there limits on transfer amounts?",
    answer: "Transfer limits vary by account type. Current accounts typically have higher daily limits than savings accounts. Check your account details or contact support for specific limits on your account."
  },
  {
    category: "Transfers & Payments",
    question: "How long do transfers take?",
    answer: userCurrency === 'GBP'
      ? "UK transfers are typically instant or completed within hours. Irish transfers may take 1-3 business days depending on the receiving bank. International transfers can take 3-5 business days."
      : "Irish transfers are typically instant or completed within hours. UK transfers may take 1-3 business days depending on the receiving bank. International transfers can take 3-5 business days."
  },
  {
    category: "Transfers & Payments",
    question: "Can I cancel a transfer?",
    answer: "Once a transfer is confirmed, it cannot be cancelled through the app. If you need to cancel or reverse a payment, please contact our support team immediately for assistance."
  },
  {
    category: "Security",
    question: "How is my data protected?",
    answer: "We use bank-grade encryption to protect all your data. Your PIN is securely hashed, and all communications use SSL/TLS encryption. Face ID data is stored locally on your device and never transmitted to our servers."
  },
  {
    category: "Security",
    question: "What should I do if I lose my device?",
    answer: "Immediately contact our support team to revoke access from your lost device. You can also ask an administrator to revoke your access through the admin panel. Then request a new access code for your replacement device."
  },
  {
    category: "Security",
    question: "How do I change my PIN?",
    answer: "For security reasons, PIN changes must be requested through our support team. This ensures proper verification of your identity before making security-related changes to your account."
  },
  {
    category: "Statements & Documents",
    question: "How do I download my bank statement?",
    answer: "Go to Transaction History, select the account you want a statement for, tap the menu icon (three dots), and select 'Generate Statement'. Choose your date range and the PDF will be generated for download."
  },
  {
    category: "Statements & Documents",
    question: "Can I receive statements by email?",
    answer: "Yes! In Settings, ensure 'Emails' is enabled. When this setting is on, you'll automatically receive email confirmations for transfers and can request statements to be emailed to you."
  },
  {
    category: "Statements & Documents",
    question: "How far back can I view transactions?",
    answer: "You can view your complete transaction history from when your account was opened. Use the date filters in Transaction History to find specific transactions from any time period."
  },
  {
    category: "Notifications",
    question: "How do I manage notifications?",
    answer: "Go to More > Settings to control your notification preferences. You can toggle push notifications and email notifications independently based on your preferences."
  },
  {
    category: "Notifications",
    question: "What notifications will I receive?",
    answer: "You'll receive notifications for: incoming transfers, outgoing payments, low balance alerts, security updates, and promotional offers (if enabled)."
  },
  {
    category: "Offline Access",
    question: "Can I use the app offline?",
    answer: "Yes! The app caches your data for up to 24 hours of offline access. You can view balances and transaction history offline. However, you'll need an internet connection to make transfers or refresh your data."
  },
  {
    category: "Offline Access",
    question: "What happens when I go back online?",
    answer: "When you reconnect, the app automatically syncs to get the latest transactions and account balances. Any changes made while offline will be updated to reflect the current state."
  },
  {
    category: "Credit Score",
    question: "How often is my credit score updated?",
    answer: "Your credit score is updated monthly. Check the 'Credit Score' section in More to see your current rating and factors affecting your score."
  },
  {
    category: "Credit Score",
    question: "What factors affect my credit score?",
    answer: "Your credit score is influenced by: payment history (35%), credit utilization (30%), length of credit history (15%), types of credit (10%), and recent credit inquiries (10%)."
  },
  {
    category: "Technical Support",
    question: "The app isn't loading properly, what should I do?",
    answer: "Try these steps: 1) Check your internet connection, 2) Close and reopen the app, 3) Clear your browser cache if using web version, 4) Update to the latest version. If issues persist, contact support."
  },
  {
    category: "Technical Support",
    question: "How do I contact customer support?",
    answer: "Tap 'Live Chat' in the More menu to instantly connect with our support team. Our team is available 24/7 to assist you with any questions or concerns."
  }
  ];

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      setLocation(path);
    }, 150);
  };

  const categories = ["All", ...Array.from(new Set(faqData.map(item => item.category)))];
  
  const filteredFAQs = selectedCategory === "All" 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  return (
    <div className="h-screen bg-gradient-to-br from-[#126987] to-[#0d4e63] flex flex-col overflow-hidden relative">
      {/* Loading overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-[#126987] px-4 py-6 pt-12 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => handleNavigation('/more')}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-white/20"
            disabled={isNavigating}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center justify-center">
            <img 
              src={userCurrency === 'GBP' ? ukLogoPath : "/boi_logo.svg"} 
              alt={userCurrency === 'GBP' ? "Bank of Ireland UK" : "Bank of Ireland"} 
              className={`${userCurrency === 'GBP' ? 'h-9' : 'h-8'} filter brightness-0 invert`}
            />
          </div>
          
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-t-3xl mt-6 flex-1 overflow-hidden shadow-2xl page-slide-up">
        <div className="h-full overflow-y-auto pb-32">
          
          {/* Content Header */}
          <div className="text-center px-6 pt-6 pb-4 sticky top-0 bg-white z-10">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Help & FAQ
            </h2>
            <p className="text-gray-500 text-sm mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Find answers to common questions
            </p>

            {/* Category Filter */}
            <div className="flex overflow-x-auto gap-2 pb-4 -mx-6 px-6 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-[#126987] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Items */}
          <div className="px-6 space-y-3">
            {filteredFAQs.map((item, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  data-testid={`faq-question-${index}`}
                >
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {item.question}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                      expandedItem === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {expandedItem === index && (
                  <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact Support */}
          <div className="px-6 mt-8 mb-6">
            <div className="bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Still need help?
              </h3>
              <p className="text-sm text-white/90 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Our support team is available 24/7 to assist you
              </p>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openLiveChat'));
                }}
                className="w-full bg-white text-[#126987] py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="button-contact-support"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
