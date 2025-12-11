import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Copy, ExternalLink, Plus, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SuccessScreenProps {
  eventId: string;
  onClose: () => void;
  onCreateAnother: () => void;
  embedded?: boolean;
}

const SuccessScreen = ({ eventId, onClose, onCreateAnother }: SuccessScreenProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<{ name: string; event_code: string } | null>(null);

  useEffect(() => {
    const fetchEventData = async () => {
      const { data } = await supabase
        .from('events')
        .select('name, event_code')
        .eq('id', eventId)
        .single();
      
      if (data) setEventData(data);
    };
    fetchEventData();
  }, [eventId]);

  const eventUrl = `${window.location.origin}/event/${eventId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast({
      title: "Link copied!",
      description: "Share this link with your guests",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventData?.name || 'Event',
          text: `You're invited! RSVP and see details here:`,
          url: eventUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          Event Published!
        </DialogTitle>
        <DialogDescription>
          Your event is live and ready to share with guests
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Event details */}
        {eventData && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Event Name</p>
                <p className="font-medium text-lg">{eventData.name}</p>
              </div>
              {eventData.event_code && (
                <div>
                  <p className="text-sm text-muted-foreground">Event Code</p>
                  <p className="font-mono text-lg">{eventData.event_code}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shareable link */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">Shareable Link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={eventUrl}
                readOnly
                className="flex-1 px-3 py-2 h-12 sm:h-10 text-sm bg-muted rounded-md"
              />
              <Button size="icon" variant="outline" onClick={handleCopyLink} className="h-12 w-12 sm:h-10 sm:w-10">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3 pb-safe">
          <Button onClick={handleShare} className="w-full h-12" size="lg">
            <Share2 className="mr-2 h-4 w-4" />
            Share Event
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => {
                navigate('/dashboard');
                onClose();
              }} 
              variant="outline"
              className="h-12 sm:h-10"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Dashboard
            </Button>
            <Button onClick={onCreateAnother} variant="outline" className="h-12 sm:h-10">
              <Plus className="mr-2 h-4 w-4" />
              Create Another
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuccessScreen;
