// Offline Status Indicator Component - Disabled
interface OfflineIndicatorProps {
  customerNumber?: string;
  className?: string;
}

export function OfflineIndicator({ customerNumber, className = '' }: OfflineIndicatorProps) {
  // Component disabled - no longer shows connection status
  return null;
}