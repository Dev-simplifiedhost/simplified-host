import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Lock, 
  CheckSquare, 
  ChevronDown, 
  Calendar,
  Trash2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import PlanWithClickDialog from "@/components/plan-with-click/PlanWithClickDialog";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  is_pwac_origin?: boolean;
}

interface TasksSectionProps {
  eventId: string;
  eventDate: string | null;
  eventName?: string;
}

export const TasksSection = ({ eventId, eventDate, eventName = "Event" }: TasksSectionProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [pwacDialogOpen, setPwacDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: ""
  });

  useEffect(() => {
    loadTasks();
    
    const channel = supabase
      .channel(`tasks-section-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `event_id=eq.${eventId}` }, loadTasks)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const loadTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("event_id", eventId)
      .is("parent_task_id", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Sort by priority
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      const sorted = [...data].sort((a, b) => 
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
      );
      setTasks(sorted);
    }
    setLoading(false);
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .insert([{
        event_id: eventId,
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        priority: newTask.priority as "low" | "medium" | "high",
        due_date: newTask.due_date || null,
        status: "todo",
        include_in_export: false // Manual tasks default to export OFF
      }]);

    if (error) {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    } else {
      toast({ title: "Task created" });
      setNewTask({ title: "", description: "", priority: "medium", due_date: "" });
      setNewTaskOpen(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
  };

  const isOverdue = (date: string | null) => date && isPast(new Date(date));
  const isDueSoon = (date: string | null) => {
    if (!date) return false;
    return isWithinInterval(new Date(date), { start: new Date(), end: addDays(new Date(), 2) });
  };

  const todoTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");
  const completionRate = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <CheckSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Tasks</h3>
          <Badge variant="secondary" className="text-xs">Not Visible to Guests</Badge>
        </div>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPwacDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-1 text-primary" />
              <span className="hidden sm:inline">Refine with AI</span>
            </Button>
          )}
          <Button size="sm" onClick={() => setNewTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {doneTasks.length} of {tasks.length} complete
            </span>
            <span className="text-sm font-medium">{Math.round(completionRate)}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      {/* To Do Tasks */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading tasks...
          </CardContent>
        </Card>
      ) : todoTasks.length === 0 && doneTasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <CheckSquare className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">No tasks yet</p>
            <Button size="sm" onClick={() => setNewTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {todoTasks.map(task => (
            <Card 
              key={task.id} 
              className={cn(
                "transition-colors",
                isOverdue(task.due_date) && "border-destructive/50 bg-destructive/5"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.status === "done"}
                    onCheckedChange={() => toggleTask(task)}
                    className="mt-1 h-5 w-5"
                    aria-label={`Mark "${task.title}" as complete`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{task.title}</span>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs h-5">
                        {task.priority}
                      </Badge>
                      {task.is_pwac_origin && (
                        <Badge variant="outline" className="text-xs h-5 bg-primary/5 border-primary/30 text-primary">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      )}
                      {isOverdue(task.due_date) && (
                        <Badge variant="destructive" className="text-xs h-5">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                      {isDueSoon(task.due_date) && !isOverdue(task.due_date) && (
                        <Badge variant="secondary" className="text-xs h-5">Due Soon</Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Tasks Accordion */}
      {doneTasks.length > 0 && (
        <Collapsible open={completedExpanded} onOpenChange={setCompletedExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-10 px-3 text-muted-foreground">
              <span className="text-sm">Completed ({doneTasks.length})</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-150",
                completedExpanded && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-accordion-down">
            <div className="space-y-2 pt-2">
              {doneTasks.map(task => (
                <Card key={task.id} className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleTask(task)}
                        className="mt-1 h-5 w-5"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Add Task Dialog */}
      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Task title..."
                value={newTask.title}
                onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={newTask.description}
                onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(v) => setNewTask(p => ({ ...p, priority: v }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(p => ({ ...p, due_date: e.target.value }))}
                  className="h-12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskOpen(false)}>Cancel</Button>
            <Button onClick={createTask} disabled={!newTask.title.trim()}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PWAC Dialog */}
      <PlanWithClickDialog 
        open={pwacDialogOpen} 
        onOpenChange={setPwacDialogOpen}
        existingEvent={{
          id: eventId,
          name: eventName,
          date: eventDate,
          guestCount: null,
          items: [],
          tasks: tasks.map(t => ({ title: t.title }))
        }}
        onEventUpdated={loadTasks}
      />
    </div>
  );
};
