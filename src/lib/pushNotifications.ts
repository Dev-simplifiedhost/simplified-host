/**
 * Push Notification Service
 * Uses the browser's Notification API for local notifications
 * No service worker push subscription needed for this implementation
 */

export const pushNotificationService = {
  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return "Notification" in window;
  },

  /**
   * Get current permission state
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return "denied";
    return Notification.permission;
  },

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  },

  /**
   * Show a local notification
   */
  showNotification(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported() || this.getPermission() !== "granted") {
      return null;
    }
    
    try {
      const notification = new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });
      
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
      
      return notification;
    } catch (error) {
      console.error("Error showing notification:", error);
      return null;
    }
  },

  /**
   * Show notification with click handler
   */
  showNotificationWithAction(
    title: string, 
    options: NotificationOptions & { onClick?: () => void }
  ): Notification | null {
    const notification = this.showNotification(title, options);
    
    if (notification && options.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }
    
    return notification;
  },

  /**
   * Schedule a notification (using setTimeout, cleared on page unload)
   * Returns a cleanup function
   */
  scheduleNotification(
    title: string, 
    options: NotificationOptions, 
    delayMs: number
  ): () => void {
    const timeoutId = setTimeout(() => {
      this.showNotification(title, options);
    }, delayMs);
    
    return () => clearTimeout(timeoutId);
  },

  /**
   * Check if app is running in standalone mode (PWA)
   */
  isStandalone(): boolean {
    return window.matchMedia("(display-mode: standalone)").matches ||
           (window.navigator as any).standalone === true;
  },
};

/**
 * Hook for managing push notification state
 */
import { useState, useEffect } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    pushNotificationService.getPermission()
  );
  const [isSupported] = useState(pushNotificationService.isSupported());

  useEffect(() => {
    // Update permission state if it changes
    const checkPermission = () => {
      setPermission(pushNotificationService.getPermission());
    };
    
    // Check periodically (permission can change via browser settings)
    const interval = setInterval(checkPermission, 5000);
    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    const granted = await pushNotificationService.requestPermission();
    setPermission(pushNotificationService.getPermission());
    return granted;
  };

  return {
    permission,
    isSupported,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    canRequest: permission === "default",
    requestPermission,
    showNotification: pushNotificationService.showNotification.bind(pushNotificationService),
    showNotificationWithAction: pushNotificationService.showNotificationWithAction.bind(pushNotificationService),
  };
}
