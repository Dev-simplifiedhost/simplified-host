import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  CreditCard, 
  Calendar, 
  Package,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ReminderType,
  SMS_TEMPLATES,
  SMS_CHARACTER_LIMIT,
  validateCharacterLimit,
  validateRequiredLinks,
  detectLinkVariableRemoval,
  getLinkVariableDisplayName,
} from "@/lib/smsTemplates";
import { toast } from "@/hooks/use-toast";

interface ReminderTypeSelectorProps {
  selectedType: ReminderType | null;
  onSelectType: (type: ReminderType) => void;
  customMessage: string;
  onCustomMessageChange: (message: string) => void;
  showItemReminder?: boolean;
  disabled?: boolean;
}

const REMINDER_TYPE_CONFIG = {
  rsvp: {
    icon: MessageSquare,
    label: 'RSVP Reminder',
    description: 'Ask guest to respond',
  },
  payment: {
    icon: CreditCard,
    label: 'Payment Reminder',
    description: 'Request contribution',
  },
  event_date: {
    icon: Calendar,
    label: 'Event Reminder',
    description: 'Upcoming event notice',
  },
  item_claim: {
    icon: Package,
    label: 'Item Reminder',
    description: 'Confirm what they\'re bringing',
  },
} as const;

export function ReminderTypeSelector({
  selectedType,
  onSelectType,
  customMessage,
  onCustomMessageChange,
  showItemReminder = true,
  disabled = false,
}: ReminderTypeSelectorProps) {
  const [originalTemplate, setOriginalTemplate] = useState<string>('');

  const handleSelectType = (type: ReminderType) => {
    const template = SMS_TEMPLATES[type];
    onSelectType(type);
    onCustomMessageChange(template.template);
    setOriginalTemplate(template.template);
  };

  const handleMessageChange = (value: string) => {
    if (!selectedType) return;
    
    // Check if link variables are being removed
    if (detectLinkVariableRemoval(originalTemplate, value)) {
      toast({
        title: "Required link missing",
        description: "Please restore the RSVP/payment/event link.",
        variant: "destructive",
      });
      return;
    }
    
    onCustomMessageChange(value);
  };

  const charValidation = validateCharacterLimit(customMessage);
  const linkValidation = selectedType 
    ? validateRequiredLinks(customMessage, selectedType)
    : { valid: true, missingLinks: [] };

  const reminderTypes = Object.entries(REMINDER_TYPE_CONFIG).filter(
    ([key]) => key !== 'item_claim' || showItemReminder
  );

  return (
    <div className="space-y-4">
      {/* Reminder Type Selection */}
      <div className="grid grid-cols-2 gap-2">
        {reminderTypes.map(([key, config]) => {
          const type = key as ReminderType;
          const isSelected = selectedType === type;
          const Icon = config.icon;
          
          return (
            <button
              key={type}
              onClick={() => handleSelectType(type)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
              {isSelected && (
                <Badge variant="secondary" className="text-[10px]">
                  <Check className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Template Editor - All templates are now editable */}
      {selectedType && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Customize Message</label>
          </div>
          
          <Textarea
            value={customMessage}
            onChange={(e) => handleMessageChange(e.target.value)}
            disabled={disabled}
            placeholder="Message template..."
            className={cn(
              "min-h-[100px] text-sm resize-none",
              (!charValidation.valid || !linkValidation.valid) && "border-destructive"
            )}
          />
          
          {/* Character Count & Validation */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {!linkValidation.valid && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Missing: {linkValidation.missingLinks.map(getLinkVariableDisplayName).join(', ')}
                </span>
              )}
            </div>
            <span className={cn(
              "font-mono",
              !charValidation.valid ? "text-destructive" : "text-muted-foreground"
            )}>
              {customMessage.length}/{SMS_CHARACTER_LIMIT}
            </span>
          </div>
          
          {!charValidation.valid && (
            <p className="text-xs text-destructive">
              Message too long. SMS must be under {SMS_CHARACTER_LIMIT} characters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
