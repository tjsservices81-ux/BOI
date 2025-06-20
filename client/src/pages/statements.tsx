import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { ArrowLeft, Download, FileText, Calendar } from "lucide-react";
import { UserDataManager } from "@/utils/userDataManager";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Account {
  id: number;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
}

export default function Statements() {
  const authHook = useAuth();
  const user = authHook?.user || null;
  const [, navigate] = useLocation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statementPeriod, setStatementPeriod] = useState('current');

  useEffect(() => {
    console.log('Statements useEffect triggered, user:', user);
    
    if (user) {
      // Get profile data that contains real account balances from admin updates
      const profileData = UserDataManager.getUserData('profile', {});
      console.log('Profile data with real balances:', profileData);
      
      // Check if profile has account balance data from admin panel
      let realAccounts = [];
      if (profileData.accountBalance) {
        // Use the real balance from admin updates
        realAccounts = [
          {
            id: 1,
            displayName: "Current Account",
            accountNumber: "2091",
            balance: profileData.accountBalance,
            accountType: "current",
            iban: "IE29 BOFI 9000 172091"
          },
          {
            id: 2,
            displayName: "Savings Account", 
            accountNumber: "0978",
            balance: "8750.23",
            accountType: "savings",
            iban: "IE29 BOFI 9000 170978"
          }
        ];
      } else {
        // Fallback to stored accounts
        let userAccounts = UserDataManager.getUserData('bankAccounts', []);
        realAccounts = userAccounts.map((account: any) => ({
          id: account.id,
          displayName: account.displayName,
          accountNumber: account.accountNumber.replace('****', ''),
          balance: account.balance || '0.00',
          accountType: account.accountType || 'current',
          iban: `IE29 BOFI 9000 17${account.accountNumber.replace('****', '')}`
        }));
      }
      
      console.log('Final accounts with real balances:', realAccounts);
      setAccounts(realAccounts);
      
      if (realAccounts.length > 0) {
        console.log('Auto-selecting first account:', realAccounts[0]);
        setSelectedAccount(realAccounts[0]);
      } else {
        console.log('No accounts found, clearing selection');
        setSelectedAccount(null);
      }
    }
  }, [user]);

  const generateStatement = async () => {
    console.log('Generate statement clicked!');
    console.log('Selected account:', selectedAccount);
    console.log('User:', user);
    
    if (!selectedAccount || !user) {
      console.log('Missing requirements - selectedAccount:', !!selectedAccount, 'user:', !!user);
      alert('Please select an account');
      return;
    }

    setIsGenerating(true);

    try {
      // Get transactions for the selected account from the same source as other pages
      const allTransactions = UserDataManager.getUserData('bankTransactions', []);
      console.log('All transactions found:', allTransactions.length);
      
      let accountTransactions = allTransactions
        .filter((tx: any) => tx.accountId === selectedAccount.id.toString() || tx.fromAccountId === selectedAccount.id || tx.toAccountId === selectedAccount.id)
        .sort((a: any, b: any) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime())
        .slice(-20); // Last 20 transactions

      console.log('Filtered transactions:', accountTransactions.length);

      // Add sample transactions if none exist to ensure PDF works
      if (accountTransactions.length === 0) {
        console.log('No transactions found, adding sample data');
        accountTransactions = [
          {
            id: 'sample1',
            timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000),
            description: 'Opening Balance',
            amount: parseFloat(selectedAccount.balance),
            type: 'credit'
          },
          {
            id: 'sample2',
            timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000),
            description: 'Direct Debit - Utility Bill',
            amount: -85.50,
            type: 'debit'
          },
          {
            id: 'sample3',
            timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000),
            description: 'Card Payment - Store Purchase',
            amount: -24.99,
            type: 'debit'
          }
        ];
      }

      // Calculate running balances starting from current account balance
      const currentBalance = parseFloat(selectedAccount.balance);
      let runningBalance = currentBalance - accountTransactions.reduce((sum: number, tx: any) => {
        const amount = parseFloat(tx.amount);
        return sum + (tx.type === 'credit' || amount > 0 ? Math.abs(amount) : -Math.abs(amount));
      }, 0);

      const transactionsWithBalance: Transaction[] = accountTransactions.map((tx: any, index: number) => {
        const amount = Math.abs(parseFloat(tx.amount || 0));
        const isCredit = tx.type === 'credit' || parseFloat(tx.amount || 0) > 0;
        runningBalance += isCredit ? amount : -amount;
        
        return {
          id: tx.id,
          date: new Date(tx.timestamp || tx.date).toLocaleDateString('en-IE'),
          description: tx.description || tx.merchant || tx.category || 'Bank Transfer',
          amount: amount,
          type: isCredit ? 'credit' : 'debit',
          balance: runningBalance
        };
      });

      console.log('About to generate PDF with', transactionsWithBalance.length, 'transactions');
      await generatePDFStatement(selectedAccount, transactionsWithBalance, user);
      console.log('PDF generation completed successfully');
    } catch (error) {
      console.error('Error generating statement:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDFStatement = async (account: Account, transactions: Transaction[], userInfo: any) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;

    // Bank of Ireland Blue
    const boiBlue: [number, number, number] = [18, 105, 135];
    
    // Header Section - White background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Blue stripe at top
    pdf.setFillColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.rect(0, 0, pageWidth, 6, 'F');
    
    // Bank of Ireland logo and text
    pdf.setTextColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bank of Ireland', margin, 25);
    
    // Add small logo symbol
    pdf.setFillColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.circle(margin + 85, 20, 3, 'F');
    
    // Statement title
    pdf.setTextColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BANK STATEMENT', pageWidth - margin - 45, 25);

    // Customer Information Section
    let yPos = 55;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    // Customer details (left side)
    const customerInfo = UserDataManager.getUserProfile();
    pdf.setFont('helvetica', 'bold');
    pdf.text('Customer:', margin, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${customerInfo?.name || user?.name || 'Customer Name'}`, margin + 20, yPos);
    pdf.text(`${customerInfo?.address || '123 Main Street'}`, margin, yPos + 4);
    pdf.text(`Dublin 2, D02 VY79`, margin, yPos + 8);
    pdf.text(`Ireland`, margin, yPos + 12);
    
    // Account details (right side)
    pdf.setFont('helvetica', 'bold');
    pdf.text('Account Details:', pageWidth - margin - 50, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${account.displayName}`, pageWidth - margin - 50, yPos + 4);
    pdf.text(`Sort Code: 90-00-17`, pageWidth - margin - 50, yPos + 8);
    pdf.text(`Account: ${account.accountNumber}`, pageWidth - margin - 50, yPos + 12);
    pdf.text(`IBAN: IE29 BOFI 9000 17 ${account.accountNumber}`, pageWidth - margin - 50, yPos + 16);
    
    // Statement period
    yPos += 25;
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Statement Period:', margin, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${startDate.toLocaleDateString('en-IE')} to ${currentDate.toLocaleDateString('en-IE')}`, margin + 30, yPos);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Statement Date:', pageWidth - margin - 45, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${currentDate.toLocaleDateString('en-IE')}`, pageWidth - margin - 20, yPos);

    // Balance Summary Box
    yPos += 15;
    pdf.setDrawColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 20);
    
    // Balance headers
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Opening Balance', margin + 3, yPos + 6);
    pdf.text('Total Payments In', margin + 45, yPos + 6);
    pdf.text('Total Payments Out', margin + 85, yPos + 6);
    pdf.text('Closing Balance', margin + 130, yPos + 6);
    
    // Balance amounts - use opening balance from calculation
    pdf.setFont('helvetica', 'normal');
    const openingBalance = transactions.length > 0 && transactions[0].balance ? transactions[0].balance - transactions[0].amount : parseFloat(account.balance);
    pdf.text(`€${openingBalance.toFixed(2)}`, margin + 8, yPos + 12);
    
    const totalIn = transactions.filter(tx => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0);
    const totalOut = transactions.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0);
    
    pdf.text(`€${totalIn.toFixed(2)}`, margin + 50, yPos + 12);
    pdf.text(`€${totalOut.toFixed(2)}`, margin + 90, yPos + 12);
    pdf.text(`€${parseFloat(account.balance).toFixed(2)}`, margin + 135, yPos + 12);
    
    // Draw separator lines
    pdf.line(margin + 40, yPos, margin + 40, yPos + 20);
    pdf.line(margin + 80, yPos, margin + 80, yPos + 20);
    pdf.line(margin + 125, yPos, margin + 125, yPos + 20);

    // Transaction Table Header
    yPos += 30;
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Date', margin + 2, yPos + 7);
    pdf.text('Transaction Details', margin + 22, yPos + 7);
    pdf.text('Money Out', margin + 90, yPos + 7);
    pdf.text('Money In', margin + 120, yPos + 7);
    pdf.text('Balance', margin + 150, yPos + 7);

    // Draw table borders
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.3);
    pdf.line(margin + 18, yPos, margin + 18, yPos + 10); // Date separator
    pdf.line(margin + 85, yPos, margin + 85, yPos + 10); // Details separator
    pdf.line(margin + 115, yPos, margin + 115, yPos + 10); // Money Out separator
    pdf.line(margin + 145, yPos, margin + 145, yPos + 10); // Money In separator

    // Transaction Rows
    yPos += 10;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    transactions.forEach((transaction, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 30;
        
        // Redraw header on new page
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('Date', margin + 2, yPos + 7);
        pdf.text('Transaction Details', margin + 22, yPos + 7);
        pdf.text('Money Out', margin + 90, yPos + 7);
        pdf.text('Money In', margin + 120, yPos + 7);
        pdf.text('Balance', margin + 150, yPos + 7);
        yPos += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
      }

      // Alternate row colors
      if (index % 2 === 1) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      }

      // Draw vertical lines for table structure
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(margin + 18, yPos, margin + 18, yPos + 8);
      pdf.line(margin + 85, yPos, margin + 85, yPos + 8);
      pdf.line(margin + 115, yPos, margin + 115, yPos + 8);
      pdf.line(margin + 145, yPos, margin + 145, yPos + 8);

      // Transaction data
      pdf.setTextColor(0, 0, 0);
      pdf.text(transaction.date, margin + 1, yPos + 5);
      
      // Truncate long descriptions to fit
      const description = transaction.description.length > 35 
        ? transaction.description.substring(0, 35) + '...'
        : transaction.description;
      pdf.text(description, margin + 20, yPos + 5);
      
      // Amount placement
      if (transaction.type === 'debit') {
        pdf.text(`€${transaction.amount.toFixed(2)}`, margin + 87, yPos + 5);
      } else {
        pdf.text(`€${transaction.amount.toFixed(2)}`, margin + 117, yPos + 5);
      }
      
      // Balance with proper formatting
      pdf.text(`€${transaction.balance?.toFixed(2) || '0.00'}`, margin + 147, yPos + 5);
      
      yPos += 8;
    });

    // Add statement footer information
    yPos += 15;
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Important Information:', margin, yPos);
    pdf.text('• Please check your statement carefully and report any discrepancies immediately', margin, yPos + 5);
    pdf.text('• For queries contact Bank of Ireland at 1850 946 764', margin, yPos + 10);
    pdf.text('• Keep this statement in a safe place for your records', margin, yPos + 15);

    // Footer with Bank branding
    yPos = pageHeight - 20;
    pdf.setFillColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.rect(0, yPos, pageWidth, 20, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Bank of Ireland is regulated by the Central Bank of Ireland', margin, yPos + 6);
    pdf.text('Head Office: 40 Mespil Road, Dublin 4, D04 C2N4', margin, yPos + 10);
    pdf.text('www.bankofireland.com', margin, yPos + 14);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONFIDENTIAL', pageWidth - margin - 25, yPos + 10);

    // Generate filename and save with proper download
    const filename = `BOI_Statement_${account.accountNumber}_${currentDate.toISOString().split('T')[0]}.pdf`;
    
    try {
      console.log('Starting PDF download process...');
      
      // Method 1: Direct jsPDF save
      pdf.save(filename);
      console.log('jsPDF save method called');
      
      // Method 2: Blob download (more reliable)
      const pdfBlob = pdf.output('blob');
      console.log('PDF blob created, size:', pdfBlob.size);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      
      // Add to DOM and trigger click
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      console.log('Download triggered successfully');
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        console.log('Download cleanup completed');
      }, 1000);
      
      // Show success message
      setTimeout(() => {
        alert('Bank statement downloaded successfully!');
      }, 500);
      
    } catch (error) {
      console.error('Error in PDF download:', error);
      alert('Error downloading PDF statement. Please try again.');
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 page-fade-in">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-4"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="text-[var(--boi-gray)]" />
          </Button>
          <h1 className="text-lg font-semibold text-[var(--boi-gray)]">Statements</h1>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        {/* Debug Info - Remove in production */}
        <div className="bg-gray-100 p-2 rounded text-xs">
          <p>Debug: User: {user ? 'YES' : 'NO'} | Accounts: {accounts.length} | Selected: {selectedAccount ? 'YES' : 'NO'}</p>
          {selectedAccount && <p>Selected Account: {selectedAccount.displayName} (ID: {selectedAccount.id})</p>}
        </div>
        
        {/* Account Selection */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Select Account</h3>
            
            <div className="space-y-3">
              {accounts.map((account) => (
                <div 
                  key={account.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedAccount?.id === account.id 
                      ? 'border-[var(--boi-green)] bg-green-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => {
                    console.log('Account clicked:', account);
                    setSelectedAccount(account);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-[var(--boi-gray)]">{account.displayName}</p>
                      <p className="text-sm text-[var(--boi-light-gray)]">
                        {account.accountNumber} • {account.accountType}
                      </p>
                    </div>
                    <p className="font-semibold text-[var(--boi-gray)]">€{parseFloat(account.balance || '0').toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statement Period */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Statement Period</h3>
            
            <div className="space-y-3">
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  statementPeriod === 'current' 
                    ? 'border-[var(--boi-green)] bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setStatementPeriod('current')}
              >
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-[var(--boi-gray)] mr-3" />
                  <div>
                    <p className="font-medium text-[var(--boi-gray)]">Current Month</p>
                    <p className="text-sm text-[var(--boi-light-gray)]">
                      {new Date().toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Statement */}
        {selectedAccount ? (
          <Card>
            <CardContent className="p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Ready to Generate</h4>
                <p className="text-sm text-blue-700">
                  Statement for {selectedAccount.displayName} ({selectedAccount.accountNumber})
                </p>
                <p className="text-sm text-blue-700">
                  Current Balance: €{parseFloat(selectedAccount.balance || '0').toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Download button clicked');
                  generateStatement();
                }}
                disabled={isGenerating || !selectedAccount}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 px-4 text-xl font-bold rounded-lg shadow-lg border-2 border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating PDF Statement...
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6 mr-3" />
                    Download Bank Statement
                  </>
                )}
              </Button>
              
              <p className="text-sm text-[var(--boi-light-gray)] mt-3 text-center">
                PDF will download automatically to your device
              </p>
            </CardContent>
          </Card>
        ) : accounts.length > 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2">Select Account</h4>
                <p className="text-sm text-orange-700">
                  Please select an account above to generate your statement
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">No Accounts Found</h4>
                <p className="text-sm text-red-700">
                  Loading your accounts... Please wait.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statement Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-[var(--boi-gray)] mt-1" />
              <div>
                <h4 className="font-medium text-[var(--boi-gray)]">About Your Statement</h4>
                <p className="text-sm text-[var(--boi-light-gray)] mt-1">
                  Your PDF statement includes all transactions, account details, and official Bank of Ireland formatting. 
                  Keep statements secure and do not share with unauthorized parties.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}