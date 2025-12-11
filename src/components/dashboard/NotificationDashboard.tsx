import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./NotificationItem";
import { ConfirmPaymentDialogV2 } from "./ConfirmPaymentDialogV2";
import { ReplyMessageDialog } from "./ReplyMessageDialog";
import { ViewCommentDialog } from "./ViewCommentDialog";
import { NotificationPreferencesDialog } from "@/components/profile/NotificationPreferencesDialog";
import { SmartNotificationItem } from "@/components/notifications/SmartNotificationItem";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useSmartNotifications, type SmartNotification } from "@/hooks/useSmartNotifications";
import { useNotificationDismissals } from "@/hooks/useNotificationDismissals";
import { Loader2, Settings, Sparkles, CheckCheck, Trash2 } from "lucide-react";

interface NotificationDashboardProps {
  events?: any[];
}

export function NotificationDashboard({ events = [] }: NotificationDashboardProps) {
  const {
    notifications,
    loading,
    pendingPaymentsCount,
    unreadMessagesCount,
    newCommentsCount,
    markAsRead,
    markAsUnread,
    refresh,
  } = useNotifications();

  const { getDismissedIds, dismiss, clearAll: clearDismissals } = useNotificationDismissals();
  const smartNotifications = useSmartNotifications(events, [], getDismissedIds());

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [activeDialog, setActiveDialog] = useState<
    "payment" | "message" | "comment" | null
  >(null);
  const [notificationPrefsOpen, setNotificationPrefsOpen] = useState(false);

  const handleQuickAction = (notification: Notification) => {
    setSelectedNotification(notification);
    switch (notification.notification_type) {
      case "payment_pending":
        setActiveDialog("payment");
        break;
      case "new_message":
        setActiveDialog("message");
        break;
      case "new_comment":
        setActiveDialog("comment");
        break;
    }
  };

  const handleCloseDialog = () => {
    setActiveDialog(null);
    setSelectedNotification(null);
    refresh();
  };

  const filterNotifications = (type?: string) => {
    if (!type) return notifications;
    return notifications.filter((n) => n.notification_type === type);
  };

  const handleMarkAllAsRead = async () => {
    for (const n of notifications.filter(n => !n.is_read)) {
      await markAsRead(n.id);
    }
  };

  const handleDismissSmartNotification = (id: string, duration: "session" | "day" | "permanent") => {
    dismiss(id, duration);
  };

  const smartNotificationsCount = smartNotifications.length;
  const totalUnread = pendingPaymentsCount + unreadMessagesCount + newCommentsCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Notification Feed */}
        <div className="flex-1 overflow-hidden">
          {/* Header with settings - hidden on mobile since page already has "Inbox" title */}
          <div className="hidden md:flex px-4 py-3 border-b items-center justify-between">
            <h3 className="font-medium text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {totalUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="gap-1 text-xs h-8"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotificationPrefsOpen(true)}
                className="gap-2"
                aria-label="Notification Settings"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </div>
          </div>
          
          {/* Mobile settings button */}
          <div className="md:hidden flex justify-between items-center px-4 pt-2">
            {totalUnread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="gap-1 text-xs h-10"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotificationPrefsOpen(true)}
              className="h-10 w-10"
              aria-label="Notification Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <Tabs defaultValue="all" className="w-full h-full flex flex-col">
            <div className="px-4">
              <TabsList className="grid w-full grid-cols-5 h-12 md:h-10 mt-2 mb-2">
                <TabsTrigger value="all" className="h-10 md:h-8 text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="smart" className="h-10 md:h-8 text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Smart {smartNotificationsCount > 0 && `(${smartNotificationsCount})`}
                </TabsTrigger>
                <TabsTrigger value="payments" className="h-10 md:h-8 text-xs">
                  Pay {pendingPaymentsCount > 0 && `(${pendingPaymentsCount})`}
                </TabsTrigger>
                <TabsTrigger value="messages" className="h-10 md:h-8 text-xs">
                  Msg {unreadMessagesCount > 0 && `(${unreadMessagesCount})`}
                </TabsTrigger>
                <TabsTrigger value="comments" className="h-10 md:h-8 text-xs">
                  Com {newCommentsCount > 0 && `(${newCommentsCount})`}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0 flex-1">
              <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-200px)]">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm px-4">
                    No notifications yet
                  </div>
                ) : (
                  <div className="space-y-2 px-4 pb-4">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onQuickAction={handleQuickAction}
                        onMarkAsRead={markAsRead}
                        onMarkAsUnread={markAsUnread}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="smart" className="mt-0 flex-1">
              <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-200px)]">
                {smartNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm px-4">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>All caught up!</p>
                    <p className="text-xs mt-1">No smart alerts right now</p>
                  </div>
                ) : (
                  <div className="space-y-2 px-4 pb-4">
                    {smartNotifications.length > 0 && (
                      <div className="flex justify-end mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => {
                            smartNotifications.forEach(n => dismiss(n.id, "session"));
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Clear all
                        </Button>
                      </div>
                    )}
                    {smartNotifications.map((notification) => (
                      <SmartNotificationItem
                        key={notification.id}
                        notification={notification}
                        onDismiss={handleDismissSmartNotification}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="payments" className="mt-0 flex-1">
              <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-200px)]">
                <div className="space-y-2 px-4 pb-4">
                  {filterNotifications("payment_pending").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No pending payments
                    </div>
                  ) : (
                    filterNotifications("payment_pending").map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onQuickAction={handleQuickAction}
                        onMarkAsRead={markAsRead}
                        onMarkAsUnread={markAsUnread}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="messages" className="mt-0 flex-1">
              <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-200px)]">
                <div className="space-y-2 px-4 pb-4">
                  {filterNotifications("new_message").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No unread messages
                    </div>
                  ) : (
                    filterNotifications("new_message").map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onQuickAction={handleQuickAction}
                        onMarkAsRead={markAsRead}
                        onMarkAsUnread={markAsUnread}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="comments" className="mt-0 flex-1">
              <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-200px)]">
                <div className="space-y-2 px-4 pb-4">
                  {filterNotifications("new_comment").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No new comments
                    </div>
                  ) : (
                    filterNotifications("new_comment").map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onQuickAction={handleQuickAction}
                        onMarkAsRead={markAsRead}
                        onMarkAsUnread={markAsUnread}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      {selectedNotification && (
        <>
          <ConfirmPaymentDialogV2
            open={activeDialog === "payment"}
            onOpenChange={(open) => !open && handleCloseDialog()}
            notification={selectedNotification}
          />
          <ReplyMessageDialog
            open={activeDialog === "message"}
            onOpenChange={(open) => !open && handleCloseDialog()}
            notification={selectedNotification}
          />
          <ViewCommentDialog
            open={activeDialog === "comment"}
            onOpenChange={(open) => !open && handleCloseDialog()}
            notification={selectedNotification}
          />
        </>
      )}

      {/* Notification Preferences Dialog */}
      <NotificationPreferencesDialog
        open={notificationPrefsOpen}
        onOpenChange={setNotificationPrefsOpen}
      />
    </>
  );
}
