import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pin, Edit, Trash2, Plus, Megaphone, PinOff, AlertCircle, Bell, Heart, Info } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  event_id: string;
  title: string | null;
  message: string;
  category: 'update' | 'reminder' | 'alert' | 'thank_you';
  is_pinned: boolean;
  visibility: 'public' | 'co_hosts_only';
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AnnouncementsTabProps {
  eventId: string;
  eventName: string;
}

const MAX_ANNOUNCEMENTS = 5;

export const AnnouncementsTab = ({ eventId, eventName }: AnnouncementsTabProps) => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    category: 'update' | 'reminder' | 'alert' | 'thank_you';
    visibility: 'public' | 'co_hosts_only';
  }>({
    title: "",
    message: "",
    category: "update",
    visibility: "public"
  });

  useEffect(() => {
    loadAnnouncements();

    // Real-time subscription
    const channel = supabase
      .channel(`announcements-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive"
      });
    } else {
      setAnnouncements((data || []) as Announcement[]);
    }
    setLoading(false);
  };

  const hasReachedLimit = announcements.length >= MAX_ANNOUNCEMENTS;

  const handleSubmit = async () => {
    if (!formData.message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter an announcement message",
        variant: "destructive"
      });
      return;
    }

    if (formData.message.length > 500) {
      toast({
        title: "Message Too Long",
        description: "Announcements must be 500 characters or less",
        variant: "destructive"
      });
      return;
    }

    // Check limit when creating new announcement
    if (!editingAnnouncement && hasReachedLimit) {
      toast({
        title: "Limit Reached",
        description: `You can only have ${MAX_ANNOUNCEMENTS} announcements per event. Delete an existing one to post a new one.`,
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title.trim() || null,
            message: formData.message.trim(),
            category: formData.category,
            visibility: formData.visibility
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;

        toast({
          title: "Announcement Updated",
          description: "Your announcement has been updated"
        });
      } else {
        // Create new announcement
        const { error } = await supabase
          .from('announcements')
          .insert({
            event_id: eventId,
            title: formData.title.trim() || null,
            message: formData.message.trim(),
            category: formData.category,
            visibility: formData.visibility,
            author_name: null // Will be populated from user profile if needed
          });

        if (error) throw error;

        toast({
          title: "Announcement Posted! 📢",
          description: "All attendees will be notified"
        });
      }

      setDialogOpen(false);
      setEditingAnnouncement(null);
      setFormData({ title: "", message: "", category: "update", visibility: "public" });
      loadAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post announcement",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || "",
      message: announcement.message,
      category: announcement.category,
      visibility: announcement.visibility
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAnnouncementId) return;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', selectedAnnouncementId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Announcement Deleted",
        description: "The announcement has been removed"
      });
      loadAnnouncements();
    }

    setDeleteDialogOpen(false);
    setSelectedAnnouncementId(null);
  };

  const togglePin = async (announcement: Announcement) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_pinned: !announcement.is_pinned })
      .eq('id', announcement.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: announcement.is_pinned ? "Unpinned" : "Pinned!",
        description: announcement.is_pinned 
          ? "Announcement unpinned" 
          : "Announcement pinned to top"
      });
      loadAnnouncements();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      case 'thank_you':
        return <Heart className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'alert':
        return 'destructive';
      case 'reminder':
        return 'default';
      case 'thank_you':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const pinnedAnnouncement = announcements.find(a => a.is_pinned);
  const regularAnnouncements = announcements.filter(a => !a.is_pinned);

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Announcements
                <Badge variant="outline" className="font-normal">
                  {announcements.length}/{MAX_ANNOUNCEMENTS}
                </Badge>
              </CardTitle>
              <CardDescription>
                Keep your guests informed with updates and reminders
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                if (hasReachedLimit) {
                  toast({
                    title: "Limit Reached",
                    description: `You can only have ${MAX_ANNOUNCEMENTS} announcements per event. Delete an existing one to post a new one.`,
                    variant: "destructive"
                  });
                  return;
                }
                setEditingAnnouncement(null);
                setFormData({ title: "", message: "", category: "update", visibility: "public" });
                setDialogOpen(true);
              }}
              disabled={hasReachedLimit}
              title={hasReachedLimit ? `Maximum of ${MAX_ANNOUNCEMENTS} announcements reached` : undefined}
            >
              <Plus className="h-4 w-4 mr-2" />
              Post Announcement
            </Button>
          </div>
          {hasReachedLimit && (
            <p className="text-sm text-muted-foreground mt-2">
              You've reached the maximum of {MAX_ANNOUNCEMENTS} announcements. Delete an existing announcement to post a new one.
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Announcements List */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading announcements...
          </CardContent>
        </Card>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
            <p className="text-muted-foreground mb-6">
              Post updates to keep your guests informed
            </p>
            <Button 
              onClick={() => {
                setEditingAnnouncement(null);
                setFormData({ title: "", message: "", category: "update", visibility: "public" });
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Post Your First Announcement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pinned Announcement */}
          {pinnedAnnouncement && (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Pin className="h-4 w-4 text-primary" />
                      <Badge variant="default">Pinned</Badge>
                      <Badge variant={getCategoryColor(pinnedAnnouncement.category) as any}>
                        {getCategoryIcon(pinnedAnnouncement.category)}
                        <span className="ml-1 capitalize">{pinnedAnnouncement.category.replace('_', ' ')}</span>
                      </Badge>
                      {pinnedAnnouncement.visibility === 'co_hosts_only' && (
                        <Badge variant="outline">Co-Hosts Only</Badge>
                      )}
                    </div>
                    {pinnedAnnouncement.title && (
                      <h3 className="text-lg font-semibold mb-2">{pinnedAnnouncement.title}</h3>
                    )}
                    <p className="text-foreground whitespace-pre-wrap">{pinnedAnnouncement.message}</p>
                    <p className="text-sm text-muted-foreground mt-3">
                      {format(new Date(pinnedAnnouncement.created_at), 'PPp')}
                      {pinnedAnnouncement.updated_at !== pinnedAnnouncement.created_at && (
                        <span className="ml-2">(Edited)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePin(pinnedAnnouncement)}
                      title="Unpin announcement"
                    >
                      <PinOff className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(pinnedAnnouncement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAnnouncementId(pinnedAnnouncement.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Regular Announcements */}
          {regularAnnouncements.map(announcement => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getCategoryColor(announcement.category) as any}>
                        {getCategoryIcon(announcement.category)}
                        <span className="ml-1 capitalize">{announcement.category.replace('_', ' ')}</span>
                      </Badge>
                      {announcement.visibility === 'co_hosts_only' && (
                        <Badge variant="outline">Co-Hosts Only</Badge>
                      )}
                    </div>
                    {announcement.title && (
                      <h3 className="font-semibold mb-2">{announcement.title}</h3>
                    )}
                    <p className="text-muted-foreground whitespace-pre-wrap">{announcement.message}</p>
                    <p className="text-sm text-muted-foreground mt-3">
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      {announcement.updated_at !== announcement.created_at && (
                        <span className="ml-2">(Edited)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!pinnedAnnouncement && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePin(announcement)}
                        title="Pin to top"
                      >
                        <Pin className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAnnouncementId(announcement.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Edit Announcement" : "Post Announcement"}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement 
                ? "Update your announcement for all attendees"
                : "Share important updates with all attendees"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Important Parking Update"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your announcement message..."
                rows={6}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.message.length}/500 characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="thank_you">Thank You</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={formData.visibility} onValueChange={(value: any) => setFormData({ ...formData, visibility: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Guests & Public</SelectItem>
                    <SelectItem value="co_hosts_only">Co-Hosts Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Megaphone className="h-4 w-4 mr-2" />
              {editingAnnouncement ? "Update" : "Post"} Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This announcement will be permanently deleted and removed from all attendees' view.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};