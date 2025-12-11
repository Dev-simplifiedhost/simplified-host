import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActivityDialog } from "@/components/dashboard/ActivityDialog";

const FindMyEvent = () => {
  const [eventCode, setEventCode] = useState("");
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventCode.trim()) {
      navigate(`/event/${eventCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/5">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Find My Event</CardTitle>
              <CardDescription>
                Enter your event code to view event details and RSVP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="eventCode">Event Code</Label>
                  <Input
                    id="eventCode"
                    placeholder="Enter 6-character event code"
                    value={eventCode}
                    onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-lg text-center tracking-wider"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg">
                  <Search className="mr-2 h-5 w-5" />
                  Find Event
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  OR
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Previously RSVP'd yes or maybe to an event? Search for your activity and make quick updates!
                </p>
                <Button 
                  onClick={() => setActivityDialogOpen(true)} 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Find My RSVP
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      
      <ActivityDialog 
        open={activityDialogOpen} 
        onOpenChange={setActivityDialogOpen}
      />
    </div>
  );
};

export default FindMyEvent;
