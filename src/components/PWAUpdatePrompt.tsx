import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function PWAUpdatePrompt() {
  const toastShownRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Check immediately on registration
        r.update();
        
        // Check every 5 minutes
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000);
        
        // Check when network reconnects
        window.addEventListener('online', () => {
          r.update();
        });
      }
    },
  });

  // Show toast when update is available
  useEffect(() => {
    if (!needRefresh || toastShownRef.current) return;
    
    toastShownRef.current = true;
    
    toast('New version available', {
      description: 'Refresh to get the latest features',
      duration: Infinity,
      action: {
        label: 'Refresh now',
        onClick: () => updateServiceWorker(true),
      },
    });
  }, [needRefresh, updateServiceWorker]);

  // Auto-apply update when user returns to app (fallback if toast ignored)
  useEffect(() => {
    if (!needRefresh) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && needRefresh) {
        updateServiceWorker(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [needRefresh, updateServiceWorker]);

  return null;
}
