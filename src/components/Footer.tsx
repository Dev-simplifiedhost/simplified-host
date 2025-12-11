import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Smartphone } from "lucide-react";
import logo from "@/assets/logo.svg";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <footer className="w-full border-t bg-muted/50 mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-8">
        {/* Desktop: 4-column grid, Mobile: stacked */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <div className="flex items-center">
              <img src={logo} alt="SimplifiedHost" className="h-10 md:h-12" />
            </div>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
              Making event planning simple and collaborative.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-xs md:text-sm mb-2 md:mb-3">Legal</h3>
            <ul className="space-y-1.5 text-xs md:text-sm">
              <li>
                <Link 
                  to="/policies#privacy" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/policies#terms" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  to="/policies#disclaimer" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h3 className="font-semibold text-xs md:text-sm mb-2 md:mb-3">Get Started</h3>
            <ul className="space-y-1.5 text-xs md:text-sm">
              <li>
                <Link 
                  to="/dashboard" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Host an Event
                </Link>
              </li>
              <li>
                <Link 
                  to="/" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Join an Event
                </Link>
              </li>
              {!isInstalled && (
                <li>
                  <Link 
                    to="/install" 
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Install App
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-xs md:text-sm mb-2 md:mb-3">Support</h3>
            <ul className="space-y-1.5 text-xs md:text-sm">
              <li>
                <Link 
                  to="/support" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Support Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 md:mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>© {currentYear} SimplifiedHost. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};