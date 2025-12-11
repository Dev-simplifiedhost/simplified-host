import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackProEvent } from "@/lib/proAnalytics";
import { Sparkles, CheckCircle2, Users, ClipboardList, Share2, MousePointerClick, ArrowRight } from "lucide-react";
import PlanWithClickDialog from "@/components/plan-with-click/PlanWithClickDialog";
import { EnhancedWizardDialog } from "@/components/dashboard/EnhancedWizardDialog";
import { MobileCreateEventFlow } from "@/components/dashboard/MobileCreateEventFlow";

// Images
import heroImage from "@/assets/how-it-works-hero.jpg";
import planImage from "@/assets/how-it-works-plan.jpg";
import organizeImage from "@/assets/how-it-works-organize.jpg";
import shareImage from "@/assets/how-it-works-share.jpg";
const SECTIONS = [{
  id: "plan",
  label: "Plan"
}, {
  id: "organize",
  label: "Organize"
}, {
  id: "share",
  label: "Share"
}] as const;
type SectionId = typeof SECTIONS[number]["id"];
export default function HowItWorks() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<SectionId>("plan");
  const [isAnchorSticky, setIsAnchorSticky] = useState(false);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [planWithClickOpen, setPlanWithClickOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    plan: null,
    organize: null,
    share: null
  });

  // Fetch user event count for CTA logic
  useEffect(() => {
    if (user) {
      const fetchEventCount = async () => {
        const {
          count
        } = await supabase.from("events").select("id", {
          count: "exact",
          head: true
        }).eq("user_id", user.id).eq("is_draft", false).or("is_archived.is.null,is_archived.eq.false");
        setEventCount(count || 0);
      };
      fetchEventCount();
    } else {
      setEventCount(null);
    }
  }, [user]);

  // Track page view
  useEffect(() => {
    if (user) {
      trackProEvent("pro_hint_viewed", {
        userId: user.id,
        source: "how_it_works_page"
      });
    }
    window.dispatchEvent(new CustomEvent("analytics", {
      detail: {
        event: "howitworks_page_view"
      }
    }));
  }, [user]);

  // Scroll tracking for sticky nav and active section
  useEffect(() => {
    const handleScroll = () => {
      if (anchorRef.current) {
        const anchorTop = anchorRef.current.getBoundingClientRect().top;
        setIsAnchorSticky(anchorTop <= 80);
      }
      const scrollPosition = window.scrollY + 200;
      for (const section of SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const {
            offsetTop,
            offsetHeight
          } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
      SECTIONS.forEach(section => {
        const element = sectionRefs.current[section.id];
        if (element) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          if (isVisible) {
            const key = `howitworks_section_${section.id}_viewed`;
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, "true");
              window.dispatchEvent(new CustomEvent("analytics", {
                detail: {
                  event: `howitworks_section_${section.id}_view`
                }
              }));
            }
          }
        }
      });
    };
    window.addEventListener("scroll", handleScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const scrollToSection = useCallback((sectionId: SectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 100;
      const top = element.offsetTop - offset;
      window.scrollTo({
        top,
        behavior: shouldReduceMotion ? "auto" : "smooth"
      });
    }
    window.dispatchEvent(new CustomEvent("analytics", {
      detail: {
        event: `howitworks_anchor_${sectionId}_click`
      }
    }));
  }, [shouldReduceMotion]);
  const handlePrimaryCTA = (source: "hero" | "plan" | "organize" | "share" | "bottom") => {
    window.dispatchEvent(new CustomEvent("analytics", {
      detail: {
        event: `howitworks_cta_${source}_click`,
        action: "primary"
      }
    }));
    if (!user) {
      navigate("/auth?redirect=/dashboard");
    } else if (eventCount === 0) {
      setCreateEventOpen(true);
    } else {
      navigate("/dashboard");
    }
  };
  const handleSecondaryCTA = (source: "hero" | "plan" | "organize" | "share" | "bottom") => {
    window.dispatchEvent(new CustomEvent("analytics", {
      detail: {
        event: `howitworks_cta_${source}_click`,
        action: "secondary"
      }
    }));
    setPlanWithClickOpen(true);
  };
  const getPrimaryButtonText = () => {
    if (!user) return "Create Your Event";
    if (eventCount === 0) return "Create Your Event";
    return "Go to Event Center";
  };
  const fadeInUp = shouldReduceMotion ? {} : {
    initial: {
      opacity: 0,
      y: 20
    },
    whileInView: {
      opacity: 1,
      y: 0
    },
    viewport: {
      once: true,
      margin: "-50px"
    },
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const
    }
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Plan Events with SimplifiedHost",
    "description": "SimplifiedHost uses AI to generate your event plan—complete with tasks, item lists, and timelines—so you can focus on bringing people together.",
    "step": [{
      "@type": "HowToStep",
      "name": "Plan with AI",
      "text": "Tell us what you're planning and our AI creates everything you need: a task list, suggested items with quantities, category groupings, and a prep timeline."
    }, {
      "@type": "HowToStep",
      "name": "Review & Organize",
      "text": "Edit tasks, assign responsibilities, and add notes. As guests claim items, quantities update automatically—nothing disappears, but everything stays organized."
    }, {
      "@type": "HowToStep",
      "name": "Share & Track",
      "text": "Share your event with a single link—guests can RSVP, claim items, and contribute, all without creating an account. See everything update in real-time."
    }]
  };
  return <>
      <Helmet>
        <title>How It Works | SimplifiedHost</title>
        <meta name="description" content="Discover how SimplifiedHost helps you plan events effortlessly—from AI planning to task organization and real-time guest collaboration." />
        <meta property="og:title" content="How SimplifiedHost Works" />
        <meta property="og:description" content="Discover how SimplifiedHost helps you plan events effortlessly—from AI planning to task organization and real-time guest collaboration." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://simplifiedhost.com/how-it-works" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to content
      </a>

      <Header />

      <main id="main-content" className="min-h-screen bg-background overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-28 lg:py-32 flex items-center justify-center overflow-hidden" aria-labelledby="hero-heading">
          <div className="absolute inset-0">
            <img src={heroImage} alt="Diverse group of people celebrating at an elegant dinner party" className="w-full h-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/80" />
          </div>
          
          <motion.div className="relative z-10 text-center px-4 sm:px-6 max-w-[900px] mx-auto" {...fadeInUp}>
            <div className="bg-black/30 backdrop-blur-md rounded-2xl py-10 md:py-12 px-6 md:px-12 border border-white/15 shadow-2xl">
              <h1 id="hero-heading" className="text-[32px] sm:text-[38px] md:text-[44px] lg:text-[48px] font-heading font-bold text-white mb-5 md:mb-6 drop-shadow-lg tracking-tight leading-tight">
                Plan, organize, and share your event in one calm, simple workspace.
              </h1>
              
              {/* Benefit Bar */}
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6">
                <span className="text-sm md:text-base text-white/95 font-medium">
                  Three essentials in one place — planning, RSVPs, tasks, contributions.
                </span>
              </div>
              
              <p className="text-base md:text-lg lg:text-xl text-white/95 max-w-2xl mx-auto font-body drop-shadow-md leading-relaxed">
                SimplifiedHost brings everything together so you can host with <strong className="text-white">clarity and ease</strong>.
              </p>
              
              {/* Hero CTA */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" className="min-h-[48px] w-full sm:w-auto px-8 font-semibold text-base shadow-lg" onClick={() => handlePrimaryCTA("hero")} aria-label="Start planning your event for free">
                  Start Planning Free
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="lg" className="min-h-[48px] w-full sm:w-auto px-6 font-medium text-base gap-2 text-white border border-white/30 hover:bg-white/10" onClick={() => handleSecondaryCTA("hero")} aria-label="Generate an event plan with AI">
                  <MousePointerClick className="w-4 h-4" aria-hidden="true" />
                  Plan with AI
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Why SimplifiedHost Section */}
        <section className="pt-16 pb-20 px-4 sm:px-6 bg-background" aria-labelledby="why-heading">
          <motion.div className="max-w-[900px] mx-auto text-center" {...fadeInUp}>
            <h2 id="why-heading" className="md:text-sm font-heading font-semibold tracking-widest text-muted-foreground uppercase mb-6 text-base">
              Why SimplifiedHost Works
            </h2>
            <p className="text-[16px] md:text-[18px] text-foreground leading-relaxed font-body mb-4">
              Planning an event comes with a lot of moving parts. <strong>SimplifiedHost</strong> gives you a clear starting point and a plan you can follow—without juggling spreadsheets, shared docs, or scattered tools.
            </p>
            <p className="text-[16px] md:text-[18px] text-foreground leading-relaxed font-body">
              Start with an <strong>AI-generated plan</strong>, refine it with intuitive tools, and share with a single link. Your guests can participate without signing up, and you stay in control from beginning to end.
            </p>
          </motion.div>
        </section>

        {/* Section Divider */}
        <div className="max-w-[1100px] mx-auto px-4">
          <hr className="border-t border-border/50" />
        </div>

        {/* Anchor Navigation - Sticky segmented control */}
        <div ref={anchorRef} className={`sticky top-0 md:top-20 z-30 bg-background/95 backdrop-blur-sm border-b border-border transition-all duration-200 ${isAnchorSticky ? "shadow-sm" : ""}`} role="navigation" aria-label="Page sections">
          <div className="max-w-[1100px] mx-auto px-4">
            <nav className="flex items-center justify-center py-3 md:py-4">
              <div className="flex w-full md:w-auto bg-muted/50 rounded-lg p-1 gap-1">
                {SECTIONS.map(section => <button key={section.id} onClick={() => scrollToSection(section.id)} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 text-sm font-medium rounded-md transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${activeSection === section.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} aria-current={activeSection === section.id ? "true" : undefined}>
                    {section.label}
                  </button>)}
              </div>
            </nav>
          </div>
        </div>

        {/* Section 01 - Plan */}
        <section ref={el => sectionRefs.current.plan = el} id="plan" className="pt-16 pb-20 px-4 sm:px-6" aria-labelledby="plan-heading">
          <div className="max-w-[1100px] mx-auto">
            <motion.div className="grid md:grid-cols-2 gap-10 md:gap-14 items-start" {...fadeInUp}>
              <div className="order-2 md:order-1">
                {/* Section Badge */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm">
                    01
                  </span>
                  <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                
                {/* Heading */}
                <h2 id="plan-heading" className="text-[28px] md:text-[32px] font-heading font-semibold text-foreground mb-6 tracking-tight">
                  Plan with AI
                </h2>
                
                {/* Short Intro */}
                <p className="text-[16px] md:text-[18px] text-muted-foreground mb-8 font-body leading-relaxed">
                  Describe your event in your own words—"Friendsgiving for 12," "Baby shower brunch," "Office holiday party"—and <strong className="text-foreground">SimplifiedHost</strong> instantly generates tasks, items, timelines, and helpful nudges for things you might forget.
                </p>
                
                {/* Value Props - Bullets First */}
                <ul className="space-y-3 mb-8" role="list">
                  {["AI-generated event blueprint in seconds", "Smart task list based on your event type", "Suggested items with categories & quantities", "Timeline guidance based on event size & date"].map(item => <li key={item} className="flex items-start gap-3 text-[16px] text-foreground leading-7">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="font-body">{item}</span>
                    </li>)}
                </ul>
                
                {/* Supporting Detail */}
                <p className="text-[15px] text-muted-foreground mb-6 font-body leading-relaxed">
                  "Friendsgiving for 12," "Baby shower brunch," "Office holiday party"—just describe it and get tasks, items, prep timelines, and smart nudges for things you might forget.
                </p>
                
                {/* Example Callout */}
                <div className="bg-muted/40 border border-border/50 px-4 py-3 rounded-lg mb-8">
                  <p className="text-[14px] text-muted-foreground font-body italic">
                    <strong className="text-foreground not-italic">Example:</strong> Hosting Friendsgiving for 12? Your plan includes tasks, a prep timeline, grocery items, table setup, and potluck categories—generated in seconds.
                  </p>
                </div>
                
                {/* Section CTA */}
                <Button size="lg" className="min-h-[48px] w-full md:w-auto px-8 font-medium" onClick={() => handleSecondaryCTA("plan")} aria-label="Generate an AI event plan">
                  <MousePointerClick className="w-4 h-4 mr-2" aria-hidden="true" />
                  Generate a Plan
                </Button>
              </div>
              
              <div className="order-1 md:order-2">
                <img src={planImage} alt="Person thoughtfully planning an event on a laptop in a cozy living room" className="w-full rounded-xl shadow-lg object-cover aspect-[4/3]" loading="lazy" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="max-w-[1100px] mx-auto px-4">
          <hr className="border-t border-border/50" />
        </div>

        {/* Section 02 - Organize */}
        <section ref={el => sectionRefs.current.organize = el} id="organize" className="pt-16 pb-20 px-4 sm:px-6 bg-muted/20" aria-labelledby="organize-heading">
          <div className="max-w-[1100px] mx-auto">
            <motion.div className="grid md:grid-cols-2 gap-10 md:gap-14 items-start" {...fadeInUp}>
              {/* Image */}
              <div className="order-1">
                <img src={organizeImage} alt="Hands arranging a beautiful table setting with checklists and decorations" className="w-full rounded-xl shadow-lg object-cover aspect-[4/3]" loading="lazy" />
              </div>
              
              <div className="order-2">
                {/* Section Badge */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm">
                    02
                  </span>
                  <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                
                {/* Heading */}
                <h2 id="organize-heading" className="text-[28px] md:text-[32px] font-heading font-semibold text-foreground mb-6 tracking-tight">
                  Review & Organize
                </h2>
                
                {/* Short Intro */}
              <p className="text-[16px] md:text-[18px] text-muted-foreground mb-8 font-body leading-relaxed">
                Edit tasks, assign responsibilities, manage items, and collaborate with co-hosts. The registry-style tracking works for any event with shared items—baby showers, housewarmings, birthdays. Items never disappear; once covered, they move into a clean "Claimed" section so everyone stays aligned.
              </p>
                
                {/* Value Props - Bullets First */}
                <ul className="space-y-3 mb-8" role="list">
                  {["Co-host collaboration with real-time syncing", "Drag-style task and item organization", "Add URLs to items for gifts, supplies, or inspiration", "Remaining quantities update automatically as guests claim items", "Task reminders & progress tracking", "Export plan (PDF/shareable formats)"].map(item => <li key={item} className="flex items-start gap-3 text-[16px] text-foreground leading-7">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="font-body">{item}</span>
                    </li>)}
                </ul>
                
                {/* Supporting Detail */}
                
                
                {/* Example Callout */}
                <div className="bg-background border border-border/50 px-4 py-3 rounded-lg mb-8">
                  <p className="text-[14px] text-muted-foreground font-body italic">
                    <strong className="text-foreground not-italic">Example:</strong> Add a baby-shower gift category, and as guests claim items, they automatically move into a clean "Claimed" section.
                  </p>
                </div>
                
                {/* Section CTA */}
                <Button size="lg" className="min-h-[48px] w-full md:w-auto px-8 font-medium" onClick={() => handlePrimaryCTA("organize")} aria-label="Start organizing your event">
                  Start Organizing Your Event
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="max-w-[1100px] mx-auto px-4">
          <hr className="border-t border-border/50" />
        </div>

        {/* Section 03 - Share */}
        <section ref={el => sectionRefs.current.share = el} id="share" className="pt-16 pb-20 px-4 sm:px-6" aria-labelledby="share-heading">
          <div className="max-w-[1100px] mx-auto">
            <motion.div className="grid md:grid-cols-2 gap-10 md:gap-14 items-start" {...fadeInUp}>
              <div className="order-2 md:order-1">
                {/* Section Badge */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm">
                    03
                  </span>
                  <Share2 className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                
                {/* Heading */}
                <h2 id="share-heading" className="text-[28px] md:text-[32px] font-heading font-semibold text-foreground mb-6 tracking-tight">
                  Share & Track
                </h2>
                
                {/* Short Intro */}
                <p className="text-[16px] md:text-[18px] text-muted-foreground mb-8 font-body leading-relaxed">
                  Share your event with one link and let guests participate instantly—<strong className="text-foreground">no account required</strong>. You'll see what's happening in real time, so you always know who's attending, what's covered, and what still needs attention.
                </p>
                
                {/* Highlights Label */}
                <p className="text-[14px] font-medium text-foreground mb-3 font-heading">Highlights:</p>
                
                {/* Value Props - Bullets */}
                <ul className="space-y-3 mb-8" role="list">
                  {["See RSVPs and item updates the moment guests respond", "One shared list—guests claim or suggest items without spreadsheets", "Built-in messaging tools help hosts stay connected with guests (available on select plans)", "Track contributions easily—Credit Card, Apple Pay or manual payments all enabled and noted in one place", "Host sees every update from a single, organized dashboard"].map(item => <li key={item} className="flex items-start gap-3 text-[16px] text-foreground leading-7">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="font-body">{item}</span>
                    </li>)}
                </ul>
                
                {/* Section CTA */}
                <Button size="lg" className="min-h-[48px] w-full md:w-auto px-8 font-medium" onClick={() => handlePrimaryCTA("share")} aria-label="Share your event with guests">
                  Share With Guests
                </Button>
              </div>
              
              <div className="order-1 md:order-2">
                <img src={shareImage} alt="Friends arriving and greeting each other at the entrance of a modern home" className="w-full rounded-xl shadow-lg object-cover aspect-[4/3]" loading="lazy" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="max-w-[1100px] mx-auto px-4">
          <hr className="border-t border-border/50" />
        </div>

        {/* PWA Section - Compact Card (Mobile Only) */}
        {isMobile && (
          <section className="pt-12 pb-16 px-4 sm:px-6 bg-muted/20">
            <motion.div className="max-w-[800px] mx-auto" {...fadeInUp}>
              <div className="bg-background border border-border rounded-xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl" aria-hidden="true">📱</span>
                  <h3 className="text-[20px] md:text-[22px] font-heading font-medium text-foreground">
                    Use SimplifiedHost Like an App
                  </h3>
                </div>
                <p className="text-[15px] text-muted-foreground mb-5 font-body leading-relaxed">
                  Add SimplifiedHost to your home screen for faster access and a smooth, app-like experience.
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4 text-[14px]">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground">iPhone:</span>
                    <Link to="/install" className="text-primary hover:underline">Share → Add to Home Screen</Link>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground">Android:</span>
                    <Link to="/install" className="text-primary hover:underline">⋮ → Add to Home Screen</Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Social Proof */}
        <section className="py-6 px-4 sm:px-6 bg-muted/10">
          
        </section>

        {/* Final CTA Block */}
        <section className="pt-12 pb-16 md:pt-16 md:pb-20 px-4 sm:px-6 bg-primary" aria-labelledby="final-cta-heading">
          <motion.div className="max-w-[800px] mx-auto text-center" {...fadeInUp}>
            <h2 id="final-cta-heading" className="text-[24px] md:text-[28px] font-heading font-bold text-primary-foreground mb-3 tracking-tight">
              Your event starts here
            </h2>
            <p className="text-[16px] md:text-[18px] text-primary-foreground/90 mb-8 font-body leading-relaxed max-w-xl mx-auto">
              Whether you're hosting something intimate or planning a larger celebration, SimplifiedHost guides you from idea to execution.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" variant="secondary" className="min-h-[48px] w-full sm:w-auto px-8 font-semibold text-base" onClick={() => handlePrimaryCTA("bottom")} aria-label="Start your event now">
                Start Your Event
              </Button>
              <Button size="lg" variant="ghost" className="min-h-[48px] w-full sm:w-auto px-6 font-medium text-base gap-2 text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/10" onClick={() => handleSecondaryCTA("bottom")} aria-label="Generate an event plan with AI">
                <MousePointerClick className="w-4 h-4" aria-hidden="true" />
                Plan with AI
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />

      {/* Plan With Click Dialog */}
      <PlanWithClickDialog open={planWithClickOpen} onOpenChange={setPlanWithClickOpen} />

      {/* Create Event Dialogs */}
      {isMobile ? <MobileCreateEventFlow open={createEventOpen} onOpenChange={setCreateEventOpen} onEventCreated={eventId => {
      setCreateEventOpen(false);
      navigate(`/dashboard?event=${eventId}`);
    }} /> : <EnhancedWizardDialog open={createEventOpen} onOpenChange={setCreateEventOpen} onEventCreated={eventId => {
      setCreateEventOpen(false);
      navigate(`/dashboard?event=${eventId}`);
    }} />}
    </>;
}