// Offline Status Indicator Component
import { useOfflineStatus } from '../hooks/useOfflineStatus';

interface OfflineIndicatorProps {
  customerNumber?: string;
  className?: string;
}

export function OfflineIndicator({ customerNumber, className = '' }: OfflineIndicatorProps) {
  const { isOnline, canAccessOffline, timeRemaining } = useOfflineStatus(customerNumber);

  if (isOnline) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-xs text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          Online
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${canAccessOffline ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
      <span className="text-xs text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
        {canAccessOffline ? `Offline (${timeRemaining || 'Limited'})` : 'Offline'}
      </span>
    </div>
  );
}