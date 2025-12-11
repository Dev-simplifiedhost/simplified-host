/**
 * Haptic feedback utilities for mobile devices
 * Uses the Web Vibration API for mobile browsers
 */

export const haptics = {
  /**
   * Light tap feedback (e.g., for button presses, toggles)
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium impact feedback (e.g., for selections, confirmations)
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy impact feedback (e.g., for errors, warnings)
   */
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Success feedback (e.g., for completed actions)
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /**
   * Error feedback (e.g., for failed actions)
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 100, 20, 100, 20]);
    }
  },

  /**
   * Selection feedback (e.g., for list items, notifications)
   */
  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },
};
