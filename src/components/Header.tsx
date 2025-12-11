import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Home, MousePointerClick, Search, User, Menu, Calendar, Download, Smartphone, BookOpen, HelpCircle } from "lucide-react";
import logo from "@/assets/logo.svg";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import PlanWithClickDialog from "./plan-with-click/PlanWithClickDialog";

const publicNavigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'How It Works', href: '/how-it-works', icon: BookOpen },
  { name: 'Plan With a Click', href: '/plan-with-a-click', icon: MousePointerClick },
  { name: 'Find My Event', href: '/find-my-event', icon: Search },
  { name: 'Support', href: '/support', icon: HelpCircle },
];

const memberNavigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Plan With a Click', href: '/plan-with-a-click', icon: MousePointerClick },
  { name: 'My Events', href: '/my-events', icon: Calendar },
  { name: 'Profile', href: '/profile', icon: User },
];

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [planWithClickOpen, setPlanWithClickOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-28 items-center justify-between gap-4 px-4 sm:px-6 mx-auto">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src={logo} alt="SimplifiedHost" className="h-20 sm:h-22 md:h-24" />
        </Link>
        
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 flex-1 justify-center">
          {(user ? memberNavigation : publicNavigation).map((item) => {
            const Icon = item.icon;
            if (item.href === '/plan-with-a-click') {
              return (
                <Button 
                  key={item.name}
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPlanWithClickOpen(true)}
                  className="text-sm h-9 px-3"
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  {item.name}
                </Button>
              );
            }
            if (item.href.startsWith('/#')) {
              return (
                <Button 
                  key={item.name}
                  variant="ghost" 
                  size="sm"
                  asChild
                  className="text-sm h-9 px-3"
                >
                  <a href={item.href}>
                    <Icon className="h-4 w-4 mr-1.5" />
                    {item.name}
                  </a>
                </Button>
              );
            }
            return (
              <Button 
                key={item.name}
                variant="ghost" 
                size="sm"
                asChild
                className="text-sm h-9 px-3"
              >
                <Link to={item.href}>
                  <Icon className="h-4 w-4 mr-1.5" />
                  {item.name}
                </Link>
              </Button>
            );
          })}
        </nav>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Install button - visible on all pages when not installed */}
          {!isInstalled && (
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="hidden md:flex h-9"
              title="Install App"
            >
              <Link to="/install">
                <Download className="h-4 w-4" />
              </Link>
            </Button>
          )}
          
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:flex h-9">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden h-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <nav className="flex flex-col gap-4 mt-8">
                    {memberNavigation.map((item) => {
                      const Icon = item.icon;
                      if (item.href === '/plan-with-a-click') {
                        return (
                          <Button 
                            key={item.name}
                            variant="ghost" 
                            onClick={() => {
                              setPlanWithClickOpen(true);
                              setMobileMenuOpen(false);
                            }}
                            className="justify-start"
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {item.name}
                          </Button>
                        );
                      }
                      return (
                        <Button
                          key={item.name}
                          variant="ghost"
                          asChild
                          className="justify-start"
                        >
                          <Link 
                            to={item.href} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {item.name}
                          </Link>
                        </Button>
                      );
                    })}
                    {!isInstalled && (
                      <Button
                        variant="ghost"
                        asChild
                        className="justify-start"
                      >
                        <Link 
                          to="/install" 
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Smartphone className="h-4 w-4 mr-2" />
                          Install App
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }} className="justify-start mt-4">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden md:flex h-9">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
      
      <PlanWithClickDialog 
        open={planWithClickOpen} 
        onOpenChange={setPlanWithClickOpen} 
      />
    </header>
  );
};
