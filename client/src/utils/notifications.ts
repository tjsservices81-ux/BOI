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

  const title = 'Transfer successful';
  const body = `€${amount} sent to ${recipient} at ${timeString}`;

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