import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InstallCTA = () => {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed (running as standalone PWA)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mediaQuery.matches);

    // Listen for changes (in case user installs while on page)
    const handleChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Don't show CTA if already installed
  if (isInstalled) return null;

  return (
    <section 
      className="bg-secondary py-16 lg:py-20"
      aria-labelledby="install-cta-title"
    >
      <div className="max-w-[120rem] mx-auto px-8 sm:px-12 md:px-16">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Icon */}
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 text-center md:text-left">
            <h3 
              id="install-cta-title" 
              className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2"
            >
              Take SimplifiedHost Anywhere
            </h3>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
              Install our app for quick access from your home screen. Works offline and feels like a native app.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex-shrink-0">
            <Link to="/install">
              <Button size="lg" className="whitespace-nowrap">
                Add to Home Screen
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstallCTA;
