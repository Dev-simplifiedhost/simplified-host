import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { NotificationDashboard } from "@/components/dashboard/NotificationDashboard";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hidden md:block"><Header /></div>
        <main className="container mx-auto px-4 py-4 md:py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Show Header */}
      <div className="hidden md:block"><Header /></div>
      
      <main className="container mx-auto px-4 py-4 md:py-8 pb-20 pb-safe max-w-3xl">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="h-12 w-12"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Inbox</h1>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block mb-6">
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">Manage your notifications and messages</p>
        </div>

        {/* Notification Content */}
        <div className="md:border md:rounded-lg bg-card -mx-4 md:mx-0">
          <NotificationDashboard />
        </div>
      </main>
    </div>
  );
}
