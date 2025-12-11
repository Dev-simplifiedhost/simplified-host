import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Home as HomeIcon, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Join = () => {
  const navigate = useNavigate();
  const [eventCode, setEventCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-dismiss error after 4s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const handleFindEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = eventCode.trim();

    if (!code) {
      setError('Please enter your event code.');
      return;
    }

    if (!/^[A-Za-z0-9\-]{3,32}$/.test(code)) {
      setError('Event code looks invalid. Use 3–32 letters or numbers.');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const { data: events, error: queryError } = await supabase
        .from('events')
        .select('*')
        .ilike('event_code', code)
        .limit(1);

      if (queryError) throw queryError;
      
      if (!events || events.length === 0) {
        setError(`No event found for code "${code}". Double-check the spelling or confirm with your host.`);
        return;
      }
      
      const event = events[0];
      navigate(`/event/${event.event_code || event.id}`);
    } catch (err) {
      console.error('Error checking event code:', err);
      setError('Something went wrong while searching for your event. Please try again or contact your host.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowsePublicEvents = () => {
    toast.info('Coming soon! Public event browsing will be available soon.');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12" role="main">
        {/* Hero Section */}
        <div className="w-full max-w-2xl text-center mb-8">
          <Calendar className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Join an Event
          </h1>
          <p className="text-lg text-muted-foreground">
            Enter your event code to access event details and RSVP
          </p>
        </div>

        {/* Event Code Card */}
        <Card className="w-full max-w-md mb-8">
          <CardHeader>
            <CardTitle className="text-center">Enter Event Code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFindEvent} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div
                  className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm flex items-start gap-2"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="eventCode">Event Code</Label>
                <Input
                  id="eventCode"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="e.g., FRIENDSGIVING24"
                  value={eventCode}
                  onChange={(e) => {
                    setEventCode(e.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={!!error}
                  aria-describedby="event-code-help"
                  className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
                <p id="event-code-help" className="text-sm text-muted-foreground">
                  Enter the event code shared by your host (not case-sensitive)
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? 'Finding Event...' : 'Find Event'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Secondary Actions */}
        <div className="w-full max-w-md space-y-3">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleBrowsePublicEvents}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Browse Public Events
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate('/')}
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Join;
