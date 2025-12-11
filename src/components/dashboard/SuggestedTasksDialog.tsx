import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { CheckSquare, Square, Sparkles, Plus, X } from "lucide-react";

interface SuggestedTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventType: string;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  timeline_group: string;
  category: string | null;
  priority: string;
}

export function SuggestedTasksDialog({
  open,
  onOpenChange,
  eventId,
  eventType
}: SuggestedTasksDialogProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && eventType) {
      loadTemplates();
    }
  }, [open, eventType]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("task_templates")
      .select("*")
      .eq("event_type", eventType.toLowerCase())
      .order("sort_order", { ascending: true });

    if (data) {
      setTemplates(data);
      // Select all by default
      setSelectedTasks(new Set(data.map(t => t.id)));
    }
  };

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const selectAll = () => {
    setSelectedTasks(new Set(templates.map(t => t.id)));
  };

  const clearAll = () => {
    setSelectedTasks(new Set());
  };

  const addSelectedTasks = async () => {
    if (selectedTasks.size === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to add",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const tasksToAdd = templates
      .filter(t => selectedTasks.has(t.id))
      .map(t => ({
        event_id: eventId,
        title: t.title,
        description: t.description,
        priority: t.priority as "low" | "medium" | "high",
        status: "todo" as "todo"
      }));

    const { error } = await supabase
      .from("tasks")
      .insert(tasksToAdd);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add tasks",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Tasks added",
        description: `${selectedTasks.size} tasks added to your checklist`
      });
      onOpenChange(false);
    }

    setLoading(false);
  };

  const groupedTasks = {
    before: templates.filter(t => t.timeline_group === "before"),
    day_of: templates.filter(t => t.timeline_group === "day_of"),
    after: templates.filter(t => t.timeline_group === "after")
  };

  const getTimelineLabel = (group: string) => {
    const labels: Record<string, string> = {
      before: "Before Event",
      day_of: "Day Of",
      after: "After Event"
    };
    return labels[group] || group;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended Checklist for Your {eventType}
          </DialogTitle>
          <DialogDescription>
            We've curated a checklist to help you get started. Select the tasks you want to add to your to-do list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {selectedTasks.size} of {templates.length} tasks selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Square className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>

          <Accordion type="multiple" defaultValue={["before", "day_of", "after"]} className="w-full">
            {Object.entries(groupedTasks).map(([group, tasks]) => (
              tasks.length > 0 && (
                <AccordionItem key={group} value={group}>
                  <AccordionTrigger className="text-lg font-semibold">
                    {getTimelineLabel(group)} ({tasks.length} tasks)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <Card 
                          key={task.id}
                          className={`cursor-pointer transition-colors ${
                            selectedTasks.has(task.id) ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => toggleTask(task.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedTasks.has(task.id)}
                                onCheckedChange={() => toggleTask(task.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium mb-1">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground">{task.description}</p>
                                )}
                                {task.category && (
                                  <Badge variant="secondary" className="mt-2 text-xs">
                                    {task.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            ))}
          </Accordion>

          {templates.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No suggested tasks available for this event type.</p>
                <p className="text-sm mt-2">You can still create custom tasks!</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for Now
          </Button>
          <Button onClick={addSelectedTasks} disabled={loading || selectedTasks.size === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Add {selectedTasks.size} Task{selectedTasks.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
