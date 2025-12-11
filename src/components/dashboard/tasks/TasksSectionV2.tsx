import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskSummaryBlock } from "./TaskSummaryBlock";
import { TaskInsightsBar } from "./TaskInsightsBar";
import { TaskCategoryPanel, TaskCategory, TASK_CATEGORIES, categorizeTask } from "./TaskCategoryPanel";
import { TaskQuickActionsBar } from "./TaskQuickActionsBar";
import { TaskSuggestionCarousel } from "./TaskSuggestionCarousel";
import { CompletedTasksSection } from "./CompletedTasksSection";
import { TasksEmptyState } from "./TasksEmptyState";
import { AddTaskDialog } from "./AddTaskDialog";
import { Task } from "./TaskCard";
import PlanWithClickDialog from "@/components/plan-with-click/PlanWithClickDialog";

interface TasksSectionV2Props {
  eventId: string;
  eventDate: string | null;
  eventName?: string;
  eventType?: string;
}

interface TaskWithCategory extends Task {
  category: TaskCategory;
}

export function TasksSectionV2({ 
  eventId, 
  eventDate, 
  eventName = "Event",
  eventType 
}: TasksSectionV2Props) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<TaskCategory>("planning");
  const [expandedCategories, setExpandedCategories] = useState<Set<TaskCategory>>(new Set(["planning"]));
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [pwacDialogOpen, setPwacDialogOpen] = useState(false);

  useEffect(() => {
    loadTasks();
    
    const channel = supabase
      .channel(`tasks-v2-${eventId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks', 
        filter: `event_id=eq.${eventId}` 
      }, loadTasks)
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
      .order("sort_order", { ascending: true });

    if (!error && data) {
      // Add category to each task based on title or stored category
      const tasksWithCategories: TaskWithCategory[] = data.map(task => ({
        ...task,
        category: (task as any).category_name as TaskCategory || categorizeTask(task.title)
      }));
      
      // Sort by priority within each category
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      tasksWithCategories.sort((a, b) => 
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
      );
      
      setTasks(tasksWithCategories);
    }
    setLoading(false);
  };

  // Derived data
  const completedTasks = useMemo(() => tasks.filter(t => t.status === "done"), [tasks]);
  const incompleteTasks = useMemo(() => tasks.filter(t => t.status !== "done"), [tasks]);
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  const tasksByCategory = useMemo(() => {
    const grouped: Record<TaskCategory, TaskWithCategory[]> = {
      planning: [],
      logistics: [],
      communication: [],
      day_of: [],
      wrap_up: []
    };
    
    tasks.forEach(task => {
      if (grouped[task.category]) {
        grouped[task.category].push(task);
      } else {
        grouped.planning.push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  // Actions
  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    priority: string;
    category: TaskCategory;
    due_date: string;
  }) => {
    const { error } = await supabase
      .from("tasks")
      .insert([{
        event_id: eventId,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority as "low" | "medium" | "high",
        due_date: taskData.due_date || null,
        status: "todo",
        include_in_export: false
      }]);

    if (error) {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    } else {
      toast({ title: "Task added" });
    }
  };

  const handleUpdateTask = async (taskData: {
    title: string;
    description: string;
    priority: string;
    category: TaskCategory;
    due_date: string;
  }) => {
    if (!editTask) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority as "low" | "medium" | "high",
        due_date: taskData.due_date || null
      })
      .eq("id", editTask.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    } else {
      toast({ title: "Task updated" });
      setEditTask(null);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await supabase.from("tasks").update({ 
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null
    }).eq("id", task.id);
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    toast({ title: "Task deleted" });
  };

  const handleDuplicateTask = async (task: Task) => {
    const { error } = await supabase
      .from("tasks")
      .insert([{
        event_id: eventId,
        title: `${task.title} (copy)`,
        description: task.description,
        priority: task.priority as "low" | "medium" | "high",
        due_date: task.due_date,
        status: "todo"
      }]);

    if (!error) {
      toast({ title: "Task duplicated" });
    }
  };

  const handleMoveTask = async (task: Task, newCategory: TaskCategory) => {
    // Store category in a metadata field or handle via categorization
    toast({ title: `Moved to ${TASK_CATEGORIES.find(c => c.id === newCategory)?.label}` });
  };

  const handleQuickAdd = async (title: string, category: TaskCategory) => {
    const { error } = await supabase
      .from("tasks")
      .insert([{
        event_id: eventId,
        title,
        priority: "medium",
        status: "todo"
      }]);

    if (!error) {
      toast({ title: "Task added" });
    }
  };

  const handleAddSuggestedTask = async (task: { title: string; priority: string; category: string }) => {
    const { error } = await supabase
      .from("tasks")
      .insert([{
        event_id: eventId,
        title: task.title,
        priority: task.priority as "low" | "medium" | "high",
        status: "todo"
      }]);

    if (!error) {
      toast({ title: "Task added from suggestions" });
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.size === 0) return;
    
    const { error } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .in("id", Array.from(selectedTasks));

    if (!error) {
      toast({ title: `${selectedTasks.size} tasks completed` });
      setSelectedTasks(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    
    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", Array.from(selectedTasks));

    if (!error) {
      toast({ title: `${selectedTasks.size} tasks deleted` });
      setSelectedTasks(new Set());
    }
  };

  const toggleCategory = (category: TaskCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const openAddDialog = (category?: TaskCategory) => {
    setDefaultCategory(category || "planning");
    setEditTask(null);
    setAddDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditTask(task);
    setAddDialogOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <TaskSummaryBlock completedCount={0} totalCount={0} />
        <Separator />
        <TaskSuggestionCarousel
          eventType={eventType}
          eventDate={eventDate}
          taskCount={0}
          completionRate={0}
          onAddTask={handleAddSuggestedTask}
          onDismiss={() => {}}
        />
        <TasksEmptyState onAddTask={() => openAddDialog()} />
        <AddTaskDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSave={handleCreateTask}
          defaultCategory={defaultCategory}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      {/* Summary Block */}
      <TaskSummaryBlock 
        completedCount={completedTasks.length} 
        totalCount={tasks.length} 
      />

      {/* Insights Bar */}
      <TaskInsightsBar tasks={tasks} eventDate={eventDate} />

      <Separator />

      {/* Suggestion Carousel */}
      <TaskSuggestionCarousel
        eventType={eventType}
        eventDate={eventDate}
        taskCount={tasks.length}
        completionRate={completionRate}
        onAddTask={handleAddSuggestedTask}
        onDismiss={() => {}}
      />

      {/* Quick Actions Bar */}
      <TaskQuickActionsBar
        hasTasks={tasks.length > 0}
        selectedCount={selectedTasks.size}
        isReorderMode={isReorderMode}
        onAddTask={() => openAddDialog()}
        onBulkComplete={handleBulkComplete}
        onBulkDelete={handleBulkDelete}
        onToggleReorder={() => setIsReorderMode(!isReorderMode)}
      />

      {/* Category Panels */}
      <div className="space-y-2">
        {TASK_CATEGORIES.map(cat => {
          const categoryTasks = tasksByCategory[cat.id];
          if (categoryTasks.length === 0 && !expandedCategories.has(cat.id)) {
            return null; // Hide empty collapsed categories
          }
          
          return (
            <TaskCategoryPanel
              key={cat.id}
              category={cat.id}
              tasks={categoryTasks}
              isExpanded={expandedCategories.has(cat.id)}
              onToggle={() => toggleCategory(cat.id)}
              onQuickAdd={(title) => handleQuickAdd(title, cat.id)}
              onToggleComplete={handleToggleComplete}
              onEdit={openEditDialog}
              onDelete={handleDeleteTask}
              onDuplicate={handleDuplicateTask}
              onMove={handleMoveTask}
            />
          );
        })}
      </div>

      {/* Completed Tasks Section */}
      <CompletedTasksSection
        tasks={completedTasks}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDeleteTask}
      />

      {/* Add/Edit Task Dialog */}
      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditTask(null);
        }}
        onSave={editTask ? handleUpdateTask : handleCreateTask}
        editTask={editTask}
        defaultCategory={defaultCategory}
      />

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
}
