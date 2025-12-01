/**
 * Transfer Notification System
 * Handles push notifications for completed transfers
 */

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

/**
 * Prompts for notification permission exactly once during account creation
 * and updates the server with the result
 * @param userId - The customer number/user ID
 */
export function promptNotificationsAtCreation(userId: string): void {
  if (!('Notification' in window)) {
    console.log('Notifications not supported on this device');
    fetch('/api/set-notifications-flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, notifications_enabled: false })
    }).catch(console.error);
    return;
  }

  Notification.requestPermission().then(permission => {
    const enabled = permission === 'granted';

    fetch('/api/set-notifications-flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, notifications_enabled: enabled })
    }).catch(console.error);

    if (enabled) {
      console.log('Notifications granted, account fully active.');
    }
  });
}

/**
 * Requests notification permission from the user
 * @returns Promise<boolean> - true if permission is granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Sends a push notification for completed transfer
 * @param recipient - Name of the recipient
 * @param amount - Transfer amount (e.g., "200.00")
 */
export async function sendTransferNotification(recipient: string, amount: string): Promise<void> {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-IE', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  // Get user currency for proper display
  const { getUserCurrency, getCurrencySymbol } = await import('./currencyUtils');
  const userCurrency = getUserCurrency();
  const currencySymbol = getCurrencySymbol(userCurrency);

  const title = '';
  const body = `Transfer successful\n${currencySymbol} ${amount} sent to ${recipient} at ${timeString}`;

  // Add 5-second delay as requested
  setTimeout(async () => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('Notifications not supported, using alert fallback');
        alert(`${title}\n${body}`);
        return;
      }

      // Request permission if not already granted
      const hasPermission = await requestNotificationPermission();

      if (hasPermission) {
        // Create and show notification
        const notification = new Notification(title, {
          body: body,
          icon: '/assets/logo.png',
          badge: '/assets/logo.png',
          tag: 'transfer-notification', // Replace previous notifications
          requireInteraction: false,
          silent: false
        });

        // Auto-close notification after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Optional: Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

      } else {
        // Fallback to alert if permission denied or not available
        console.log('Notification permission denied, using alert fallback');
        alert(`${title}\n${body}`);
      }

    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to alert on error
      alert(`${title}\n${body}`);
    }
  }, 5000); // 5-second delay
}

/**
 * Sends a push notification for newly added payee
 * @param payeeName - Name of the new payee
 * @param accountInfo - Account information (IBAN, sort code, etc.)
 */
export async function sendNewPayeeNotification(payeeName: string, accountInfo: string): Promise<void> {
  const title = 'New Payee Added';
  const body = `${payeeName} has been added to your payees\n${accountInfo}`;

  // Add 2-second delay
  setTimeout(async () => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return;
      }

      // Request permission if not already granted
      const hasPermission = await requestNotificationPermission();

      if (hasPermission) {
        // Create and show notification
        const notification = new Notification(title, {
          body: body,
          icon: '/assets/logo.png',
          badge: '/assets/logo.png',
          tag: 'payee-notification',
          requireInteraction: false,
          silent: false
        });

        // Auto-close notification after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Optional: Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

      }

    } catch (error) {
      console.error('Error showing payee notification:', error);
    }
  }, 2000); // 2-second delay
}