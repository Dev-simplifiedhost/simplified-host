import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

const Offline = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-4">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="SimplifiedHost" className="h-10" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <WifiOff className="w-10 h-10 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              You're Offline
            </h1>
            <p className="text-muted-foreground">
              It looks like you've lost your internet connection. Please check your network and try again.
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Some features may be available offline if you've visited them before.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Offline;
