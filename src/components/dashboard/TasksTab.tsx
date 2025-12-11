import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Plus, Calendar, User, AlertCircle, Filter, Trash2, Edit, Sparkles } from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { SuggestedTasksDialog } from "./SuggestedTasksDialog";
import { MyTemplates } from "./MyTemplates";

interface TasksTabProps {
  eventId: string;
  eventDate: string | null;
  openAddTaskDialog?: boolean;
  onAddTaskDialogClose?: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  category_id: string | null;
  parent_task_id: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export function TasksTab({ eventId, eventDate, openAddTaskDialog, onAddTaskDialogClose }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [suggestedTasksOpen, setSuggestedTasksOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    category_id: "",
    due_date: ""
  });

  useEffect(() => {
    loadTasks();
    loadCategories();
    subscribeToTasks();
  }, [eventId]);

  // Handle external trigger to open add task dialog
  useEffect(() => {
    if (openAddTaskDialog) {
      setNewTaskOpen(true);
      onAddTaskDialogClose?.();
    }
  }, [openAddTaskDialog, onAddTaskDialogClose]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("event_id", eventId)
        .is("parent_task_id", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      if (data) {
        // Sort by priority: high > medium > low
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const sortedData = [...data].sort((a, b) => {
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
        });
        setTasks(sortedData);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("task_categories")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true });

    if (data) {
      setCategories(data);
    }
  };

  const subscribeToTasks = () => {
    const channel = supabase
      .channel(`tasks-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `event_id=eq.${eventId}`
        },
        () => loadTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .insert([{
        event_id: eventId,
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        priority: newTask.priority as "low" | "medium" | "high",
        category_id: newTask.category_id || null,
        due_date: newTask.due_date || null,
        status: "todo" as "todo"
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Task created",
        description: "New task added to your list"
      });
      setNewTask({ title: "", description: "", priority: "medium", category_id: "", due_date: "" });
      setNewTaskOpen(false);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const deleteTask = async () => {
    if (!taskToDelete) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskToDelete);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Task deleted",
        description: "Task has been removed"
      });
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      high: "destructive",
      medium: "default",
      low: "secondary"
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  const isTaskOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && new Date(dueDate).getTime() < Date.now();
  };

  const isTaskDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const taskDate = new Date(dueDate);
    return isWithinInterval(taskDate, {
      start: new Date(),
      end: addDays(new Date(), 2)
    });
  };

  const filteredTasks = tasks
    .filter(task => {
      if (filterStatus !== "all" && task.status !== filterStatus) return false;
      if (filterPriority !== "all" && task.priority !== filterPriority) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  const todoTasks = filteredTasks.filter(t => t.status === "todo" || t.status === "in_progress");
  const doneTasks = filteredTasks.filter(t => t.status === "done");
  const completionRate = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  const applyTemplate = async (templateTasks: any[]) => {
    const tasksToAdd = templateTasks.map(t => ({
      event_id: eventId,
      title: t.title,
      description: t.description || null,
      priority: t.priority || "medium",
      status: "todo" as "todo",
      category_id: t.category_id || null
    }));

    const { error } = await supabase
      .from("tasks")
      .insert(tasksToAdd);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Template applied",
        description: `${tasksToAdd.length} tasks added from template`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Task Progress</CardTitle>
          <CardDescription>
            {loading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `${doneTasks.length} of ${tasks.length} tasks complete`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <>
              <Skeleton className="h-2 w-full mb-2" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <Progress value={completionRate} className="mb-2" />
              <p className="text-sm text-muted-foreground">{Math.round(completionRate)}% complete</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => setSuggestedTasksOpen(true)}
              className="w-full md:w-auto"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Suggested Tasks
            </Button>
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a task to your event planning checklist
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Task title..."
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Optional details..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                        <SelectTrigger>
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
                      <Label>Category</Label>
                      <Select value={newTask.category_id} onValueChange={(value) => setNewTask({ ...newTask, category_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewTaskOpen(false)}>Cancel</Button>
                  <Button onClick={createTask}>Create Task</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* To Do Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>To Do ({todoTasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : todoTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending tasks - you're all set!
            </p>
          ) : (
            todoTasks.map((task) => (
              <Card key={task.id} className={isTaskOverdue(task.due_date) ? "border-destructive" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.status === "done"}
                      onCheckedChange={() => toggleTaskComplete(task)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium">{task.title}</h4>
                        {getPriorityBadge(task.priority)}
                        {isTaskOverdue(task.due_date) && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        )}
                        {isTaskDueSoon(task.due_date) && !isTaskOverdue(task.due_date) && (
                          <Badge variant="secondary">Due Soon</Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setTaskToDelete(task.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      {doneTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Completed ({doneTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {doneTasks.map((task) => (
              <Card key={task.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => toggleTaskComplete(task)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium line-through">{task.title}</h4>
                      {task.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {format(new Date(task.completed_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setTaskToDelete(task.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
