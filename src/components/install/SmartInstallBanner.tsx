import { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { InstallInstructionsModal } from './InstallInstructionsModal';

export function SmartInstallBanner() {
  const { user } = useAuth();
  const { 
    canShowBanner, 
    isInstalled, 
    isMobile,
    isPWAEligible,
    incrementShowCount, 
    dismissBanner 
  } = useInstallPrompt();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasIncremented, setHasIncremented] = useState(false);

  // Only show for signed-in users on mobile PWA-eligible browsers
  const shouldShow = user && canShowBanner && isMobile && isPWAEligible;

  useEffect(() => {
    if (!shouldShow) {
      setIsVisible(false);
      return;
    }

    // Show banner after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
      if (!hasIncremented) {
        incrementShowCount();
        setHasIncremented(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [shouldShow, hasIncremented, incrementShowCount]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      dismissBanner();
    }, 300);
  };

  const handleAddClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setModalOpen(true);
    }, 150);
  };

  if (isInstalled || !isVisible) {
    return (
      <InstallInstructionsModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    );
  }

  return (
    <>
      <div 
        className={`fixed top-0 left-0 right-0 z-50 pt-safe transition-all duration-300 ${
          isExiting ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0 animate-fade-in'
        }`}
      >
        <div className="mx-4 mt-2 flex items-center gap-3 p-3 bg-card border border-border rounded-lg shadow-lg">
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">
              Add SimplifiedHost to your home screen for faster access.
            </p>
          </div>
          <Button size="sm" className="flex-shrink-0 h-9" onClick={handleAddClick}>
            Add
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 flex-shrink-0"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <InstallInstructionsModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </>
  );
}
