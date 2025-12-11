import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pushNotificationService } from "@/lib/pushNotifications";

interface PushPermissionPromptProps {
  onClose: () => void;
}

const STORAGE_KEY = "simplifiedhost_push_prompt_dismissed";

export function PushPermissionPrompt({ onClose }: PushPermissionPromptProps) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Check if we should show the prompt
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    const permission = pushNotificationService.getPermission();
    
    // Don't show if already granted, denied, or dismissed
    if (isDismissed || permission !== "default" || !pushNotificationService.isSupported()) {
      return;
    }
    
    // Show after a short delay
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  const handleEnable = async () => {
    const granted = await pushNotificationService.requestPermission();
    if (granted) {
      // Show a test notification
      pushNotificationService.showNotification(
        "Notifications Enabled!",
        {
          body: "You'll now receive alerts about your events.",
          icon: "/pwa-192x192.png",
        }
      );
    }
    handleClose();
  };
  
  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    onClose();
  };
  
  if (!visible) return null;
  
  return (
    <Card className="border-primary/20 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">Enable Notifications?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Get alerts about RSVP deadlines, guest activity, and important event updates.
            </p>
            
            <div className="flex items-center gap-2 mt-3">
              <Button 
                size="sm" 
                className="h-9"
                onClick={handleEnable}
              >
                Enable Notifications
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-9"
                onClick={handleClose}
              >
                Not Now
              </Button>
            </div>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to check if prompt should be shown
export function useShouldShowPushPrompt(hasEvents: boolean): boolean {
  const [shouldShow, setShouldShow] = useState(false);
  
  useEffect(() => {
    if (!hasEvents) return;
    
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    const permission = pushNotificationService.getPermission();
    
    setShouldShow(
      !isDismissed && 
      permission === "default" && 
      pushNotificationService.isSupported()
    );
  }, [hasEvents]);
  
  return shouldShow;
}
