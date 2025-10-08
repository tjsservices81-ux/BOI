import { useLocation } from "wouter";
import { ChevronLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, Minus, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { getUserCurrency } from "../utils/currencyUtils";
import { UserDataManager } from "../utils/userDataManager";
import ukLogoPath from "@assets/IMG_1505_1759859367310.png";

interface ScoreFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
  percentage: number;
}

interface CreditAccount {
  type: string;
  provider: string;
  balance: number;
  limit: number;
  status: "good" | "fair" | "poor";
  openedDate: string;
}

export default function CreditScore() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [userCurrency] = useState(() => getUserCurrency());
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // Get user profile to calculate account dates based on join year
  const userProfile = UserDataManager.getUserProfile();
  
  // Handle both old format "Member since YYYY" and new ISO format
  let userJoinYear = new Date().getFullYear();
  if (userProfile?.joinDate) {
    if (userProfile.joinDate.includes('Member since')) {
      const match = userProfile.joinDate.match(/\d{4}/);
      userJoinYear = match ? parseInt(match[0]) : userJoinYear;
    } else {
      const parsedDate = new Date(userProfile.joinDate);
      userJoinYear = isNaN(parsedDate.getTime()) ? userJoinYear : parsedDate.getFullYear();
    }
  }
  
  const currentYear = new Date().getFullYear();
  const yearsAsMember = currentYear - userJoinYear;
  
  // Generate consistent credit score based on user (always middle to good: 600-850)
  const userName = UserDataManager.getCurrentUser() || "User";
  const creditScore = 600 + (userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 251);
  
  // Bank name based on currency
  const bankName = userCurrency === 'GBP' ? "Bank of Ireland UK" : "Bank of Ireland";

  useEffect(() => {
    // Animate score counting up
    const duration = 2000;
    const steps = 60;
    const increment = creditScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= creditScore) {
        setAnimatedScore(creditScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [creditScore]);

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      setLocation(path);
    }, 150);
  };

  const getScoreRating = (score: number) => {
    if (score >= 750) return { label: "Excellent", color: "text-emerald-600", bgColor: "bg-emerald-50", ringColor: "ring-emerald-500" };
    if (score >= 670) return { label: "Good", color: "text-green-600", bgColor: "bg-green-50", ringColor: "ring-green-500" };
    if (score >= 580) return { label: "Fair", color: "text-yellow-600", bgColor: "bg-yellow-50", ringColor: "ring-yellow-500" };
    if (score >= 500) return { label: "Poor", color: "text-orange-600", bgColor: "bg-orange-50", ringColor: "ring-orange-500" };
    return { label: "Very Poor", color: "text-red-600", bgColor: "bg-red-50", ringColor: "ring-red-500" };
  };

  const scoreRating = getScoreRating(creditScore);
  
  // Calculate average account age based on years as member
  const avgYears = Math.max(0, Math.floor(yearsAsMember * 0.8)); // Slightly less than full membership
  const avgMonths = yearsAsMember > 0 ? Math.floor((yearsAsMember * 12 * 0.8) % 12) : 0;
  const avgAgeDescription = yearsAsMember === 0 
    ? "New accounts established" 
    : `Average account age: ${avgYears} ${avgYears === 1 ? 'year' : 'years'}${avgMonths > 0 ? ` ${avgMonths} ${avgMonths === 1 ? 'month' : 'months'}` : ''}`;
  
  const scoreFactors: ScoreFactor[] = [
    {
      name: "Payment History",
      impact: creditScore >= 670 ? "positive" : "neutral",
      description: creditScore >= 670 ? "All payments made on time" : "Some late payments recorded",
      percentage: 35
    },
    {
      name: "Credit Utilization",
      impact: creditScore >= 700 ? "positive" : creditScore >= 600 ? "neutral" : "negative",
      description: creditScore >= 700 ? "Using 28% of available credit" : creditScore >= 600 ? "Using 45% of available credit" : "Using 72% of available credit",
      percentage: 30
    },
    {
      name: "Credit History Length",
      impact: yearsAsMember >= 1 ? "positive" : "neutral",
      description: avgAgeDescription,
      percentage: 15
    },
    {
      name: "Credit Mix",
      impact: creditScore >= 650 ? "positive" : "neutral",
      description: creditScore >= 650 ? "Good variety of credit types" : "Limited credit types",
      percentage: 10
    },
    {
      name: "New Credit",
      impact: creditScore >= 700 ? "positive" : "neutral",
      description: creditScore >= 700 ? "No recent hard inquiries" : "1 inquiry in last 6 months",
      percentage: 10
    }
  ];

  // Calculate account opened dates based on user's join year
  // First account: opened in join year
  // Second account: opened 1 year after join (or join year if member less than 1 year)
  // Third account: opened 2 years after join (or join year if member less than 2 years)
  const account1Year = userJoinYear;
  const account2Year = yearsAsMember >= 1 ? userJoinYear + 1 : userJoinYear;
  const account3Year = yearsAsMember >= 2 ? userJoinYear + 2 : userJoinYear;
  
  const creditAccounts: CreditAccount[] = [
    {
      type: "Credit Card",
      provider: `${bankName} Visa`,
      balance: 850,
      limit: 3000,
      status: "good",
      openedDate: `Jan ${account1Year}`
    },
    {
      type: "Personal Loan",
      provider: bankName,
      balance: 5200,
      limit: 10000,
      status: "good",
      openedDate: `Mar ${account2Year}`
    },
    {
      type: "Credit Card",
      provider: "AIB Mastercard",
      balance: 420,
      limit: 2000,
      status: creditScore >= 650 ? "good" : "fair",
      openedDate: `Aug ${account3Year}`
    }
  ];

  const improvementTips = [
    "Pay all bills on time to maintain positive payment history",
    "Keep credit card balances below 30% of your limit",
    "Avoid opening multiple new credit accounts in a short period",
    "Regularly review your credit report for errors",
    "Keep old credit accounts open to maintain credit history length"
  ];

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
          <div className="text-center px-6 pt-6 pb-4">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Credit Score
            </h2>
            <p className="text-gray-500 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Credit Score Circle */}
          <div className="px-6 mb-8">
            <div className={`relative mx-auto w-56 h-56 ${scoreRating.bgColor} rounded-full flex items-center justify-center ring-8 ${scoreRating.ringColor} ring-opacity-20`}>
              <div className="text-center">
                <div className={`text-6xl font-bold ${scoreRating.color} mb-2 tabular-nums`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {animatedScore}
                </div>
                <div className={`text-sm font-semibold ${scoreRating.color} uppercase tracking-wide`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {scoreRating.label}
                </div>
                <div className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  300 - 850 Range
                </div>
              </div>
            </div>
          </div>

          {/* Score Progress Bar */}
          <div className="px-6 mb-8">
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-emerald-500"
                style={{ 
                  width: `${((animatedScore - 300) / 550) * 100}%`,
                  transition: 'width 0.03s linear'
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              <span>300</span>
              <span>850</span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="px-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Score Factors
            </h3>
            <div className="space-y-3">
              {scoreFactors.map((factor, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {factor.impact === "positive" && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {factor.impact === "negative" && <XCircle className="w-5 h-5 text-red-500" />}
                      {factor.impact === "neutral" && <Minus className="w-5 h-5 text-gray-400" />}
                      <span className="font-semibold text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {factor.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {factor.percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 ml-7" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Accounts */}
          <div className="px-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Credit Accounts
            </h3>
            <div className="space-y-3">
              {creditAccounts.map((account, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {account.type}
                      </h4>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {account.provider}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      account.status === "good" ? "bg-green-100 text-green-700" :
                      account.status === "fair" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {account.status === "good" ? "Good Standing" : account.status === "fair" ? "Fair" : "Review Needed"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      <span className="text-gray-500">Balance:</span>
                      <span className="font-semibold text-gray-900">{userCurrency === 'GBP' ? '£' : '€'}{account.balance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      <span className="text-gray-500">Limit:</span>
                      <span className="font-semibold text-gray-900">{userCurrency === 'GBP' ? '£' : '€'}{account.limit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      <span className="text-gray-500">Opened:</span>
                      <span className="font-semibold text-gray-900">{account.openedDate}</span>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            (account.balance / account.limit) < 0.3 ? "bg-green-500" :
                            (account.balance / account.limit) < 0.5 ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${(account.balance / account.limit) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {Math.round((account.balance / account.limit) * 100)}% utilized
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment History Summary */}
          <div className="px-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Payment History
            </h3>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {creditScore >= 670 ? "Excellent Payment Record" : "Good Payment History"}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {creditScore >= 670 
                      ? "All payments made on time in the last 24 months" 
                      : "Most payments made on time with occasional delays"}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {creditScore >= 670 ? "100%" : "92%"}
                      </div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        On-time
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {creditScore >= 670 ? "0" : "2"}
                      </div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Late
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        0
                      </div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Missed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Tips */}
          <div className="px-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Ways to Improve
            </h3>
            <div className="space-y-3">
              {improvementTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="px-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  This credit score is provided for informational purposes. It is calculated using the data available in your {bankName} accounts. Your actual credit score from credit bureaus may vary. Check your full credit report from credit reference agencies for comprehensive details.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
