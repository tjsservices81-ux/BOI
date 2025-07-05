import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Download, Calendar, FileText, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserDataManager } from "@/utils/userDataManager";

interface Account {
  id: number | string;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

type DateRange = '1week' | '2weeks' | '1month';

const dateRangeOptions = [
  { value: '1week', label: '1 Week', days: 7 },
  { value: '2weeks', label: '2 Weeks', days: 14 },
  { value: '1month', label: '1 Month', days: 30 }
];

export default function BankStatements() {
  const [, navigate] = useLocation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('1month');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    // Load user accounts
    const userAccounts = UserDataManager.getUserData('bankAccounts', []);
    setAccounts(userAccounts);
    
    // Set default account if available
    if (userAccounts.length > 0) {
      setSelectedAccount(String(userAccounts[0].id));
    }
  }, []);

  const generateStatement = async () => {
    if (!selectedAccount) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Progress simulation
      const progressSteps = [
        { message: 'Collecting transaction data...', progress: 20 },
        { message: 'Formatting statement...', progress: 50 },
        { message: 'Generating PDF...', progress: 80 },
        { message: 'Finalizing document...', progress: 100 }
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setGenerationProgress(step.progress);
      }

      // Get date range
      const dateRange = dateRangeOptions.find(range => range.value === selectedDateRange);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (dateRange?.days || 30));

      // Generate and download PDF
      const response = await fetch('/api/generate-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          dateRange: selectedDateRange
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const selectedAccountData = accounts.find(acc => String(acc.id) === selectedAccount);
        const fileName = `BOI_Statement_${selectedAccountData?.accountNumber}_${selectedDateRange}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Reset state after successful download
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationProgress(0);
        }, 1000);
      } else {
        throw new Error('Failed to generate statement');
      }
    } catch (error) {
      console.error('Statement generation failed:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      alert('Failed to generate statement. Please try again.');
    }
  };

  const selectedAccountData = accounts.find(acc => String(acc.id) === selectedAccount);

  return (
    <div className="h-screen bg-gradient-to-br from-[#126987] to-[#0d4e63] flex flex-col overflow-hidden page-slide-up">
      {/* Header */}
      <div className="bg-[#126987] px-4 py-6 pt-12 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/more')}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center justify-center">
            <img 
              src="/boi_logo.svg" 
              alt="Bank of Ireland" 
              className="h-8 w-auto filter brightness-0 invert"
            />
          </div>
          
          <div className="w-10 h-10"></div>
        </div>
        
        <div className="text-center mt-4">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Bank Statements
          </h1>
          <p className="text-white/80 text-sm mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Generate and download your statements
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 overflow-y-auto" style={{ 
        borderTopLeftRadius: '1.5rem',
        borderTopRightRadius: '1.5rem',
        marginTop: '-1.5rem'
      }}>
        <div className="p-6 space-y-6">
          
          {/* Account Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Select Account
                </h2>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Choose which account to generate statement for
                </p>
              </div>
            </div>
            
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{account.displayName}</span>
                      <span className="text-sm text-gray-500">
                        {account.accountNumber}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAccountData && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Current Balance
                  </span>
                  <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    €{selectedAccountData.balance}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Date Range Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Date Range
                </h2>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Select statement period
                </p>
              </div>
            </div>
            
            <Select value={selectedDateRange} onValueChange={(value: DateRange) => setSelectedDateRange(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Statement will include transactions from the last {dateRangeOptions.find(r => r.value === selectedDateRange)?.label.toLowerCase()}
              </p>
            </div>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Generating Statement
                  </h2>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Please wait while we prepare your document
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#126987] h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {generationProgress}% Complete
                </p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <Button
              onClick={generateStatement}
              disabled={!selectedAccount || isGenerating}
              className="w-full bg-[#126987] hover:bg-[#0d4e63] text-white font-semibold py-4 text-lg rounded-xl transition-all duration-200 active:scale-98"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Generating...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Download className="w-5 h-5 mr-2" />
                  Generate Statement
                </div>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Your statement will be downloaded as a PDF file
            </p>
          </div>

          {/* Info Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Official Bank Statement
                </h3>
                <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  This statement is an official Bank of Ireland document that can be used for official purposes, loan applications, and financial records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}