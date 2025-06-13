import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface ChartData {
  date: string;
  amount: number;
}

interface MiniSpendingChartProps {
  accountId: number;
}

export default function MiniSpendingChart({ accountId }: MiniSpendingChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const calculateChartData = () => {
      // Use UserDataManager for consistent data access
      const allTransactions = UserDataManager.getUserTransactions();
      
      // Early return if no transactions
      if (allTransactions.length === 0) {
        setChartData([]);
        setTrend('stable');
        return;
      }

      const accountTransactions = allTransactions.filter((tx: any) => 
        tx.accountId === accountId && tx.type === 'debit'
      );

      // Optimize date calculations - calculate once
      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        return date.toDateString();
      }).reverse();

      const dailySpending: ChartData[] = last7Days.map(dateString => {
        const dayTotal = accountTransactions
          .filter((tx: any) => new Date(tx.timestamp).toDateString() === dateString)
          .reduce((sum: number, tx: any) => sum + Math.abs(parseFloat(tx.amount) || 0), 0);

        return {
          date: new Date(dateString).toLocaleDateString('en-IE', { weekday: 'short' }),
          amount: dayTotal
        };
      });

      setChartData(dailySpending);

      // Optimized trend calculation
      if (dailySpending.length >= 6) {
        const recentSum = dailySpending.slice(-3).reduce((sum, day) => sum + day.amount, 0);
        const olderSum = dailySpending.slice(0, 3).reduce((sum, day) => sum + day.amount, 0);
        
        const diff = recentSum - olderSum;
        setTrend(Math.abs(diff) < 30 ? 'stable' : diff > 0 ? 'up' : 'down');
      } else {
        setTrend('stable');
      }
    };

    calculateChartData();
  }, [accountId]);

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  if (chartData.every(d => d.amount === 0)) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-[#126987]" />
          <h4 className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Weekly Spending
          </h4>
        </div>
        <div className="flex items-center space-x-1">
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
          <button 
            onClick={() => setIsVisible(!isVisible)}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            {isVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {isVisible && (
        <div className="flex items-end justify-between space-x-1 h-16">
          {chartData.map((day, index) => (
            <div key={day.date} className="flex flex-col items-center flex-1">
              <div className="relative w-full">
                <div 
                  className="bg-gradient-to-t from-[#126987] to-[#5a7b85] rounded-sm transition-all duration-500 ease-out"
                  style={{ 
                    height: `${Math.max((day.amount / maxAmount) * 40, day.amount > 0 ? 2 : 0)}px`,
                    width: '100%'
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {day.date}
              </span>
            </div>
          ))}
        </div>
      )}

      {isVisible && chartData.some(d => d.amount > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-600">
            <span style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Total: €{chartData.reduce((sum, day) => sum + day.amount, 0).toFixed(2)}
            </span>
            <span style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Avg: €{(chartData.reduce((sum, day) => sum + day.amount, 0) / 7).toFixed(2)}/day
            </span>
          </div>
        </div>
      )}
    </div>
  );
}