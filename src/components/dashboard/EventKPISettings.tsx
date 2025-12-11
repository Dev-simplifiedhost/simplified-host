import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, RotateCcw, Eye, EyeOff, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KPISetting {
  id: string;
  kpi_type: string;
  is_visible: boolean;
  display_order: number;
  custom_title: string | null;
}

interface EventKPISettingsProps {
  eventId: string;
  contributionsEnabled?: boolean;
}

const DEFAULT_TITLES: Record<string, string> = {
  event_details: "Event Details",
  items_available: "Items Available",
  contribute: "Contribute",
  rsvp: "RSVP Status"
};

export const EventKPISettings = ({ eventId, contributionsEnabled = true }: EventKPISettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<KPISetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [eventId]);

  // Auto-disable Contribute KPI when contributions are off
  useEffect(() => {
    if (!contributionsEnabled && settings.length > 0) {
      const contributeIndex = settings.findIndex(s => s.kpi_type === 'contribute');
      if (contributeIndex >= 0 && settings[contributeIndex].is_visible) {
        const newSettings = [...settings];
        newSettings[contributeIndex].is_visible = false;
        setSettings(newSettings);
      }
    }
  }, [contributionsEnabled, settings.length]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("event_kpi_settings")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error loading KPI settings:", error);
      toast({
        title: "Error",
        description: "Failed to load KPI settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = settings.map((setting, index) => ({
        id: setting.id,
        is_visible: setting.is_visible,
        display_order: index + 1,
        custom_title: setting.custom_title || null
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("event_kpi_settings")
          .update({
            is_visible: update.is_visible,
            display_order: update.display_order,
            custom_title: update.custom_title
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "KPI tile settings saved successfully"
      });
    } catch (error) {
      console.error("Error saving KPI settings:", error);
      toast({
        title: "Error",
        description: "Failed to save KPI settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultSettings = settings.map((setting, index) => ({
      ...setting,
      is_visible: setting.kpi_type === 'contribute' ? contributionsEnabled : true,
      display_order: index + 1,
      custom_title: null
    }));
    setSettings(defaultSettings);
  };

  const toggleVisibility = (index: number) => {
    const setting = settings[index];
    // Don't allow enabling Contribute KPI if contributions are disabled
    if (setting.kpi_type === 'contribute' && !contributionsEnabled && !setting.is_visible) {
      toast({
        title: "Cannot enable",
        description: "Enable contributions in the Payments tab first",
        variant: "destructive"
      });
      return;
    }
    
    const newSettings = [...settings];
    newSettings[index].is_visible = !newSettings[index].is_visible;
    setSettings(newSettings);
  };

  const updateTitle = (index: number, title: string) => {
    const newSettings = [...settings];
    newSettings[index].custom_title = title || null;
    setSettings(newSettings);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSettings = [...settings];
    const draggedItem = newSettings[draggedIndex];
    newSettings.splice(draggedIndex, 1);
    newSettings.splice(index, 0, draggedItem);
    setSettings(newSettings);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading settings...</div>;
  }

  const visibleSettings = settings.filter(s => s.is_visible);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with hint */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-base font-semibold">Event Page Layout</h3>
              <p className="text-xs text-muted-foreground">
                These tiles control what guests see on your public event page.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={previewMode ? "default" : "outline"} 
                size="sm" 
                onClick={() => setPreviewMode(!previewMode)}
                className="h-8"
                aria-label={previewMode ? "Switch to edit mode" : "Switch to preview mode"}
              >
                {previewMode ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-8" aria-label="Reset to defaults">
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {previewMode ? (
          // Preview Mode
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-3">Preview of visible tiles:</p>
            <div className="grid grid-cols-2 gap-2">
              {visibleSettings.map((setting) => (
                <div 
                  key={setting.id}
                  className="bg-background border rounded-lg p-3 text-center"
                >
                  <p className="text-sm font-medium">
                    {setting.custom_title || DEFAULT_TITLES[setting.kpi_type]}
                  </p>
                </div>
              ))}
            </div>
            {visibleSettings.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No tiles visible. Toggle some tiles on in Edit mode.
              </p>
            )}
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-2">
            {settings.map((setting, index) => {
              const isContributeDisabled = setting.kpi_type === 'contribute' && !contributionsEnabled;
              
              return (
                <Card
                  key={setting.id}
                  draggable={!isContributeDisabled}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    transition-opacity duration-150 ease-out
                    ${draggedIndex === index ? "opacity-50" : ""}
                    ${isContributeDisabled ? "opacity-60 bg-muted/50" : "cursor-move"}
                  `}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <GripVertical 
                        className={`w-4 h-4 text-muted-foreground shrink-0 ${isContributeDisabled ? 'invisible' : ''}`} 
                        aria-hidden="true"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Label className={`text-sm font-medium truncate ${isContributeDisabled ? 'text-muted-foreground' : ''}`}>
                              {DEFAULT_TITLES[setting.kpi_type]}
                            </Label>
                            {isContributeDisabled && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 cursor-help">
                                    <AlertCircle className="h-3 w-3" />
                                    <span className="hidden sm:inline">Disabled</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>This tile is disabled because contributions are off.</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Switch
                                  checked={setting.is_visible}
                                  onCheckedChange={() => toggleVisibility(index)}
                                  disabled={isContributeDisabled}
                                  className="shrink-0"
                                  aria-label={`Toggle ${DEFAULT_TITLES[setting.kpi_type]} visibility`}
                                />
                              </div>
                            </TooltipTrigger>
                            {isContributeDisabled && (
                              <TooltipContent side="left">
                                <p>Contributions are turned off for this event.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>

                        {setting.is_visible && !isContributeDisabled && (
                          <Input
                            placeholder={DEFAULT_TITLES[setting.kpi_type]}
                            value={setting.custom_title || ""}
                            onChange={(e) => updateTitle(index, e.target.value)}
                            className="mt-2 h-9 text-sm"
                            aria-label={`Custom title for ${DEFAULT_TITLES[setting.kpi_type]}`}
                          />
                        )}
                        
                        {isContributeDisabled && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Contributions are turned off for this event.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 border-t sticky bottom-0 bg-background pb-safe">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12"
          >
            {saving ? "Saving..." : "Save Layout"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};
