import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, X, Sparkles } from "lucide-react";
import NaturalLanguageScreen from "./NaturalLanguageScreen";
import PlanOutputScreen from "./PlanOutputScreen";
import SuccessScreen from "./SuccessScreen";
import AuthGateScreen from "./AuthGateScreen";

// Existing event context for Enhance Mode
export interface ExistingEventContext {
  id: string;
  name: string;
  date?: string | null;
  guestCount?: number | null;
  items: Array<{ name: string; category?: string | null }>;
  tasks: Array<{ title: string }>;
}

interface PlanWithClickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEvent?: ExistingEventContext;
  onEventUpdated?: () => void;
}

// Structured plan data type
export type EventPlanData = {
  planName: string;
  planSummary: string;
  timeline: {
    threeDaysBefore: string[];
    oneDayBefore: string[];
    dayOf: string[];
    oneHourBefore: string[];
    duringEvent: string[];
  };
  menuItems: Array<{
    category: string;
    items: Array<{ name: string; note?: string }>;
  }>;
  hostTodos: string[];
  setupTips: string[];
};

type Screen = 'input' | 'output' | 'auth-gate' | 'success';

const screenConfig: Record<Screen, { title: string; progress: number }> = {
  'input': { title: 'Plan Your Event', progress: 25 },
  'output': { title: 'Your Event Plan', progress: 60 },
  'auth-gate': { title: 'Almost There!', progress: 85 },
  'success': { title: 'Event Published!', progress: 100 },
};

