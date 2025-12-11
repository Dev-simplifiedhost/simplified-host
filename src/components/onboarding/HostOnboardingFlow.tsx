import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles, CalendarPlus, Eye, CheckCircle2, Users, ListTodo, Share2, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

interface HostOnboardingFlowProps {
  userId: string;
  onComplete: (openCreateEvent?: boolean) => void;
}

const TOTAL_STEPS = 4;

// Check if user prefers reduced motion
const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const slideVariants = {
  enter: (direction: number) => ({
    x: prefersReducedMotion() ? 0 : direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: prefersReducedMotion() ? 0 : direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const transition = {
  duration: prefersReducedMotion() ? 0 : 0.2,
  ease: "easeOut" as const,
};

export const HostOnboardingFlow = ({ userId, onComplete }: HostOnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load saved step on mount
  useEffect(() => {
    const loadSavedStep = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_step")
          .eq("id", userId)
          .single();
        
        if (data?.onboarding_step && data.onboarding_step > 0 && data.onboarding_step < TOTAL_STEPS) {
          setCurrentStep(data.onboarding_step);
        }
      } catch (error) {
        console.error("Error loading onboarding step:", error);
      }
    };
    loadSavedStep();
  }, [userId]);

  // Save step progress
  const saveStep = useCallback(async (step: number) => {
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_step: step })
        .eq("id", userId);
    } catch (error) {
      console.error("Error saving onboarding step:", error);
    }
  }, [userId]);

  const completeOnboarding = async (openCreateEvent = true) => {
    setIsLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({ 
          has_completed_host_onboarding: true,
          onboarding_step: null 
        })
        .eq("id", userId);
      
      onComplete(openCreateEvent);
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
      // Retry once
      setTimeout(async () => {
        try {
          await supabase
            .from("profiles")
            .update({ 
              has_completed_host_onboarding: true,
              onboarding_step: null 
            })
            .eq("id", userId);
          onComplete(openCreateEvent);
        } catch {
          // Graceful fallback
          onComplete(false);
        }
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding(false);
    toast({
      title: "Onboarding skipped",
      description: "You can explore anytime.",
    });
  };

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      saveStep(newStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      saveStep(newStep);
    }
  };

  const handleCreateEvent = async () => {
    await completeOnboarding(true);
  };

  const handlePlanWithClick = async () => {
    await completeOnboarding(false);
    navigate("/dashboard?openPWAC=true");
  };

  const handleStartPlanning = async () => {
    await completeOnboarding(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-heading font-semibold text-sm text-foreground">SimplifiedHost</span>
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-2 py-1"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </header>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-4" role="tablist" aria-label="Onboarding progress">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            role="tab"
            aria-selected={i === currentStep}
            aria-label={`Step ${i + 1} of ${TOTAL_STEPS}`}
            className={cn(
              "h-2 rounded-full transition-all duration-200",
              i === currentStep ? "w-6 bg-primary" : "w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="absolute inset-0 flex flex-col"
          >
            {currentStep === 0 && <WelcomeScreen />}
            {currentStep === 1 && <CapabilitiesScreen />}
            {currentStep === 2 && (
              <FirstEventScreen 
                onCreateEvent={handleCreateEvent}
                onPlanWithClick={handlePlanWithClick}
                isLoading={isLoading}
              />
            )}
            {currentStep === 3 && (
              <GetStartedScreen 
                onStart={handleStartPlanning}
                isLoading={isLoading}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <footer className="px-4 pb-safe pt-4 border-t border-border/50 bg-background">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="h-12 px-4 gap-2"
            aria-label="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {currentStep < 2 && (
            <Button
              onClick={nextStep}
              className="h-12 px-6 gap-2"
              aria-label="Next step"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          {currentStep >= 2 && currentStep < TOTAL_STEPS - 1 && (
            <Button
              variant="ghost"
              onClick={nextStep}
              className="h-12 px-4 gap-2"
              aria-label="Next step"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

// Screen Components
const WelcomeScreen = () => (
  <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.2 }}
      className="mb-8"
    >
      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>
    </motion.div>
    
    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
      Welcome to SimplifiedHost
    </h1>
    <p className="text-muted-foreground text-base sm:text-lg max-w-sm leading-relaxed">
      Plan confidently. Host with ease.
    </p>
  </div>
);

const CapabilitiesScreen = () => {
  const capabilities = [
    { icon: CalendarPlus, label: "Create events in seconds" },
    { icon: ListTodo, label: "Manage items & tasks" },
    { icon: Users, label: "Track RSVPs & guests" },
    { icon: Share2, label: "Share with anyone" },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-2 text-center">
        Everything you need
      </h2>
      <p className="text-muted-foreground text-sm sm:text-base mb-8 text-center max-w-sm">
        Powerful tools to make hosting effortless.
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {capabilities.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1, duration: 0.2 }}
            className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border/50"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground text-center leading-tight">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface FirstEventScreenProps {
  onCreateEvent: () => void;
  onPlanWithClick: () => void;
  isLoading: boolean;
}

const FirstEventScreen = ({ onCreateEvent, onPlanWithClick, isLoading }: FirstEventScreenProps) => (
  <div className="flex-1 flex flex-col items-center justify-center px-6">
    <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-2 text-center">
      Your first event
    </h2>
    <p className="text-muted-foreground text-sm sm:text-base mb-8 text-center max-w-sm">
      Choose how you'd like to start.
    </p>

    <div className="flex flex-col gap-3 w-full max-w-sm">
      <Button
        onClick={onCreateEvent}
        disabled={isLoading}
        className="h-14 gap-3 text-base justify-start px-5"
        aria-label="Create an event manually"
      >
        <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
          <CalendarPlus className="w-5 h-5" />
        </div>
        <div className="text-left">
          <div className="font-semibold">Create an Event</div>
          <div className="text-xs opacity-80">Start from scratch</div>
        </div>
      </Button>

      <Button
        variant="outline"
        onClick={onPlanWithClick}
        disabled={isLoading}
        className="h-14 gap-3 text-base justify-start px-5 border-primary/30 hover:bg-primary/5"
        aria-label="Plan with AI assistance"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MousePointerClick className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <div className="font-semibold text-foreground">Plan with a Click</div>
          <div className="text-xs text-muted-foreground">AI-powered planning</div>
        </div>
      </Button>
    </div>
  </div>
);

interface GetStartedScreenProps {
  onStart: () => void;
  isLoading: boolean;
}

const GetStartedScreen = ({ onStart, isLoading }: GetStartedScreenProps) => (
  <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.2 }}
      className="mb-8"
    >
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
    </motion.div>

    <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-2">
      You're all set!
    </h2>
    <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-sm leading-relaxed">
      Your event starts here. Let's build something memorable.
    </p>

    <Button
      onClick={onStart}
      disabled={isLoading}
      size="lg"
      className="h-14 px-8 text-base gap-2"
      aria-label="Start planning your event"
    >
      <span>Start Planning</span>
      <ChevronRight className="w-5 h-5" />
    </Button>
  </div>
);

export default HostOnboardingFlow;
