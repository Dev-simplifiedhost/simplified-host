import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from './use-mobile';

const BANNER_SHOW_COUNT_KEY = 'simplifiedhost_install_banner_show_count';
const SESSION_DISMISSED_KEY = 'simplifiedhost_install_banner_session_dismissed';
const PROMPT_SHOWN_PREFIX = 'simplifiedhost_install_prompt_shown_';
const MAX_BANNER_SHOWS = 3;

interface InstallPromptState {
  isInstalled: boolean;
  isMobile: boolean;
  isIOSSafari: boolean;
  isAndroidChrome: boolean;
  isPWAEligible: boolean;
  platform: 'ios' | 'android' | 'unsupported';
  bannerShowCount: number;
  sessionDismissed: boolean;
  canShowBanner: boolean;
  incrementShowCount: () => void;
  dismissBanner: () => void;
  markPromptShown: (context: string) => void;
  hasPromptBeenShown: (context: string) => boolean;
  dismissDayOfTip: () => void;
  isDayOfTipDismissed: () => boolean;
}

export function useInstallPrompt(): InstallPromptState {
  const isMobile = useIsMobile();
  
  const [isInstalled, setIsInstalled] = useState(false);
  const [bannerShowCount, setBannerShowCount] = useState(0);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  // Platform detection
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
  const isSafari = typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isChrome = typeof navigator !== 'undefined' && /Chrome/.test(navigator.userAgent);
  
  const isIOSSafari = isIOS && isSafari;
  const isAndroidChrome = isAndroid && isChrome;
  const isPWAEligible = isIOSSafari || isAndroidChrome;
  
  const platform: 'ios' | 'android' | 'unsupported' = isIOS ? 'ios' : isAndroid ? 'android' : 'unsupported';

  // Check if installed
  useEffect(() => {
    const checkInstalled = () => {
      const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone = (navigator as any).standalone === true;
      setIsInstalled(standaloneMedia || navigatorStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Load banner show count
  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem(BANNER_SHOW_COUNT_KEY) || '0', 10);
      setBannerShowCount(count);
    } catch {
      setBannerShowCount(0);
    }
  }, []);

  // Check session dismissed
  useEffect(() => {
    try {
      setSessionDismissed(sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true');
    } catch {
      setSessionDismissed(false);
    }
  }, []);

  const incrementShowCount = useCallback(() => {
    const newCount = bannerShowCount + 1;
    setBannerShowCount(newCount);
    try {
      localStorage.setItem(BANNER_SHOW_COUNT_KEY, String(newCount));
    } catch {}
  }, [bannerShowCount]);

  const dismissBanner = useCallback(() => {
    setSessionDismissed(true);
    try {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
    } catch {}
  }, []);

  const markPromptShown = useCallback((context: string) => {
    try {
      localStorage.setItem(`${PROMPT_SHOWN_PREFIX}${context}`, 'true');
    } catch {}
  }, []);

  const hasPromptBeenShown = useCallback((context: string): boolean => {
    try {
      return localStorage.getItem(`${PROMPT_SHOWN_PREFIX}${context}`) === 'true';
    } catch {
      return false;
    }
  }, []);

  const dismissDayOfTip = useCallback(() => {
    try {
      sessionStorage.setItem('simplifiedhost_day_of_tip_dismissed', 'true');
    } catch {}
  }, []);

  const isDayOfTipDismissed = useCallback((): boolean => {
    try {
      return sessionStorage.getItem('simplifiedhost_day_of_tip_dismissed') === 'true';
    } catch {
      return false;
    }
  }, []);

  // Calculate if we can show banner
  const canShowBanner = 
    isMobile && 
    isPWAEligible && 
    !isInstalled && 
    bannerShowCount < MAX_BANNER_SHOWS && 
    !sessionDismissed;

  return {
    isInstalled,
    isMobile,
    isIOSSafari,
    isAndroidChrome,
    isPWAEligible,
    platform,
    bannerShowCount,
    sessionDismissed,
    canShowBanner,
    incrementShowCount,
    dismissBanner,
    markPromptShown,
    hasPromptBeenShown,
    dismissDayOfTip,
    isDayOfTipDismissed,
  };
}
