import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, BarChart3, CreditCard, Users, Sparkles, Clock, CheckCircle, ArrowRight, Wand2, AlertCircle, Target, Bell, Calendar, MousePointerClick } from 'lucide-react';
import PlanWithClickDialog from '@/components/plan-with-click/PlanWithClickDialog';
import InstallCTA from '@/components/InstallCTA';
import { FloatingInstallBanner } from '@/components/FloatingInstallBanner';
import { supabase } from '@/integrations/supabase/client';
import heroDiverseGathering from '@/assets/hero-diverse-gathering.jpg';
import intimateGathering from '@/assets/intimate-gathering.jpg';
import step1Planning from '@/assets/step-1-planning.jpg';
import step2Menu from '@/assets/step-2-menu.jpg';
import step3Coordination from '@/assets/step-3-coordination.jpg';

/** ---------- AnimatedElement (reduced motion aware) ---------- */
type AnimatedElementProps = {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  delay?: string;
};

const AnimatedElement: React.FC<AnimatedElementProps> = ({ children, className, threshold = 0.1, delay = '0s' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const style = { '--animation-delay': delay } as React.CSSProperties;

  return (
    <div ref={ref} style={style} className={`${className || ''} animate-reveal`}>
      {children}
    </div>
  );
};

/** ---------- Feature data ---------- */
type Feature = { icon: React.ReactNode; title: string; desc: string };

const SMART_PLANNING: Feature[] = [
  { icon: <Wand2 className="w-6 h-6" />, title: 'AI Menu Generator', desc: 'Create balanced menus in seconds with intelligent suggestions based on guest count and theme.' },
  { icon: <Sparkles className="w-6 h-6" />, title: 'Smart Customization', desc: 'Adjust dishes, portions, and costs with automatic dietary tagging and conflict detection.' },
  { icon: <Clock className="w-6 h-6" />, title: 'Quick Setup', desc: 'Launch your event in minutes with our streamlined event creation wizard.' },
];

const COORDINATION: Feature[] = [
  { icon: <Users className="w-6 h-6" />, title: 'Guest Management', desc: 'Track RSVPs, dietary restrictions, and preferences in one dashboard.' },
  { icon: <BarChart3 className="w-6 h-6" />, title: 'Real-Time Tracking', desc: 'Monitor dish claims, sponsorships, and contributions live.' },
  { icon: <CheckCircle className="w-6 h-6" />, title: 'Dietary Awareness', desc: 'Automatically identify conflicts to ensure inclusive planning.' },
];

const EXECUTION: Feature[] = [
  { icon: <CreditCard className="w-6 h-6" />, title: 'Payment-Ready Sponsorships', desc: 'Integrated Venmo and Zelle links for seamless contributions.' },
  { icon: <Zap className="w-6 h-6" />, title: 'Personalized Experiences', desc: 'Guests see tailored event details and their contributions.' },
  { icon: <Sparkles className="w-6 h-6" />, title: 'Coming Soon: Templates', desc: 'Pre-built templates for holidays, seasons, and themes.' },
];

const DASHBOARD_FEATURES: Feature[] = [
  { icon: <Target className="w-6 h-6" />, title: 'One-click event templates', desc: 'Save hours of planning with pre-built templates for every occasion.' },
  { icon: <Users className="w-6 h-6" />, title: 'Real-time collaboration', desc: 'Work seamlessly with co-hosts and guests in real-time.' },
  { icon: <Bell className="w-6 h-6" />, title: 'Automatic reminders', desc: 'Never miss a deadline with smart reminder and deadline tracking.' },
  { icon: <CreditCard className="w-6 h-6" />, title: 'Budget management', desc: 'Track expenses and split costs effortlessly with built-in tools.' },
];

const Home = () => {
  const navigate = useNavigate();

  // Dialog state + input handling
  const [attendOpen, setAttendOpen] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const smartPlanning = useMemo(() => SMART_PLANNING, []);
  const coordination = useMemo(() => COORDINATION, []);
  const execution = useMemo(() => EXECUTION, []);
  const dashboardFeatures = useMemo(() => DASHBOARD_FEATURES, []);

  // Auto-dismiss error after 4s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const onSubmitCode: React.FormEventHandler<HTMLFormElement> = async (e) => {
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

      // Lookup by code field in the database
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
      setAttendOpen(false);

      // Redirect to event page
      navigate(`/event/${event.event_code || event.id}`);
    } catch (err) {
      console.error('Error checking event code:', err);
      setError('Something went wrong while searching for your event. Please try again or contact your host.');
    }
  };

  return (
    <>
      <style>{`
        .animate-reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.33, 1, 0.68, 1), transform 0.6s cubic-bezier(0.33, 1, 0.68, 1);
          transition-delay: var(--animation-delay, 0s);
        }
        .animate-reveal.is-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .animate-reveal { transition: none !important; transform: none !important; opacity: 1 !important; }
        }
        .feature-card { transition: transform 0.3s cubic-bezier(0.33, 1, 0.68, 1), box-shadow 0.3s cubic-bezier(0.33, 1, 0.68, 1); }
        .feature-card:hover, .feature-card:focus-within { transform: translateY(-4px); }
        .no-js .animate-reveal { opacity: 1; transform: none; }

        /* Inline alert fade-in-out */
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-4px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .animate-fade-in { animation: fade-in-out 4s ease-in-out forwards; }
      `}</style>

      <noscript>
        <style>{`.no-js .animate-reveal { opacity: 1 !important; transform: none !important; }`}</style>
      </noscript>

      <div className="min-h-screen bg-background">
        {/* Hide header on mobile for app-like experience */}
        <div className="hidden md:block">
          <Header />
        </div>
        
        <main className="w-full bg-background text-foreground overflow-clip pb-20 md:pb-0" role="main">
          {/* Hero Section */}
          <section className="w-full max-w-[120rem] mx-auto" aria-label="Hero">
            <div className="bg-primary text-primary-foreground flex flex-col justify-center p-6 sm:p-12 md:p-16 lg:p-20 w-full">
              <AnimatedElement className="max-w-xl">
                <p className="text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4 text-primary-foreground/70">
                  Plan confidently, host effortlessly
                </p>
                <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-8 z-20 relative">
                  Every Gathering Made Simple
                </h1>
                <p className="text-sm sm:text-lg text-primary-foreground/80 leading-relaxed mb-6 sm:mb-8">
              A smarter way to plan events—cozy dinners, milestone celebrations, or corporate retreats. SimplifiedHost brings clarity, structure, and ease to every moment of your planning process.
                </p>

                {/* Primary CTAs - Full width touch-friendly on mobile */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8" aria-label="Primary actions">
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    className="w-full sm:w-auto h-12 sm:h-auto text-base"
                    onClick={() => setPlanDialogOpen(true)}
                  >
                    <MousePointerClick className="w-5 h-5 mr-2" />
                    Plan with a Click
                  </Button>

                  {/* I'm Attending -> opens event code dialog */}
                  <Dialog open={attendOpen} onOpenChange={setAttendOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="w-full sm:w-auto h-12 sm:h-auto text-base bg-[#152F23] hover:bg-[#0f211a] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#152F23] focus-visible:ring-offset-2"
                      >
                        Find My Event
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md mx-4" aria-describedby="event-code-description">
                      <DialogHeader>
                        <DialogTitle>Enter Your Event Code</DialogTitle>
                      </DialogHeader>

                      <div id="event-code-description" className="sr-only">
                        Enter the event code provided by your host to join the event
                      </div>

                      <form className="space-y-4" onSubmit={onSubmitCode}>
                        {/* Inline error banner with fade animation */}
                        {error && (
                          <div
                            key={error}
                            className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm flex items-start gap-2 animate-fade-in"
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
                            aria-describedby={error ? "event-code-error" : "event-code-help"}
                            className="h-12 text-base focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          />
                          <p id="event-code-help" className="text-sm text-muted-foreground">
                            Enter the event code shared by your host (not case-sensitive).
                          </p>
                          {error && (
                            <p id="event-code-error" className="text-sm text-destructive" role="alert">
                              {error}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setAttendOpen(false)}
                            className="h-12 px-6 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            className="h-12 px-6 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            Continue
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </AnimatedElement>
            </div>
          </section>

          {/* Intimate Gathering Image */}
          <section className="w-full max-w-[120rem] mx-auto" aria-label="Intimate gathering showcase">
            <img
              src={intimateGathering}
              alt="Diverse group of friends enjoying an intimate dinner party with warm candlelight and genuine connection"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </section>

          {/* How It Works */}
          <section
            className="w-full max-w-[120rem] mx-auto py-12 sm:py-16 lg:py-32 px-4 sm:px-12 md:px-16 bg-background"
            id="how-it-works"
            aria-labelledby="how-it-works-title"
          >
            <AnimatedElement className="max-w-2xl mb-12 sm:mb-20 lg:mb-24">
              <p className="text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4 text-foreground/60">How It Works</p>
              <h2 id="how-it-works-title" className="font-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                From Idea to Celebration
              </h2>
              <p className="text-sm sm:text-lg text-foreground/70 mt-3 sm:mt-4">
                Together, we create moments worth remembering.
              </p>
            </AnimatedElement>

            <div className="space-y-10 sm:space-y-16">
              {/* Step 1 */}
              <AnimatedElement className="grid lg:grid-cols-2 gap-6 sm:gap-12 lg:gap-16 items-center">
                <div className="relative aspect-[4/3]">
                  <img
                    src="https://static.wixstatic.com/media/16a7fb_44ae25b251d9436db619dbd9ab1af9cb~mv2.png?originWidth=768&originHeight=576"
                    alt="Create and customize an event with smart planning tools."
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="font-heading text-4xl sm:text-5xl font-bold text-primary/20">01</span>
                    <Sparkles className="w-6 h-6 text-primary" aria-hidden />
                  </div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">Plan with AI</h3>
                  <p className="text-base sm:text-lg text-foreground/80 leading-relaxed mb-6">
                    Describe your event in plain English. AI instantly generates a complete plan with tasks, items, and timeline tailored to your needs.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">AI-powered event plans</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Smart task &amp; item suggestions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Customizable templates</span>
                    </li>
                  </ul>
                </div>
              </AnimatedElement>

              {/* Step 2 */}
              <AnimatedElement className="grid lg:grid-cols-2 gap-6 sm:gap-12 lg:gap-16 items-center">
                <div className="lg:order-2 relative aspect-[4/3]">
                  <img
                    src={step2Menu}
                    alt="Diverse group using AI-powered menu generation with dietary tagging."
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="lg:order-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="font-heading text-4xl sm:text-5xl font-bold text-primary/20">02</span>
                    <Wand2 className="w-6 h-6 text-primary" aria-hidden />
                  </div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">Review &amp; Organize</h3>
                  <p className="text-base sm:text-lg text-foreground/80 leading-relaxed mb-6">
                    Fine-tune your event plan. Adjust tasks, add items, invite guests, and set deadlines. Everything organized in one place.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Edit tasks &amp; responsibilities</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Manage guest list &amp; invites</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Set deadlines &amp; reminders</span>
                    </li>
                  </ul>
                </div>
              </AnimatedElement>

              {/* Step 3 */}
              <AnimatedElement className="grid lg:grid-cols-2 gap-6 sm:gap-12 lg:gap-16 items-center">
                <div className="relative aspect-[4/3]">
                  <img
                    src="https://static.wixstatic.com/media/16a7fb_893fae6d536a4e999258cbfb4ed1c2d4~mv2.png?originWidth=768&originHeight=576"
                    alt="Real-time coordination and tracking of RSVPs and dishes."
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="font-heading text-4xl sm:text-5xl font-bold text-primary/20">03</span>
                    <BarChart3 className="w-6 h-6 text-primary" aria-hidden />
                  </div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">Share &amp; Track</h3>
                  <p className="text-base sm:text-lg text-foreground/80 leading-relaxed mb-6">
                    Share via simple link. Track RSVPs, monitor progress, and collaborate in real-time. No account needed for guests.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Real-time RSVP tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Item claim &amp; contribution status</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" aria-hidden />
                      <span className="text-sm sm:text-base text-foreground/80">Guest collaboration features</span>
                    </li>
                  </ul>
                </div>
              </AnimatedElement>
            </div>
          </section>

          {/* Dashboard Command Center Section */}
          <section className="w-full bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 sm:py-16 lg:py-32" aria-labelledby="dashboard-title">
            <div className="max-w-6xl mx-auto px-4 sm:px-12 md:px-16">
              <AnimatedElement className="text-center mb-10 sm:mb-16 lg:mb-20 max-w-3xl mx-auto">
                <p className="text-xs sm:text-sm tracking-widest uppercase mb-3 sm:mb-4 text-foreground/60">Host Dashboard</p>
                <h2 id="dashboard-title" className="font-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
                  Your Command Center for Perfect Events
                </h2>
                <p className="text-sm sm:text-lg text-foreground/70">
                  The Host Dashboard gives you complete visibility and control. Track every detail, collaborate with your team, and ensure nothing falls through the cracks.
                </p>
              </AnimatedElement>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
                {dashboardFeatures.map((f, i) => (
                  <AnimatedElement key={f.title} delay={`${i * 100}ms`}>
                    <Card className="feature-card h-full border-0 shadow-lg bg-card hover:shadow-xl focus-within:shadow-xl">
                      <CardContent className="p-6 flex gap-4">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground flex-shrink-0" aria-hidden>
                          {f.icon}
                        </div>
                        <div>
                          <h4 className="font-heading text-lg font-semibold text-foreground mb-2">{f.title}</h4>
                          <p className="text-sm text-foreground/70">{f.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedElement>
                ))}
              </div>

              <AnimatedElement className="text-center">
                <Link to="/dashboard" className="block w-full sm:w-auto sm:inline-block">
                  <Button size="lg" className="w-full sm:w-auto h-12 sm:h-auto text-base">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Explore Dashboard Features
                  </Button>
                </Link>
              </AnimatedElement>
            </div>
          </section>

          {/* Install CTA - hidden if already installed */}
          <InstallCTA />

          {/* CTA Section */}
          <section className="bg-gradient-to-br from-primary to-primary/80 py-12 sm:py-16 lg:py-32" aria-labelledby="cta-title">
            <div className="max-w-4xl mx-auto px-4 sm:px-12 md:px-16 text-center">
              <AnimatedElement>
                <h2 id="cta-title" className="font-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 sm:mb-6">
                  Ready to Host Your Best Event Yet?
                </h2>
                <p className="text-sm sm:text-lg text-primary-foreground/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
                  Join hosts who've simplified their event planning and created unforgettable experiences.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Link to="/dashboard" className="w-full sm:w-auto">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto h-12 sm:h-auto text-base">
                      Start Planning Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </AnimatedElement>
            </div>
          </section>
        </main>
        {/* Hide footer on mobile for app-like experience */}
        <div className="hidden md:block">
          <Footer />
        </div>
        <FloatingInstallBanner />
        
        <PlanWithClickDialog 
          open={planDialogOpen} 
          onOpenChange={setPlanDialogOpen} 
        />
      </div>
    </>
  );
};

export default Home;
