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
    if (user) {
      const userAccounts = UserDataManager.getUserData('userAccounts', []);
      setAccounts(userAccounts);
      if (userAccounts.length > 0) {
        setSelectedAccount(userAccounts[0]);
      }
    }
  }, [user]);

  const generateStatement = async () => {
    if (!selectedAccount || !user) return;

    setIsGenerating(true);

    try {
      // Get transactions for the selected account
      const allTransactions = UserDataManager.getUserData('bankTransactions', []);
      const accountTransactions = allTransactions
        .filter((tx: any) => tx.accountId === selectedAccount.id.toString())
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-20); // Last 20 transactions

      // Calculate running balances
      let runningBalance = 185.83; // Starting balance forward
      const transactionsWithBalance: Transaction[] = accountTransactions.map((tx: any, index: number) => {
        const amount = parseFloat(tx.amount);
        const isCredit = tx.type === 'credit' || amount > 0;
        runningBalance += isCredit ? Math.abs(amount) : -Math.abs(amount);
        
        return {
          id: tx.id,
          date: new Date(tx.timestamp).toLocaleDateString('en-IE'),
          description: tx.description || tx.merchant || 'Bank Transfer',
          amount: Math.abs(amount),
          type: isCredit ? 'credit' : 'debit',
          balance: runningBalance
        };
      });

      await generatePDFStatement(selectedAccount, transactionsWithBalance, user);
    } catch (error) {
      console.error('Error generating statement:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDFStatement = async (account: Account, transactions: Transaction[], userInfo: any) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // Bank of Ireland Blue
    const boiBlue: [number, number, number] = [18, 105, 135];
    
    // Header Section
    pdf.setFillColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    // Bank Logo Area (white background for logo)
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, 8, 60, 19, 'F');
    
    // Bank of Ireland text (logo placeholder)
    pdf.setTextColor(18, 105, 135);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bank of Ireland', margin + 2, 20);
    
    // Statement title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BANK STATEMENT', pageWidth - margin - 50, 25);

    // Customer Information Section
    let yPos = 50;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Customer details
    const customerInfo = UserDataManager.getUserProfile();
    pdf.text(`${customerInfo?.name || user?.name || 'Customer Name'}`, margin, yPos);
    pdf.text(`${customerInfo?.address || '123 Main Street'}`, margin, yPos + 5);
    pdf.text(`Dublin 2, Ireland`, margin, yPos + 10);
    
    // Account details (right side)
    pdf.setFont('helvetica', 'bold');
    pdf.text('Account Details:', pageWidth - margin - 60, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Account: ${account.displayName}`, pageWidth - margin - 60, yPos + 5);
    pdf.text(`Number: ${account.accountNumber}`, pageWidth - margin - 60, yPos + 10);
    pdf.text(`IBAN: IE29 BOFI 9000 ${account.accountNumber}`, pageWidth - margin - 60, yPos + 15);
    
    // Statement period
    yPos += 30;
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Statement Period:', margin, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${startDate.toLocaleDateString('en-IE')} to ${currentDate.toLocaleDateString('en-IE')}`, margin + 35, yPos);
    
    pdf.text(`Statement Date: ${currentDate.toLocaleDateString('en-IE')}`, pageWidth - margin - 50, yPos);

    // Balance Summary
    yPos += 15;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Balance Summary', margin + 5, yPos + 8);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Balance Forward:', margin + 5, yPos + 15);
    pdf.text('€185.83', margin + 40, yPos + 15);
    
    pdf.text('Current Balance:', margin + 80, yPos + 15);
    pdf.text(`€${account.balance}`, margin + 115, yPos + 15);

    // Transaction Table Header
    yPos += 35;
    pdf.setFillColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Date', margin + 2, yPos + 6);
    pdf.text('Transaction Details', margin + 25, yPos + 6);
    pdf.text('Payments Out', margin + 85, yPos + 6);
    pdf.text('Payments In', margin + 115, yPos + 6);
    pdf.text('Balance', margin + 145, yPos + 6);

    // Transaction Rows
    yPos += 8;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    transactions.forEach((transaction, index) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = 30;
      }

      const rowColor: [number, number, number] = index % 2 === 0 ? [255, 255, 255] : [248, 248, 248];
      pdf.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');

      pdf.text(transaction.date, margin + 2, yPos + 4);
      
      // Truncate long descriptions
      const description = transaction.description.length > 30 
        ? transaction.description.substring(0, 30) + '...'
        : transaction.description;
      pdf.text(description, margin + 25, yPos + 4);
      
      if (transaction.type === 'debit') {
        pdf.text(`€${transaction.amount.toFixed(2)}`, margin + 85, yPos + 4);
      } else {
        pdf.text(`€${transaction.amount.toFixed(2)}`, margin + 115, yPos + 4);
      }
      
      pdf.text(`€${transaction.balance?.toFixed(2) || '0.00'}`, margin + 145, yPos + 4);
      
      yPos += 6;
    });

    // Footer
    yPos = pageHeight - 25;
    pdf.setFillColor(boiBlue[0], boiBlue[1], boiBlue[2]);
    pdf.rect(0, yPos, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Bank of Ireland is regulated by the Central Bank of Ireland', margin, yPos + 8);
    pdf.text('www.bankofireland.com', margin, yPos + 15);

    // Generate filename and save
    const filename = `BOI_Statement_${account.accountNumber}_${currentDate.toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 page-fade-in">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm">
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

      <div className="p-6 space-y-6">
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
                  onClick={() => setSelectedAccount(account)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-[var(--boi-gray)]">{account.displayName}</p>
                      <p className="text-sm text-[var(--boi-light-gray)]">
                        {account.accountNumber} • {account.accountType}
                      </p>
                    </div>
                    <p className="font-semibold text-[var(--boi-gray)]">€{account.balance}</p>
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
        <Card>
          <CardContent className="p-4">
            <Button
              onClick={generateStatement}
              disabled={!selectedAccount || isGenerating}
              className="w-full bg-[var(--boi-green)] hover:bg-[var(--boi-green)]/90 text-white py-3"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Statement...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF Statement
                </>
              )}
            </Button>
            
            <p className="text-sm text-[var(--boi-light-gray)] mt-3 text-center">
              Your statement will be downloaded as a PDF file
            </p>
          </CardContent>
        </Card>

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