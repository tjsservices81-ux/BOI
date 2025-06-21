// Hook for monitoring offline status and managing offline functionality
import { useState, useEffect } from 'react';
import { OfflineAuthManager } from '../utils/offlineAuthManager';

interface OfflineStatus {
  isOnline: boolean;
  canAccessOffline: boolean;
  timeRemaining?: string;
  lastChecked: number;
}

export function useOfflineStatus(customerNumber?: string) {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    canAccessOffline: false,
    lastChecked: Date.now()
  });

  const checkStatus = async () => {
    const isOnline = OfflineAuthManager.isOnline();
    let canAccessOffline = false;
    let timeRemaining: string | undefined;

    if (!isOnline && customerNumber) {
      try {
        const offlineEligibility = await OfflineAuthManager.canLoginOffline(customerNumber);
        canAccessOffline = offlineEligibility.allowed;
        timeRemaining = offlineEligibility.timeRemaining;
      } catch (error) {
        console.error('Failed to check offline status:', error);
      }
    }

    setStatus({
      isOnline,
      canAccessOffline,
      timeRemaining,
      lastChecked: Date.now()
    });
  };

  useEffect(() => {
    // Initial check
    checkStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('📶 Connection restored');
      checkStatus();
      
      // Sync data when coming back online
      if (customerNumber) {
        OfflineAuthManager.syncOnReconnect(customerNumber);
      }
    };

    const handleOffline = () => {
      console.log('📵 Connection lost');
      checkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [customerNumber]);

  return {
    ...status,
    refresh: checkStatus
  };
}