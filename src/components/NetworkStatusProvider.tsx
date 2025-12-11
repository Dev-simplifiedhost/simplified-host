import { useEffect, useRef } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

export const NetworkStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const { isOnline } = useNetworkStatus();
  const previousOnlineStatus = useRef(isOnline);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip the initial mount to avoid showing toast on page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousOnlineStatus.current = isOnline;
      return;
    }

    // Only show toast when status actually changes
    if (previousOnlineStatus.current !== isOnline) {
      if (!isOnline) {
        toast.error("You're offline", {
          description: "Some features may not be available",
          icon: <WifiOff className="w-4 h-4" />,
          duration: 5000,
        });
      } else {
        toast.success("You're back online!", {
          icon: <Wifi className="w-4 h-4" />,
          duration: 3000,
        });
      }
      previousOnlineStatus.current = isOnline;
    }
  }, [isOnline]);

  return <>{children}</>;
};
