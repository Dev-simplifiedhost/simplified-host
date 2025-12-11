import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'simplifiedhost_install_banner_dismissed';

export function FloatingInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(checkInstalled);

    // Check if previously dismissed
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    
    if (checkInstalled || wasDismissed) {
      return;
    }

    // Show banner after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 300);
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-20 md:bottom-4 left-4 right-4 z-50 mx-auto max-w-md transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 animate-fade-in'
      }`}
    >
      <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg shadow-lg">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Get the App</p>
          <p className="text-xs text-muted-foreground">Install for quick access</p>
        </div>
        <Button size="sm" asChild>
          <Link to="/install">Install</Link>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
