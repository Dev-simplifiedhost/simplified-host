import { Home, CalendarDays, PlusCircle, Inbox, User, Search, LogIn, BookOpen, HelpCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
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
  { name: 'How It Works', href: '/how-it-works', icon: BookOpen },
  { name: 'Find Event', href: '/join', icon: Search },
  { name: 'Support', href: '/support', icon: HelpCircle },
  { name: 'Sign In', href: '/auth', icon: LogIn },
];

export const BottomTabBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const { pendingPaymentsCount, unreadMessagesCount, newCommentsCount } = useNotifications();
  
  const totalUnread = pendingPaymentsCount + unreadMessagesCount + newCommentsCount;

  const tabs = user ? loggedInTabs : loggedOutTabs;

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Spacer to push page content up - placed before nav with pointer-events-none */}
      <div className="md:hidden h-[calc(4rem+env(safe-area-inset-bottom))] pointer-events-none" />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
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
                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
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
                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
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
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
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
      </nav>

      <MobileCreateEventFlow
        open={createEventOpen} 
        onOpenChange={setCreateEventOpen} 
      />
    </>
  );
};