const PlanWithClickDialog = ({ open, onOpenChange, existingEvent, onEventUpdated }: PlanWithClickDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentScreen, setCurrentScreen] = useState<Screen>('input');
  
  // Derive mode from existingEvent prop
  const mode = existingEvent ? "enhance" : "create";
  const [generatedPlan, setGeneratedPlan] = useState<EventPlanData | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | undefined>();
  
  // Form state lifted from NaturalLanguageScreen
  const [isFormValid, setIsFormValid] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateTrigger, setGenerateTrigger] = useState(0);

  useEffect(() => {
    if (open && !user) {
      setCurrentScreen('input');
    }
  }, [open, user]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      // Small delay to allow close animation
      const timer = setTimeout(() => {
        setCurrentScreen('input');
        setGeneratedPlan(null);
        setCreatedEventId(null);
        setEventDate(undefined);
        setIsFormValid(false);
        setIsGenerating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handlePlanGenerated = (plan: EventPlanData, date?: Date) => {
    setGeneratedPlan(plan);
    setEventDate(date);
    setCurrentScreen('output');
    setIsGenerating(false);
  };

  const handleEventCreated = (eventId: string) => {
    setCreatedEventId(eventId);
    setCurrentScreen('success');
  };

  const handleAuthRedirect = () => {
    navigate('/auth?redirect=plan-with-click');
    onOpenChange(false);
  };

  const handleReset = () => {
    setCurrentScreen('input');
    setGeneratedPlan(null);
    setCreatedEventId(null);
    setEventDate(undefined);
    setIsFormValid(false);
  };

  const handleBack = () => {
    if (currentScreen === 'output') {
      setCurrentScreen('input');
    } else if (currentScreen === 'auth-gate') {
      setCurrentScreen('output');
    }
  };

  const handleGenerate = () => {
    setGenerateTrigger(prev => prev + 1);
  };

  const handleFormValidChange = (valid: boolean) => {
    setIsFormValid(valid);
  };

  const handleGeneratingChange = (generating: boolean) => {
    setIsGenerating(generating);
  };

  // Header component
  const Header = ({ showClose = true }: { showClose?: boolean }) => (
    <div className="shrink-0 bg-background border-b pt-safe">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {currentScreen !== 'input' && currentScreen !== 'success' && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg">
              {mode === "enhance" && existingEvent
                ? `Add to "${existingEvent.name}"`
                : screenConfig[currentScreen].title}
            </h2>
          </div>
        </div>
        {showClose && (
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="px-4 pb-3">
        <Progress value={screenConfig[currentScreen].progress} className="h-1" />
      </div>
    </div>
  );

  // Footer component with context-aware CTAs
  const Footer = () => {
    if (currentScreen === 'success') return null;

    return (
      <div className="shrink-0 border-t bg-background px-4 py-4 pb-safe">
        <div className="flex gap-3">
          {currentScreen === 'input' && (
            <Button
              onClick={handleGenerate}
              disabled={!isFormValid || isGenerating}
              className="flex-1 h-12"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate My Plan
                </>
              )}
            </Button>
          )}
          
          {currentScreen === 'output' && (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-12"
              >
                Edit
              </Button>
              <Button
                onClick={() => {
                  if (!user) {
                    setCurrentScreen('auth-gate');
                  }
                }}
                className="flex-1 h-12"
              >
                {user ? 'Apply to Event' : 'Sign In to Apply'}
              </Button>
            </>
          )}
          
          {currentScreen === 'auth-gate' && (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-12"
              >
                Back
              </Button>
              <Button
                onClick={handleAuthRedirect}
                className="flex-1 h-12"
              >
                Sign In / Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Content based on screen
  const renderContent = () => {
    switch (currentScreen) {
      case 'input':
        return (
          <NaturalLanguageScreen
            onPlanGenerated={handlePlanGenerated}
            onFormValidChange={handleFormValidChange}
            onGeneratingChange={handleGeneratingChange}
            generateTrigger={generateTrigger}
            embedded
            mode={mode}
            existingEvent={existingEvent}
          />
        );
      case 'output':
        return generatedPlan && (
          <PlanOutputScreen
            plan={generatedPlan}
            eventDate={eventDate}
            onBack={handleReset}
            onEventCreated={handleEventCreated}
            onAuthRequired={() => setCurrentScreen('auth-gate')}
            onPlanUpdate={(updatedPlan) => setGeneratedPlan(updatedPlan)}
            embedded
            mode={mode}
            existingEventId={existingEvent?.id}
            onEventUpdated={() => {
              onEventUpdated?.();
              onOpenChange(false);
            }}
          />
        );
      case 'auth-gate':
        return generatedPlan && (
          <AuthGateScreen
            plan={generatedPlan}
            onSignUp={handleAuthRedirect}
            onSignIn={handleAuthRedirect}
            onBack={() => setCurrentScreen('output')}
            embedded
          />
        );
      case 'success':
        return createdEventId && (
          <SuccessScreen
            eventId={createdEventId}
            onClose={() => onOpenChange(false)}
            onCreateAnother={handleReset}
            embedded
          />
        );
      default:
        return null;
    }
  };

  // Mobile: Full-screen drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] flex flex-col p-0 rounded-none">
          <Header />
          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>
          <Footer />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Responsive modal with potential two-pane layout
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0">
        <Header showClose={false} />
        
        {/* Two-pane layout on large screens when plan exists */}
        {currentScreen === 'output' && generatedPlan ? (
          <div className="flex-1 grid lg:grid-cols-2 gap-0 overflow-hidden">
            {/* Left: Input form (readonly summary) */}
            <div className="overflow-y-auto border-r p-6 hidden lg:block bg-muted/30">
              <h3 className="font-heading font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wide">
                Your Request
              </h3>
              <div className="space-y-3">
                <div className="bg-background rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="font-medium">{generatedPlan.planName}</p>
                </div>
                {eventDate && (
                  <div className="bg-background rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {eventDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                <div className="bg-background rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Summary</p>
                  <p className="text-sm">{generatedPlan.planSummary}</p>
                </div>
              </div>
            </div>
            
            {/* Right: Plan preview */}
            <div className="overflow-y-auto p-6">
              {renderContent()}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        )}
        
        <Footer />
      </DialogContent>
    </Dialog>
  );
};

export default PlanWithClickDialog;
