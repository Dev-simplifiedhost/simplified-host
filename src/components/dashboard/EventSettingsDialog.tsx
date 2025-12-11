import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Users, Bell, LayoutGrid, DollarSign, UserPlus, X, ChevronDown, Settings2 } from "lucide-react";
import { EventKPISettings } from "./EventKPISettings";
import { ContributionSettings } from "./ContributionSettings";
import { CollaboratorsSection } from "./CollaboratorsSection";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface EventSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  defaultTab?: string;
  isCollaborator?: boolean;
  currentSettings: {
    privacySetting: string;
    allowPlusOnes: boolean;
    maxPlusOnes: number | null;
    showGuestList: boolean;
    archiveDelay: number;
    itemClaimEligibility: string;
    itemSuggestEligibility?: string;
    remindersEnabled: boolean;
    requireEmailForMessages: boolean;
    requireEmailForRsvp: boolean;
    reminderSettings: {
      rsvp_reminder_days?: number;
      item_reminder_days?: number;
      contribution_reminder_days?: number;
      thank_you_delay_days?: number;
    };
    skipExternalLinkInterstitial?: boolean;
    maxGuestClaimsPerItem?: number | null;
    // Contribution settings
    contributionsEnabled?: boolean;
    contributionType?: string;
    contributionPerGuest?: number | null;
    contributionSuggestedAmount?: number | null;
    contributionMinimumAmount?: number | null;
    contributionGoal?: number | null;
    contributionMessage?: string | null;
    creditCardPaymentsEnabled?: boolean;
  };
  onUpdate: () => void;
}

