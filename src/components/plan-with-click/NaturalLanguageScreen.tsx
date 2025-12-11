import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MousePointerClick, Calendar as CalendarIcon, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { format, differenceInHours, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EventPlanData, ExistingEventContext } from "./PlanWithClickDialog";

interface NaturalLanguageScreenProps {
  onPlanGenerated: (plan: EventPlanData, date?: Date) => void;
  onFormValidChange?: (valid: boolean) => void;
  onGeneratingChange?: (generating: boolean) => void;
  generateTrigger?: number;
  embedded?: boolean;
  mode?: "create" | "enhance";
  existingEvent?: ExistingEventContext;
}

const EVENT_TYPES = [
  { value: 'potluck_dinner', label: 'Potluck Dinner' },
  { value: 'game_night', label: 'Game Night' },
  { value: 'birthday', label: 'Birthday/Celebration' },
  { value: 'holiday', label: 'Holiday Gathering' },
  { value: 'work_social', label: 'Work Social/Team Event' },
  { value: 'shower', label: 'Baby/Bridal Shower' },
  { value: 'other', label: 'Other' },
];

const DURATION_OPTIONS = [
  { value: '2hrs', label: '2 hrs' },
  { value: '3hrs', label: '3 hrs' },
  { value: '4hrs', label: '4 hrs' },
  { value: '5+hrs', label: '5+ hrs' },
];

const GUEST_COUNT_OPTIONS = [
  { value: '5-10', label: '5–10' },
  { value: '10-20', label: '10–20' },
  { value: '20-40', label: '20–40' },
  { value: '40-75', label: '40–75' },
  { value: '75+', label: '75+' },
];

const RATE_LIMIT_KEY = 'planWithClick_generations';
const DAILY_LIMIT = 3;

const checkDailyLimit = (): { allowed: boolean; remaining: number; message?: string } => {
  const storedData = localStorage.getItem(RATE_LIMIT_KEY);
  const generations: string[] = storedData ? JSON.parse(storedData) : [];
  
  // Filter to only include generations within the last 24 hours
  const now = new Date();
  const recentGenerations = generations.filter(timestamp => {
    return differenceInHours(now, parseISO(timestamp)) < 24;
  });
  
  const remaining = DAILY_LIMIT - recentGenerations.length;
  
  if (remaining <= 0) {
    return { 
      allowed: false, 
      remaining: 0,
      message: "You've used all 3 free plans for today. Come back tomorrow!" 
    };
  }
  
  return { allowed: true, remaining };
};

