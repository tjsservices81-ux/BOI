import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Download, Calendar, FileText, Building2, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { UserDataManager } from "@/utils/userDataManager";
import { format } from "date-fns";
import { getUserCurrency, formatCurrency } from "@/utils/currencyUtils";

interface Account {
  id: number | string;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

export default function BankStatements() {
  const [, navigate] = useLocation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 1))); // Default to tomorrow
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

      // Get real user data (transactions, accounts, and profile for email)
      const userTransactions = UserDataManager.getUserTransactions();
      const userAccounts = UserDataManager.getUserAccounts();
      const userProfile = UserDataManager.getUserProfile();
      
      console.log(`Generating statement for account ${selectedAccount} with ${userTransactions.length} transactions and ${userAccounts.length} accounts`);
      console.log('User profile for email:', userProfile?.email ? 'Email found' : 'No email found');
      
      // Generate and download PDF with complete real user data + automatic email delivery
      const response = await fetch('/api/generate-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          dateRange: `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
          userTransactions: userTransactions, // Real transaction data
          userAccounts: userAccounts, // Real account data with balances
          userEmail: userProfile?.email, // For automatic email delivery
          customerName: userProfile?.name || 'Bank of Ireland Customer', // For email personalization
          userAddress: userProfile?.address, // Include user address
          userCurrency: userProfile?.currency // Include user currency preference
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const selectedAccountData = accounts.find(acc => String(acc.id) === selectedAccount);
        const accountIdentifier = selectedAccountData ? UserDataManager.formatAccountNumber(selectedAccountData).replace(/\s+/g, '_') : 'Account';
        const fileName = `BOI_Statement_${accountIdentifier}_${format(startDate, 'ddMMyyyy')}-${format(endDate, 'ddMMyyyy')}.pdf`;
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
        <div className="p-6 space-y-6 pb-40">
          
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
                        {UserDataManager.formatAccountNumber(account)}
                        {UserDataManager.formatAccountSecondary(account) && (
                          <span className="ml-1">• {UserDataManager.formatAccountSecondary(account)}</span>
                        )}
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
                    {formatCurrency(parseFloat(selectedAccountData.balance || '0'), getUserCurrency())}
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
                  Select custom statement period
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Start Date Picker */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-start-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      disabled={(date) => date > new Date() || date > endDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date Picker */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-end-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      disabled={(date) => date > new Date() || date < startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Statement will include transactions from {format(startDate, 'dd/MM/yyyy')} to {format(endDate, 'dd/MM/yyyy')}
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
                  Generate & Email Statement
                </div>
              )}
            </Button>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600 mr-2" />
                <p className="text-xs text-blue-800 text-center" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Statement will be downloaded and automatically emailed to your registered address
                </p>
              </div>
            </div>
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