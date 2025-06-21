import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Eye, EyeOff } from 'lucide-react';
import { UserDataManager } from '../utils/userDataManager';

interface SpendingData {
  totalSpent: number;
  averageTransaction: number;
  largestTransaction: number;
  spendingByCategory: { [key: string]: number };
  dailySpending: { [key: string]: number };
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export default function SpendingInsights() {
  const [isVisible, setIsVisible] = useState(false);
  const [spendingData, setSpendingData] = useState<SpendingData | null>(null);

  useEffect(() => {
    const calculateSpendingInsights = () => {
      const transactions = UserDataManager.getUserData('bankTransactions', []);
      
      if (transactions.length === 0) {
        setSpendingData(null);
        return;
      }

      const debits = transactions.filter((tx: any) => tx.type === 'debit');
      const amounts = debits.map((tx: any) => Math.abs(parseFloat(tx.amount)));
      
      const totalSpent = amounts.reduce((sum: number, amount: number) => sum + amount, 0);
      const averageTransaction = totalSpent / amounts.length;
      const largestTransaction = Math.max(...amounts);

      // Categorize spending
      const spendingByCategory: { [key: string]: number } = {};
      debits.forEach((tx: any) => {
        const category = getCategoryFromDescription(tx.description);
        const amount = Math.abs(parseFloat(tx.amount));
        spendingByCategory[category] = (spendingByCategory[category] || 0) + amount;
      });

      // Calculate daily spending for trend analysis
      const dailySpending: { [key: string]: number } = {};
      debits.forEach((tx: any) => {
        const date = new Date(tx.timestamp).toDateString();
        const amount = Math.abs(parseFloat(tx.amount));
        dailySpending[date] = (dailySpending[date] || 0) + amount;
      });

      // Simple trend calculation (comparing recent vs older transactions)
      const sortedTransactions = debits.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const recentHalf = sortedTransactions.slice(0, Math.floor(sortedTransactions.length / 2));
      const olderHalf = sortedTransactions.slice(Math.floor(sortedTransactions.length / 2));
      
      const recentAvg = recentHalf.reduce((sum: number, tx: any) => sum + Math.abs(parseFloat(tx.amount)), 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((sum: number, tx: any) => sum + Math.abs(parseFloat(tx.amount)), 0) / olderHalf.length;
      
      const trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
      const trend = Math.abs(trendPercentage) < 5 ? 'stable' : trendPercentage > 0 ? 'up' : 'down';

      setSpendingData({
        totalSpent,
        averageTransaction,
        largestTransaction,
        spendingByCategory,
        dailySpending,
        trend,
        trendPercentage: Math.abs(trendPercentage)
      });
    };

    calculateSpendingInsights();
    const interval = setInterval(calculateSpendingInsights, 5000);
    return () => clearInterval(interval);
  }, []);

  const getCategoryFromDescription = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('transfer')) return 'Transfers';
    if (desc.includes('atm') || desc.includes('withdrawal')) return 'Cash';
    if (desc.includes('electric') || desc.includes('direct debit')) return 'Bills';
    if (desc.includes('restaurant') || desc.includes('food')) return 'Dining';
    if (desc.includes('online') || desc.includes('purchase')) return 'Shopping';
    return 'Other';
  };

  const formatCurrency = (amount: number) => 
    `€${amount.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!spendingData) return null;

  return (
    <div className="fixed top-20 right-4 z-20">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-3 shadow-lg hover:bg-white transition-all duration-200"
      >
        {isVisible ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
      </button>

      {isVisible && (
        <div className="mt-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-xl w-80 animate-in slide-in-from-right duration-300">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            <DollarSign className="w-4 h-4 mr-2 text-[#126987]" />
            Spending Insights
          </h3>

          <div className="space-y-4">
            {/* Total spent and trend */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Total Spent</p>
                <p className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {formatCurrency(spendingData.totalSpent)}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {spendingData.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                {spendingData.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                {spendingData.trend !== 'stable' && (
                  <span className={`text-sm font-medium ${spendingData.trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                    {spendingData.trendPercentage.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Average transaction */}
            <div>
              <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Average Transaction</p>
              <p className="text-base font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {formatCurrency(spendingData.averageTransaction)}
              </p>
            </div>

            {/* Category breakdown */}
            <div>
              <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>Top Categories</p>
              <div className="space-y-2">
                {Object.entries(spendingData.spendingByCategory)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([category, amount]) => {
                    const percentage = (amount / spendingData.totalSpent) * 100;
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCategoryColor(category) }}
                          />
                          <span className="text-sm text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            {category}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            {formatCurrency(amount)}
                          </p>
                          <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Visual spending bar */}
            <div>
              <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>Spending Distribution</p>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                {Object.entries(spendingData.spendingByCategory)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, amount], index) => {
                    const percentage = (amount / spendingData.totalSpent) * 100;
                    return (
                      <div
                        key={category}
                        className="h-full float-left"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(category)
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Transfers': '#126987',
      'Cash': '#6b7280',
      'Bills': '#ef4444',
      'Dining': '#f59e0b',
      'Shopping': '#8b5cf6',
      'Other': '#64748b'
    };
    return colors[category] || colors['Other'];
  }
}