import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Share, MoreVertical, Zap, Smartphone, Wifi } from "lucide-react";
import logo from "@/assets/logo.svg";
import { BottomTabBar } from "@/components/BottomTabBar";

const Install = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isIOS) setDetectedPlatform('ios');
    else if (isAndroid) setDetectedPlatform('android');
  }, []);

  // Mockup phone component with size variant
  const PhoneMockup = ({
    variant,
    size = 'normal'
  }: {
    variant: 'ios' | 'android';
    size?: 'normal' | 'large';
  }) => (
    <div className={`relative mx-auto w-full ${size === 'large' ? 'max-w-[220px]' : 'max-w-[160px] sm:max-w-[180px]'}`}>
      {/* Phone frame */}
      <div className="relative bg-foreground rounded-[2rem] p-2 shadow-xl">
        {/* Notch/Dynamic Island for iOS */}
        {variant === 'ios' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-foreground rounded-full z-10" />
        )}
        {/* Screen */}
        <div className="bg-background rounded-[1.5rem] overflow-hidden aspect-[9/16]">
          {/* Status bar */}
          <div className="h-8 bg-muted/50 flex items-center justify-between px-4">
            <span className="text-[10px] text-muted-foreground">9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-2 bg-muted-foreground/50 rounded-sm" />
              <div className="w-3 h-2 bg-muted-foreground/50 rounded-sm" />
              <div className="w-4 h-2 bg-muted-foreground/50 rounded-sm" />
            </div>
          </div>
          {/* Browser bar */}
          <div className="h-10 bg-muted/30 flex items-center justify-center px-3 gap-2">
            {variant === 'android' && <div className="w-4 h-4 rounded bg-muted-foreground/30" />}
            <div className="flex-1 h-6 bg-muted rounded-full flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground">simplifiedhost.app</span>
            </div>
            {variant === 'ios' ? (
              <Share className="w-3 h-3 text-primary" />
            ) : (
              <MoreVertical className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          {/* App content preview */}
          <div className="p-4 flex flex-col items-center justify-center flex-1">
            <img src={logo} alt="" className="h-8 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );

  // Determine which platform to show first on mobile
  const isIOSFirst = detectedPlatform === 'ios' || detectedPlatform === null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="pt-safe px-6 py-4 sm:py-6">
        <Link to="/" className="inline-block">
          <img src={logo} alt="SimplifiedHost" className="h-10" />
        </Link>
      </header>

      <main className="px-4 sm:px-6 pb-24 md:pb-8 max-w-3xl mx-auto">
        {/* Already Installed */}
        {isInstalled && (
          <div className="mb-6 sm:mb-8 p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
            <p className="font-medium text-foreground">✓ SimplifiedHost is installed</p>
            <p className="text-sm text-muted-foreground mt-1">You're all set!</p>
          </div>
        )}

        {/* Hero */}
        <section className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
            Add SimplifiedHost to<br />Your Home Screen
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Get one-tap access and a smooth, app-like experience.
          </p>
        </section>

        {/* How to Install */}
        <section className="mb-10 sm:mb-16">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 sm:mb-8 text-center">
            How to Install
          </h2>

          <div className="grid md:grid-cols-2 gap-8 md:gap-8">
            {/* iPhone Block */}
            <div 
              className={`transition-opacity duration-300 ${
                detectedPlatform === 'android' ? 'opacity-40 md:opacity-50' : ''
              } ${isIOSFirst ? 'order-first' : 'order-last md:order-none'}`}
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-background" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">iPhone</h3>
              </div>

              <ol className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground">1.</span>
                  <span className="text-foreground">
                    Open the <Share className="inline h-4 w-4 mx-0.5 text-primary" /> Share menu
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground">2.</span>
                  <span className="text-foreground">Tap <strong>Add to Home Screen</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground">3.</span>
                  <span className="text-foreground">Tap <strong>Add</strong></span>
                </li>
              </ol>

              <PhoneMockup 
                variant="ios" 
                size={detectedPlatform === 'ios' ? 'large' : 'normal'} 
              />
            </div>

            {/* Android Block */}
            <div 
              className={`transition-opacity duration-300 ${
                detectedPlatform === 'ios' ? 'opacity-40 md:opacity-50' : ''
              } ${!isIOSFirst ? 'order-first' : 'order-last md:order-none'}`}
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-background" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.341c-.5 0-.91.41-.91.91s.41.91.91.91.91-.41.91-.91-.41-.91-.91-.91zm-11.046 0c-.5 0-.91.41-.91.91s.41.91.91.91.91-.41.91-.91-.41-.91-.91-.91zm11.405-6.02l1.9-3.29c.11-.18.05-.42-.12-.53-.18-.11-.42-.05-.53.12l-1.93 3.33C15.45 8.25 13.8 7.83 12 7.83s-3.45.42-5.18 1.08L4.89 5.58c-.11-.18-.35-.23-.53-.12-.17.1-.23.35-.12.53l1.9 3.29C3.1 10.97 1.06 14.19 1 18h22c-.06-3.81-2.1-7.03-5.12-8.68z"/>
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">Android</h3>
              </div>

              <ol className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground">1.</span>
                  <span className="text-foreground">
                    Open the <MoreVertical className="inline h-4 w-4 mx-0.5" /> menu
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground">2.</span>
                  <span className="text-foreground">Tap <strong>Add to Home Screen</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground">3.</span>
                  <span className="text-foreground">Confirm <strong>Add</strong></span>
                </li>
              </ol>

              <PhoneMockup 
                variant="android" 
                size={detectedPlatform === 'android' ? 'large' : 'normal'} 
              />
            </div>
          </div>
        </section>

        {/* What You'll Get */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 sm:mb-6 text-center">
            What You'll Get
          </h2>

          <ul className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-x-8 sm:gap-y-3 text-foreground">
            <li className="flex items-center gap-2 justify-center">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm sm:text-base">One-tap launch</span>
            </li>
            <li className="flex items-center gap-2 justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-sm sm:text-base">App-like interface</span>
            </li>
            <li className="flex items-center gap-2 justify-center">
              <Wifi className="h-4 w-4 text-primary" />
              <span className="text-sm sm:text-base">Offline-friendly access</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Bottom Tab Bar for mobile navigation */}
      <BottomTabBar />
    </div>
  );
};

export default Install;
