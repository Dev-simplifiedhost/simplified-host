import { Home, CalendarDays, PlusCircle, Inbox, User, Search, LogIn, BookOpen, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { MobileCreateEventFlow } from "./dashboard/MobileCreateEventFlow";
import { useNotifications } from "@/hooks/useNotifications";

const loggedInTabs = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'My Events', href: '/my-events', icon: CalendarDays },
  { name: 'Create', href: '/create', icon: PlusCircle },
  { name: 'Inbox', href: '/notifications', icon: Inbox },
  { name: 'Account', href: '/profile', icon: User },
];

const loggedOutTabs = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Guide', href: '/how-it-works', icon: BookOpen },
  { name: 'Find Event', href: '/join', icon: Search },
  { name: 'Support', href: '/support', icon: HelpCircle },
  { name: 'Sign In', href: '/auth', icon: LogIn },
];

export const BottomTabBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const { pendingPaymentsCount, unreadMessagesCount, newCommentsCount } = useNotifications();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const totalUnread = pendingPaymentsCount + unreadMessagesCount + newCommentsCount;

  const tabs = user ? loggedInTabs : loggedOutTabs;

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  // Check scroll position
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs.length]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = 200;
    const targetScroll = 
      direction === 'left' 
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
    
    // Check scroll state after animation
    setTimeout(checkScroll, 300);
  };

  return (
    <>
      {/* Spacer to push page content up - placed before nav with pointer-events-none */}
      <div className="md:hidden h-[calc(4rem+env(safe-area-inset-bottom))] pointer-events-none" />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border pb-safe">
        <div className="flex items-center h-16 px-2 gap-1">
          {/* Left scroll button */}
          <button
            onClick={() => scroll('left')}
            className={cn(
              "flex-shrink-0 p-2 rounded-lg transition-colors",
              canScrollLeft
                ? "text-foreground hover:bg-accent cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-0"
            style={{ scrollBehavior: 'smooth' }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.href);
              
              // Create tab opens dialog instead of navigating (logged-in only)
              if (tab.href === '/create') {
                return (
                  <button
                    key={tab.name}
                    onClick={() => setCreateEventOpen(true)}
                    className={cn(
                      "flex flex-col items-center justify-center flex-shrink-0 w-20 h-full gap-1 transition-colors",
                      active 
                        ? "text-primary" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
                    <span className="text-xs font-medium">{tab.name}</span>
                  </button>
                );
              }

              // Inbox tab with notification badge
              if (tab.href === '/notifications') {
                return (
                  <Link
                    key={tab.name}
                    to={tab.href}
                    className={cn(
                      "flex flex-col items-center justify-center flex-shrink-0 w-20 h-full gap-1 transition-colors relative",
                      active 
                        ? "text-primary" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
                      {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium">{tab.name}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={tab.name}
                  to={tab.href}
                  className={cn(
                    "flex flex-col items-center text-center justify-center flex-shrink-0 w-20 h-full gap-1 transition-colors",
                    active 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
                  <span className="text-xs font-medium">{tab.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scroll('right')}
            className={cn(
              "flex-shrink-0 p-2 rounded-lg transition-colors",
              canScrollRight
                ? "text-foreground hover:bg-accent cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <MobileCreateEventFlow
        open={createEventOpen} 
        onOpenChange={setCreateEventOpen} 
      />
    </>
  );
};