export function EventSettingsDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  defaultTab = "general",
  isCollaborator = false,
  currentSettings,
  onUpdate,
}: EventSettingsDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const accordionRef = useRef<HTMLDivElement>(null);
  
  // Privacy & Access
  const [privacySetting, setPrivacySetting] = useState(currentSettings.privacySetting === 'public');
  const [showGuestList, setShowGuestList] = useState(currentSettings.showGuestList);
  const [requireEmailForRsvp, setRequireEmailForRsvp] = useState(currentSettings.requireEmailForRsvp);
  
  // Guest Rules
  const [allowPlusOnes, setAllowPlusOnes] = useState(currentSettings.allowPlusOnes);
  const [maxPlusOnes, setMaxPlusOnes] = useState<number | null>(currentSettings.maxPlusOnes);
  const [itemClaimEligibility, setItemClaimEligibility] = useState(currentSettings.itemClaimEligibility || 'attending_only');
  const [itemSuggestEligibility, setItemSuggestEligibility] = useState<string>(
    currentSettings.itemSuggestEligibility || 'attending_and_maybe'
  );
  
  // Advanced Options
  const [skipExternalLinkInterstitial, setSkipExternalLinkInterstitial] = useState(currentSettings.skipExternalLinkInterstitial || false);
  const [maxGuestClaimsPerItem, setMaxGuestClaimsPerItem] = useState<number | null>(currentSettings.maxGuestClaimsPerItem || null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // Automations
  const [remindersEnabled, setRemindersEnabled] = useState(currentSettings.remindersEnabled);
  const [rsvpReminderDays, setRsvpReminderDays] = useState(currentSettings.reminderSettings.rsvp_reminder_days || 3);
  const [itemReminderDays, setItemReminderDays] = useState(currentSettings.reminderSettings.item_reminder_days || 2);
  const [contributionReminderDays, setContributionReminderDays] = useState(currentSettings.reminderSettings.contribution_reminder_days || 1);
  const [thankYouDelayDays, setThankYouDelayDays] = useState(currentSettings.reminderSettings.thank_you_delay_days || 1);
  const [archiveDelay, setArchiveDelay] = useState(currentSettings.archiveDelay);
  
  const [saving, setSaving] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>("privacy");
  
  // Dirty state tracking
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  
  // Validation state
  const [plusOneError, setPlusOneError] = useState<string | null>(null);

  // Check if form has changes (dirty state)
  const isDirty = useMemo(() => {
    return (
      privacySetting !== (currentSettings.privacySetting === 'public') ||
      showGuestList !== currentSettings.showGuestList ||
      requireEmailForRsvp !== currentSettings.requireEmailForRsvp ||
      allowPlusOnes !== currentSettings.allowPlusOnes ||
      maxPlusOnes !== currentSettings.maxPlusOnes ||
      itemClaimEligibility !== (currentSettings.itemClaimEligibility || 'attending_only') ||
      itemSuggestEligibility !== (currentSettings.itemSuggestEligibility || 'attending_and_maybe') ||
      skipExternalLinkInterstitial !== (currentSettings.skipExternalLinkInterstitial || false) ||
      maxGuestClaimsPerItem !== (currentSettings.maxGuestClaimsPerItem || null) ||
      remindersEnabled !== currentSettings.remindersEnabled ||
      rsvpReminderDays !== (currentSettings.reminderSettings.rsvp_reminder_days || 3) ||
      itemReminderDays !== (currentSettings.reminderSettings.item_reminder_days || 2) ||
      contributionReminderDays !== (currentSettings.reminderSettings.contribution_reminder_days || 1) ||
      thankYouDelayDays !== (currentSettings.reminderSettings.thank_you_delay_days || 1) ||
      archiveDelay !== currentSettings.archiveDelay
    );
  }, [
    privacySetting, showGuestList, requireEmailForRsvp, allowPlusOnes, maxPlusOnes,
    itemClaimEligibility, itemSuggestEligibility, skipExternalLinkInterstitial,
    maxGuestClaimsPerItem, remindersEnabled, rsvpReminderDays, itemReminderDays,
    contributionReminderDays, thankYouDelayDays, archiveDelay, currentSettings
  ]);

  // Re-sync state when dialog opens or settings change
  useEffect(() => {
    if (open) {
      setPrivacySetting(currentSettings.privacySetting === 'public');
      setShowGuestList(currentSettings.showGuestList);
      setRequireEmailForRsvp(currentSettings.requireEmailForRsvp);
      setAllowPlusOnes(currentSettings.allowPlusOnes);
      setMaxPlusOnes(currentSettings.maxPlusOnes);
      setItemClaimEligibility(currentSettings.itemClaimEligibility || 'attending_only');
      setItemSuggestEligibility(currentSettings.itemSuggestEligibility || 'attending_and_maybe');
      setSkipExternalLinkInterstitial(currentSettings.skipExternalLinkInterstitial || false);
      setMaxGuestClaimsPerItem(currentSettings.maxGuestClaimsPerItem || null);
      setRemindersEnabled(currentSettings.remindersEnabled);
      setRsvpReminderDays(currentSettings.reminderSettings.rsvp_reminder_days || 3);
      setItemReminderDays(currentSettings.reminderSettings.item_reminder_days || 2);
      setContributionReminderDays(currentSettings.reminderSettings.contribution_reminder_days || 1);
      setThankYouDelayDays(currentSettings.reminderSettings.thank_you_delay_days || 1);
      setArchiveDelay(currentSettings.archiveDelay);
      setPlusOneError(null);
    }
  }, [open, currentSettings]);

  // Auto-scroll to accordion section when opened
  const handleAccordionChange = useCallback((value: string) => {
    setOpenAccordion(value);
    if (value && accordionRef.current) {
      // Respect reduce motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        const accordionItem = accordionRef.current?.querySelector(`[data-state="open"]`);
        accordionItem?.scrollIntoView({ 
          behavior: prefersReducedMotion ? 'auto' : 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, []);

  // Validate plus-ones
  useEffect(() => {
    if (allowPlusOnes && maxPlusOnes === null) {
      setPlusOneError("There is no limit at the moment. Please select how many additional guests are allowed.");
    } else {
      setPlusOneError(null);
    }
  }, [allowPlusOnes, maxPlusOnes]);

  // Handle dialog close with dirty state check
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && isDirty) {
      setPendingClose(true);
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  }, [isDirty, onOpenChange]);

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingClose(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSaveAndClose = useCallback(async () => {
    await handleSave();
    setShowUnsavedDialog(false);
    setPendingClose(false);
  }, []);

  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingClose(false);
  }, []);

  const handleSave = async () => {
    // Validate plus-ones
    if (allowPlusOnes && maxPlusOnes === null) {
      setPlusOneError("There is no limit at the moment. Please select how many additional guests are allowed.");
      setOpenAccordion("guests");
      toast({
        title: "Validation error",
        description: "Please select how many additional guests are allowed.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          privacy_setting: privacySetting ? 'public' : 'private',
          show_guest_list: showGuestList,
          require_email_for_rsvp: requireEmailForRsvp,
          allow_plus_ones: allowPlusOnes,
          max_plus_ones: allowPlusOnes ? maxPlusOnes : null,
          item_claim_eligibility: itemClaimEligibility,
          item_suggest_eligibility: itemSuggestEligibility,
          skip_external_link_interstitial: skipExternalLinkInterstitial,
          max_guest_claims_per_item: maxGuestClaimsPerItem,
          reminders_enabled: remindersEnabled,
          reminder_settings: {
            rsvp_reminder_days: rsvpReminderDays,
            item_reminder_days: itemReminderDays,
            contribution_reminder_days: contributionReminderDays,
            thank_you_delay_days: thankYouDelayDays,
          },
          archive_delay_days: archiveDelay,
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your event settings have been updated.",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating event settings:', error);
      toast({
        title: "Failed to update",
        description: "There was an error updating the event settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Accordion motion class (respects reduce motion)
  const accordionMotionClass = "data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up";

  const SettingsContent = () => (
    <Tabs defaultValue={defaultTab} className="w-full flex flex-col h-full">
      <TabsList className={`grid w-full shrink-0 ${isCollaborator ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <TabsTrigger value="general" aria-label="General settings">General</TabsTrigger>
        {!isCollaborator && (
          <TabsTrigger value="contributions" aria-label="Payment settings">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
        )}
        {!isCollaborator && (
          <TabsTrigger value="collaborators" aria-label="Team collaborators">
            <UserPlus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
        )}
        <TabsTrigger value="kpi" aria-label="KPI tile settings">
          <LayoutGrid className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">KPI</span>
        </TabsTrigger>
      </TabsList>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <TabsContent value="general" className="py-4 m-0">
          <Accordion 
            ref={accordionRef}
            type="single" 
            collapsible 
            value={openAccordion} 
            onValueChange={handleAccordionChange}
            className="space-y-2"
          >
            {/* Privacy & Access Section */}
            {!isCollaborator && (
              <AccordionItem value="privacy" className="border rounded-lg px-4">
                <AccordionTrigger 
                  className="hover:no-underline py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                  aria-label="Privacy and Access settings"
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Privacy & Access</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-normal pl-6">
                      Control visibility and RSVP requirements.
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className={`pb-4 space-y-4 ${accordionMotionClass}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="privacy-toggle" className="text-sm font-medium">
                        Public Event
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Public events can be found by anyone with the link
                      </p>
                    </div>
                    <Switch
                      id="privacy-toggle"
                      checked={privacySetting}
                      onCheckedChange={setPrivacySetting}
                      aria-label="Toggle public event"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="guest-list-toggle" className="text-sm font-medium">
                        Show Guest List
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Display RSVP list publicly on event page
                      </p>
                    </div>
                    <Switch
                      id="guest-list-toggle"
                      checked={showGuestList}
                      onCheckedChange={setShowGuestList}
                      aria-label="Toggle guest list visibility"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="require-email-rsvp-toggle" className="text-sm font-medium">
                        Require Email for RSVP
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Make email address mandatory when guests RSVP
                      </p>
                    </div>
                    <Switch
                      id="require-email-rsvp-toggle"
                      checked={requireEmailForRsvp}
                      onCheckedChange={setRequireEmailForRsvp}
                      aria-label="Toggle require email for RSVP"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Guest Rules Section */}
            <AccordionItem value="guests" className="border rounded-lg px-4">
              <AccordionTrigger 
                className="hover:no-underline py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                aria-label="Guest Rules settings"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Guest Rules</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-normal pl-6">
                    Manage plus-ones, item claiming, and suggestions.
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className={`pb-4 space-y-4 ${accordionMotionClass}`}>
                {/* Merged Allow Plus-Ones */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="plus-ones-toggle" className="text-sm font-medium">
                        Allow Plus-Ones
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Let guests bring additional guests when they RSVP
                      </p>
                    </div>
                    <Switch
                      id="plus-ones-toggle"
                      checked={allowPlusOnes}
                      onCheckedChange={setAllowPlusOnes}
                      aria-label="Toggle allow plus-ones"
                    />
                  </div>
                  
                  {allowPlusOnes && (
                    <div className="ml-0 pl-4 border-l-2 border-muted">
                      <Label htmlFor="max-plus-ones" className="text-sm">
                        Guests may bring up to:
                      </Label>
                      <Select
                        value={maxPlusOnes?.toString() || ""}
                        onValueChange={(v) => setMaxPlusOnes(v ? parseInt(v) : null)}
                      >
                        <SelectTrigger 
                          className={`w-[140px] mt-1 h-10 ${plusOneError ? 'border-destructive' : ''}`}
                          aria-label="Select maximum plus-ones"
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 guest</SelectItem>
                          <SelectItem value="2">2 guests</SelectItem>
                          <SelectItem value="3">3 guests</SelectItem>
                        </SelectContent>
                      </Select>
                      {plusOneError && (
                        <p className="text-xs text-destructive mt-1">{plusOneError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Who Can Claim Items */}
                <div className="space-y-2">
                  <Label htmlFor="claim-eligibility" className="text-sm font-medium">
                    Who Can Claim Items
                  </Label>
                  <Select
                    value={itemClaimEligibility}
                    onValueChange={setItemClaimEligibility}
                  >
                    <SelectTrigger id="claim-eligibility" className="w-full h-10" aria-label="Select who can claim items">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attending_only">Attending Only</SelectItem>
                      <SelectItem value="attending_and_maybe">Attending & Maybe</SelectItem>
                      <SelectItem value="all_invitees">All Invitees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Who Can Suggest Items */}
                <div className="space-y-2">
                  <Label htmlFor="suggest-eligibility" className="text-sm font-medium">
                    Who Can Suggest Items
                  </Label>
                  <Select
                    value={itemSuggestEligibility}
                    onValueChange={setItemSuggestEligibility}
                  >
                    <SelectTrigger id="suggest-eligibility" className="w-full h-10" aria-label="Select who can suggest items">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attending_only">Attending Only</SelectItem>
                      <SelectItem value="attending_and_maybe">Attending & Maybe</SelectItem>
                      <SelectItem value="all_invitees">All Invitees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Advanced Options - Collapsible */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger 
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                    aria-label="Toggle advanced options"
                  >
                    <Settings2 className="h-4 w-4" />
                    <span>Advanced Options</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="max-guest-claims" className="text-sm font-medium">
                        Max Claims Per Guest
                      </Label>
                      <Input
                        id="max-guest-claims"
                        type="number"
                        min="1"
                        max="100"
                        placeholder="No limit"
                        value={maxGuestClaimsPerItem || ''}
                        onChange={(e) => setMaxGuestClaimsPerItem(e.target.value ? parseInt(e.target.value) : null)}
                        className="max-w-[120px] h-10"
                        aria-label="Maximum claims per guest"
                      />
                      <p className="text-xs text-muted-foreground">
                        Limit how many items each guest can claim
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="skip-interstitial-toggle" className="text-sm font-medium">
                          Skip External Link Warning
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Disable confirmation when guests click item links
                        </p>
                      </div>
                      <Switch
                        id="skip-interstitial-toggle"
                        checked={skipExternalLinkInterstitial}
                        onCheckedChange={setSkipExternalLinkInterstitial}
                        aria-label="Toggle skip external link warning"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </AccordionContent>
            </AccordionItem>

            {/* Payments Summary (only show if not collaborator) */}
            {!isCollaborator && (
              <AccordionItem value="payments" className="border rounded-lg px-4">
                <AccordionTrigger 
                  className="hover:no-underline py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                  aria-label="Payments summary"
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Contributions (Summary)</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-normal pl-6">
                      Configure contributions and payment preferences.
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className={`pb-4 ${accordionMotionClass}`}>
                  <p className="text-sm text-muted-foreground mb-3">
                    Full contribution settings are in the Payments tab.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contributions:</span>
                      <span className="font-medium">
                        {currentSettings.contributionsEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {currentSettings.contributionsEnabled && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium capitalize">
                            {currentSettings.contributionType || 'Freeform'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Automations Section */}
            <AccordionItem value="automations" className="border rounded-lg px-4">
              <AccordionTrigger 
                className="hover:no-underline py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                aria-label="Automations settings"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Automations</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-normal pl-6">
                    Set up reminders and automatic archival.
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className={`pb-4 space-y-4 ${accordionMotionClass}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="reminders-toggle" className="text-sm font-medium">
                      Enable Reminders
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Send automated reminders to guests
                    </p>
                  </div>
                  <Switch
                    id="reminders-toggle"
                    checked={remindersEnabled}
                    onCheckedChange={setRemindersEnabled}
                    aria-label="Toggle enable reminders"
                  />
                </div>

                {remindersEnabled ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="rsvp-reminder" className="text-xs">
                        RSVP Reminder (days)
                      </Label>
                      <Input
                        id="rsvp-reminder"
                        type="number"
                        min="1"
                        max="30"
                        value={rsvpReminderDays}
                        onChange={(e) => setRsvpReminderDays(parseInt(e.target.value) || 3)}
                        className="h-10"
                        aria-label="RSVP reminder days"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="item-reminder" className="text-xs">
                        Item Reminder (days)
                      </Label>
                      <Input
                        id="item-reminder"
                        type="number"
                        min="1"
                        max="30"
                        value={itemReminderDays}
                        onChange={(e) => setItemReminderDays(parseInt(e.target.value) || 2)}
                        className="h-10"
                        aria-label="Item reminder days"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contribution-reminder" className="text-xs">
                        Contribution Reminder (days)
                      </Label>
                      <Input
                        id="contribution-reminder"
                        type="number"
                        min="1"
                        max="30"
                        value={contributionReminderDays}
                        onChange={(e) => setContributionReminderDays(parseInt(e.target.value) || 1)}
                        className="h-10"
                        aria-label="Contribution reminder days"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="thank-you-delay" className="text-xs">
                        Thank You Delay (days)
                      </Label>
                      <Input
                        id="thank-you-delay"
                        type="number"
                        min="0"
                        max="14"
                        value={thankYouDelayDays}
                        onChange={(e) => setThankYouDelayDays(parseInt(e.target.value) || 1)}
                        className="h-10"
                        aria-label="Thank you delay days"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No reminders configured yet.
                  </p>
                )}

                {!isCollaborator && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="archive-delay" className="text-sm font-medium">
                      Auto-Archive Delay (days after event)
                    </Label>
                    <Input
                      id="archive-delay"
                      type="number"
                      min="0"
                      max="365"
                      value={archiveDelay}
                      onChange={(e) => setArchiveDelay(parseInt(e.target.value) || 0)}
                      className="max-w-[120px] h-10"
                      aria-label="Auto-archive delay days"
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Save Button */}
          <div className="flex gap-3 pt-4 mt-4 border-t sticky bottom-0 bg-background pb-safe">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>
        
        {!isCollaborator && (
          <TabsContent value="contributions" className="py-4 m-0">
            <ContributionSettings 
              eventId={eventId}
              currentSettings={{
                contributionsEnabled: currentSettings.contributionsEnabled || false,
                contributionType: currentSettings.contributionType || 'freeform',
                contributionPerGuest: currentSettings.contributionPerGuest || null,
                contributionSuggestedAmount: currentSettings.contributionSuggestedAmount || null,
                contributionMinimumAmount: currentSettings.contributionMinimumAmount || null,
                contributionGoal: currentSettings.contributionGoal || null,
                contributionMessage: currentSettings.contributionMessage || null,
                creditCardPaymentsEnabled: currentSettings.creditCardPaymentsEnabled || false,
                contributionMethods: [],
              }}
              onUpdate={onUpdate}
            />
          </TabsContent>
        )}
        
        {!isCollaborator && (
          <TabsContent value="collaborators" className="py-4 m-0">
            <CollaboratorsSection 
              eventId={eventId}
              eventName={eventName}
              isOwner={true}
              userId={user?.id || ''}
              userEmail={user?.email || ''}
            />
            {/* Empty state handled in CollaboratorsSection */}
          </TabsContent>
        )}
        
        <TabsContent value="kpi" className="py-4 m-0">
          <EventKPISettings 
            eventId={eventId} 
            contributionsEnabled={currentSettings.contributionsEnabled || false}
          />
        </TabsContent>
      </div>
    </Tabs>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="h-[95vh] flex flex-col">
            <DrawerHeader className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-base truncate">{eventName}</DrawerTitle>
                <p className="text-xs text-muted-foreground">Event Settings</p>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Close settings">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden px-4 pt-4 pb-safe">
              <SettingsContent />
            </div>
          </DrawerContent>
        </Drawer>
        <UnsavedChangesDialog
          open={showUnsavedDialog}
          onDiscard={handleDiscardChanges}
          onSave={handleSaveAndClose}
          onCancel={handleCancelClose}
          isSaving={saving}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Event Settings</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Manage preferences for "{eventName}"
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <SettingsContent />
          </div>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onDiscard={handleDiscardChanges}
        onSave={handleSaveAndClose}
        onCancel={handleCancelClose}
        isSaving={saving}
      />
    </>
  );
}