const NaturalLanguageScreen = ({ onPlanGenerated, mode = "create", existingEvent }: NaturalLanguageScreenProps) => {
  const { toast } = useToast();
  const isEnhanceMode = mode === "enhance" && !!existingEvent;
  
  // Form state
  const [eventType, setEventType] = useState("");
  const [eventTypeOther, setEventTypeOther] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [duration, setDuration] = useState("");
  const [guestRange, setGuestRange] = useState("");
  const [hostingStyle, setHostingStyle] = useState("");
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  
  // Check daily limit
  const dailyLimit = checkDailyLimit();

  const isFormValid = () => {
    if (!eventType) return false;
    if (eventType === 'other' && !eventTypeOther.trim()) return false;
    if (!duration) return false;
    if (!guestRange) return false;
    if (!hostingStyle) return false;
    return true;
  };

  const handleGenerate = async () => {
    if (!isFormValid()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!dailyLimit.allowed) {
      toast({
        title: "Daily limit reached",
        description: dailyLimit.message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-event-plan', {
        body: {
          eventType: eventType === 'other' ? eventTypeOther : eventType,
          eventDate: eventDate?.toISOString(),
          duration,
          guestRange,
          hostingStyle,
          notes: notes.trim() || undefined,
          // Enhance mode: pass existing items/tasks
          existingItems: isEnhanceMode ? existingEvent.items : undefined,
          existingTasks: isEnhanceMode ? existingEvent.tasks : undefined,
        }
      });

      if (error) throw error;

      if (!data.success || !data.eventPlan) {
        throw new Error('Failed to generate event plan');
      }

      // Save timestamp for rate limiting (append to array)
      const storedData = localStorage.getItem(RATE_LIMIT_KEY);
      const generations: string[] = storedData ? JSON.parse(storedData) : [];
      generations.push(new Date().toISOString());
      // Keep only last 10 entries to prevent localStorage bloat
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(generations.slice(-10)));

      console.log('Generated plan:', data.eventPlan);
      onPlanGenerated(data.eventPlan, eventDate);
      
      toast({
        title: "Plan generated!",
        description: "Review your event plan below",
      });
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl">
          <MousePointerClick className="h-6 w-6 text-primary" />
          {isEnhanceMode ? `Add to "${existingEvent.name}"` : "Plan With a Click"}
        </DialogTitle>
        <DialogDescription>
          {isEnhanceMode 
            ? "Use AI to add more ideas, items, and tasks to this event."
            : "Tell us about your event and we'll create a complete plan for you"}
          {dailyLimit.allowed && dailyLimit.remaining < DAILY_LIMIT && (
            <span className="block mt-1 text-muted-foreground">
              {dailyLimit.remaining} free plan{dailyLimit.remaining !== 1 ? 's' : ''} remaining today
            </span>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Enhance Mode Context Block */}
        {isEnhanceMode && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Current Event Context
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {existingEvent.date && (
                <p>📅 {format(new Date(existingEvent.date), 'PPP')}</p>
              )}
              {existingEvent.guestCount && (
                <p>👥 {existingEvent.guestCount} expected guests</p>
              )}
              <p className="font-medium text-foreground mt-2">
                You already have {existingEvent.items.length} item{existingEvent.items.length !== 1 ? 's' : ''} and {existingEvent.tasks.length} task{existingEvent.tasks.length !== 1 ? 's' : ''}
              </p>
              {(existingEvent.items.length > 0 || existingEvent.tasks.length > 0) && (
                <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                  {existingEvent.items.slice(0, 3).map((item, i) => (
                    <li key={`item-${i}`}>{item.name}</li>
                  ))}
                  {existingEvent.tasks.slice(0, 2).map((task, i) => (
                    <li key={`task-${i}`}>{task.title}</li>
                  ))}
                  {(existingEvent.items.length > 3 || existingEvent.tasks.length > 2) && (
                    <li className="text-muted-foreground">...and more</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* Daily limit warning */}
        {!dailyLimit.allowed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{dailyLimit.message}</AlertDescription>
          </Alert>
        )}

        {/* Event Type */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Event Type *</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-12 sm:h-10">
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {eventType === 'other' && (
            <Textarea
              placeholder="Describe your event (e.g., neighborhood block party, book club meeting)"
              value={eventTypeOther}
              onChange={(e) => setEventTypeOther(e.target.value)}
              className="mt-2"
              maxLength={200}
            />
          )}
        </div>

        {/* Event Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <CalendarIcon className="h-4 w-4" />
            Event Date (Optional)
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-12 sm:h-10 justify-start text-left">
                {eventDate ? format(eventDate, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={eventDate}
                onSelect={setEventDate}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Duration & Guest Count Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Duration *</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-12 sm:h-10">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Guest Count *</Label>
            <Select value={guestRange} onValueChange={setGuestRange}>
              <SelectTrigger className="h-12 sm:h-10">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {GUEST_COUNT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Hosting Style */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Hosting Style *</Label>
          <RadioGroup value={hostingStyle} onValueChange={setHostingStyle}>
            <div className="flex flex-col gap-1">
              <label 
                htmlFor="potluck" 
                className="flex items-center space-x-3 py-3 px-2 rounded-md hover:bg-muted/50 cursor-pointer -mx-2"
              >
                <RadioGroupItem value="potluck" id="potluck" className="h-5 w-5" />
                <span className="font-normal text-base">Mostly potluck</span>
              </label>
              <label 
                htmlFor="host_provides" 
                className="flex items-center space-x-3 py-3 px-2 rounded-md hover:bg-muted/50 cursor-pointer -mx-2"
              >
                <RadioGroupItem value="host_provides" id="host_provides" className="h-5 w-5" />
                <span className="font-normal text-base">Host provides most things</span>
              </label>
              <label 
                htmlFor="mixed" 
                className="flex items-center space-x-3 py-3 px-2 rounded-md hover:bg-muted/50 cursor-pointer -mx-2"
              >
                <RadioGroupItem value="mixed" id="mixed" className="h-5 w-5" />
                <span className="font-normal text-base">Mixed / Not sure</span>
              </label>
            </div>
          </RadioGroup>
        </div>


        {/* Optional Notes */}
        <div className="space-y-2">
          <Label className="text-base font-medium">
            {isEnhanceMode ? "What would you like to add?" : "Additional Notes (Optional)"}
          </Label>
          <Textarea
            placeholder={isEnhanceMode 
              ? "Tell us what you'd like to add (e.g., 'more side dishes', 'indoor-friendly games', 'backup drinks plan')..."
              : "Any special requests, dietary restrictions, themes, etc."}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground text-right">
            {notes.length}/300 characters
          </p>
        </div>

        {/* Generate button */}
        <div className="pb-safe">
          <Button 
            onClick={handleGenerate} 
            disabled={loading || !isFormValid() || !dailyLimit.allowed}
            className="w-full h-12"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Your Plan...
              </>
            ) : (
              <>
                <MousePointerClick className="mr-2 h-4 w-4" />
                Generate My Plan
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default NaturalLanguageScreen;
