import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, Clock, Utensils, ListTodo, Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { EventPlanData } from "./PlanWithClickDialog";
import PWACItemCard from "./PWACItemCard";
import PWACItemEditSheet from "./PWACItemEditSheet";
import PWACTaskCard from "./PWACTaskCard";
import PWACTaskEditSheet from "./PWACTaskEditSheet";
import AIRefineInput from "./AIRefineInput";
import PWACShareActionBar from "./PWACShareActionBar";

interface PlanOutputScreenProps {
  plan: EventPlanData;
  eventDate?: Date;
  onBack: () => void;
  onEventCreated: (eventId: string) => void;
  onAuthRequired?: () => void;
  embedded?: boolean;
  onPlanUpdate?: (updatedPlan: EventPlanData) => void;
  mode?: "create" | "enhance";
  existingEventId?: string;
  onEventUpdated?: () => void;
}

// Map menu category names to database category values
const mapCategory = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'Starters': 'appetizers',
    'Starters / Snacks': 'appetizers',
    'Snacks': 'appetizers',
    'Appetizers': 'appetizers',
    'Main Dishes': 'mains',
    'Mains': 'mains',
    'Entrees': 'mains',
    'Sides': 'sides',
    'Side Dishes': 'sides',
    'Desserts': 'desserts',
    'Sweets': 'desserts',
    'Drinks': 'drinks',
    'Beverages': 'drinks',
    'Décor & Essentials': 'decorations',
    'Decor': 'decorations',
    'Decorations': 'decorations',
    'Supplies': 'supplies',
    'Essentials': 'supplies',
  };
  return categoryMap[category] || 'other';
};

const PlanOutputScreen = ({ 
  plan, 
  eventDate, 
  onBack, 
  onEventCreated,
  onPlanUpdate,
  mode = "create",
  existingEventId,
  onEventUpdated
}: PlanOutputScreenProps) => {
  const isEnhanceMode = mode === "enhance" && !!existingEventId;
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Draft event state
  const [draftEventId, setDraftEventId] = useState<string | null>(null);
  
  // Track added items and tasks: key -> database ID
  const [addedItems, setAddedItems] = useState<Map<string, string>>(new Map());
  const [addedTasks, setAddedTasks] = useState<Map<string, string>>(new Map());
  
  // Edit sheet states
  const [editingItem, setEditingItem] = useState<{
    key: string;
    id: string;
    name: string;
    quantity: number;
    category: string;
    notes?: string;
  } | null>(null);
  const [editingTask, setEditingTask] = useState<{
    key: string;
    id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'done';
  } | null>(null);

  // AI refinement
  const [refinementsRemaining, setRefinementsRemaining] = useState(() => {
    const stored = localStorage.getItem('pwac_refinements_remaining');
    return stored ? parseInt(stored, 10) : 3;
  });
  const [currentPlan, setCurrentPlan] = useState(plan);

  // Create draft event if not exists
  const ensureDraftEvent = useCallback(async (): Promise<string> => {
    if (draftEventId) return draftEventId;
    
    if (!user) {
      throw new Error('Please sign in to add items');
    }

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        name: currentPlan.planName,
        description: currentPlan.planSummary,
        event_date: eventDate?.toISOString(),
        theme_color: 'default',
        is_draft: true, // Draft mode until published
        allow_guest_items: true,
      })
      .select('id')
      .single();

    if (eventError) throw eventError;
    
    setDraftEventId(eventData.id);
    return eventData.id;
  }, [draftEventId, user, currentPlan, eventDate]);

  // Generate unique key for item
  const getItemKey = (catIdx: number, itemIdx: number) => `item-${catIdx}-${itemIdx}`;
  const getTaskKey = (todoIdx: number) => `task-${todoIdx}`;

  // Add item to database
  const handleAddItem = async (catIdx: number, itemIdx: number, item: { name: string; note?: string }, category: string) => {
    try {
      const eventId = await ensureDraftEvent();
      
      const { data, error } = await supabase
        .from('event_items')
        .insert({
          event_id: eventId,
          name: item.name,
          category: mapCategory(category),
          quantity: 1,
          notes: item.note || null,
          include_in_export: true,
          is_pwac_origin: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      const key = getItemKey(catIdx, itemIdx);
      setAddedItems(prev => new Map(prev).set(key, data.id));
      
      toast({
        title: "Added to Items",
        description: `"${item.name}" has been added to your event.`,
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Failed to add item",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Add task to database
  const handleAddTask = async (todoIdx: number, task: string) => {
    try {
      const eventId = await ensureDraftEvent();
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          event_id: eventId,
          title: task,
          priority: 'medium' as const,
          status: 'todo' as const,
          sort_order: todoIdx,
          created_by: user?.id,
          include_in_export: true,
          is_pwac_origin: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      const key = getTaskKey(todoIdx);
      setAddedTasks(prev => new Map(prev).set(key, data.id));
      
      toast({
        title: "Added to Tasks",
        description: "Task has been added to your event.",
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Failed to add task",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Edit handlers
  const handleEditItem = (key: string, item: { name: string; note?: string }, category: string) => {
    const itemId = addedItems.get(key);
    if (!itemId) return;
    
    setEditingItem({
      key,
      id: itemId,
      name: item.name,
      quantity: 1,
      category: mapCategory(category),
      notes: item.note,
    });
  };

  const handleEditTask = (key: string, task: string) => {
    const taskId = addedTasks.get(key);
    if (!taskId) return;
    
    setEditingTask({
      key,
      id: taskId,
      title: task,
      status: 'todo',
    });
  };

  // Save item edits
  const handleSaveItem = async (data: { name: string; quantity: number; category: string; notes?: string }) => {
    if (!editingItem) return;
    
    const { error } = await supabase
      .from('event_items')
      .update({
        name: data.name,
        quantity: data.quantity,
        category: data.category,
        notes: data.notes || null,
      })
      .eq('id', editingItem.id);

    if (error) throw error;

    toast({
      title: "Item updated",
      description: "Your changes have been saved.",
    });
  };

  // Delete item
  const handleDeleteItem = async () => {
    if (!editingItem) return;
    
    const { error } = await supabase
      .from('event_items')
      .delete()
      .eq('id', editingItem.id);

    if (error) throw error;

    setAddedItems(prev => {
      const next = new Map(prev);
      next.delete(editingItem.key);
      return next;
    });

    toast({
      title: "Item deleted",
      description: "The item has been removed from your event.",
    });
  };

  // Save task edits
  const handleSaveTask = async (data: { title: string; description?: string; status: 'todo' | 'in_progress' | 'done' }) => {
    if (!editingTask) return;
    
    const { error } = await supabase
      .from('tasks')
      .update({
        title: data.title,
        description: data.description || null,
        status: data.status,
        completed_at: data.status === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', editingTask.id);

    if (error) throw error;

    toast({
      title: "Task updated",
      description: "Your changes have been saved.",
    });
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!editingTask) return;
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', editingTask.id);

    if (error) throw error;

    setAddedTasks(prev => {
      const next = new Map(prev);
      next.delete(editingTask.key);
      return next;
    });

    toast({
      title: "Task deleted",
      description: "The task has been removed from your event.",
    });
  };

  // AI Refinement
  const handleRefine = async (prompt: string) => {
    if (refinementsRemaining <= 0) return;

    // Determine which section to refine based on prompt keywords
    let sectionToRefine = 'menuItems';
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('task') || lowerPrompt.includes('todo') || lowerPrompt.includes('to-do')) {
      sectionToRefine = 'hostTodos';
    } else if (lowerPrompt.includes('tip') || lowerPrompt.includes('setup') || lowerPrompt.includes('experience')) {
      sectionToRefine = 'setupTips';
    } else if (lowerPrompt.includes('timeline') || lowerPrompt.includes('schedule') || lowerPrompt.includes('before')) {
      sectionToRefine = 'timeline';
    }

    try {
      const currentSection = sectionToRefine === 'menuItems' ? currentPlan.menuItems :
                            sectionToRefine === 'hostTodos' ? currentPlan.hostTodos :
                            sectionToRefine === 'setupTips' ? currentPlan.setupTips :
                            currentPlan.timeline;

      const { data, error } = await supabase.functions.invoke('refine-event-plan', {
        body: {
          sectionToRefine,
          refinementPrompt: prompt,
          currentSection,
          planContext: {
            planName: currentPlan.planName,
            planSummary: currentPlan.planSummary,
          },
        },
      });

      if (error) throw error;

      if (data.success && data.refinedSection) {
        const updatedPlan = { ...currentPlan };
        
        if (sectionToRefine === 'menuItems' && data.refinedSection.menuItems) {
          updatedPlan.menuItems = data.refinedSection.menuItems;
          // Clear added items for this section since it changed
          setAddedItems(new Map());
        } else if (sectionToRefine === 'hostTodos' && data.refinedSection.hostTodos) {
          updatedPlan.hostTodos = data.refinedSection.hostTodos;
          setAddedTasks(new Map());
        } else if (sectionToRefine === 'setupTips' && data.refinedSection.setupTips) {
          updatedPlan.setupTips = data.refinedSection.setupTips;
        } else if (sectionToRefine === 'timeline' && data.refinedSection.timeline) {
          updatedPlan.timeline = data.refinedSection.timeline;
        }

        setCurrentPlan(updatedPlan);
        onPlanUpdate?.(updatedPlan);

        const newRemaining = refinementsRemaining - 1;
        setRefinementsRemaining(newRemaining);
        localStorage.setItem('pwac_refinements_remaining', String(newRemaining));

        toast({
          title: "Plan refined!",
          description: `Updated ${sectionToRefine.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        });
      }
    } catch (error) {
      console.error('Error refining plan:', error);
      toast({
        title: "Refinement failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Apply plan - publish the draft or create new event, OR add to existing event
  const handleApply = async () => {
    if (!user) {
      localStorage.setItem('pendingEventPlan', JSON.stringify({
        generatedEvent: currentPlan,
        eventDate,
        timestamp: new Date().toISOString(),
        status: 'pending_auth'
      }));
      navigate('/auth?redirect=plan-with-click');
      return;
    }

    setLoading(true);
    try {
      // Enhance Mode: Add items/tasks to existing event
      if (isEnhanceMode) {
        // Insert all items to existing event
        const allItems = currentPlan.menuItems.flatMap((category) =>
          category.items.map((item) => ({
            event_id: existingEventId!,
            name: item.name,
            category: mapCategory(category.category),
            quantity: 1,
            notes: item.note || null,
            include_in_export: true,
            is_pwac_origin: true,
          }))
        );

        if (allItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('event_items')
            .insert(allItems);
          if (itemsError) throw itemsError;
        }

        // Insert all tasks to existing event
        if (currentPlan.hostTodos.length > 0) {
          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(
              currentPlan.hostTodos.map((todo, index) => ({
                event_id: existingEventId!,
                title: todo,
                priority: 'medium' as const,
                status: 'todo' as const,
                sort_order: index,
                created_by: user.id,
                include_in_export: true,
                is_pwac_origin: true,
              }))
            );
          if (tasksError) throw tasksError;
        }

        toast({
          title: "Items & tasks added!",
          description: `Added ${allItems.length} items and ${currentPlan.hostTodos.length} tasks to your event.`,
        });

        onEventUpdated?.();
        return;
      }

      // Create Mode: Original behavior
      let eventId = draftEventId;

      if (eventId) {
        // Publish the draft event
        const { error: updateError } = await supabase
          .from('events')
          .update({
            is_draft: false,
            published_at: new Date().toISOString(),
          })
          .eq('id', eventId);

        if (updateError) throw updateError;

        // Add any remaining items that weren't individually added
        const itemsToAdd: Array<{
          event_id: string;
          name: string;
          category: string;
          quantity: number;
          notes: string | null;
          include_in_export: boolean;
          is_pwac_origin: boolean;
        }> = [];

        currentPlan.menuItems.forEach((category, catIdx) => {
          category.items.forEach((item, itemIdx) => {
            const key = getItemKey(catIdx, itemIdx);
            if (!addedItems.has(key)) {
              itemsToAdd.push({
                event_id: eventId!,
                name: item.name,
                category: mapCategory(category.category),
                quantity: 1,
                notes: item.note || null,
                include_in_export: true,
                is_pwac_origin: true,
              });
            }
          });
        });

        if (itemsToAdd.length > 0) {
          const { error: itemsError } = await supabase
            .from('event_items')
            .insert(itemsToAdd);
          if (itemsError) throw itemsError;
        }

        // Add any remaining tasks
        const tasksToAdd: Array<{
          event_id: string;
          title: string;
          priority: 'medium';
          status: 'todo';
          sort_order: number;
          created_by: string;
          include_in_export: boolean;
          is_pwac_origin: boolean;
        }> = [];

        currentPlan.hostTodos.forEach((todo, todoIdx) => {
          const key = getTaskKey(todoIdx);
          if (!addedTasks.has(key)) {
            tasksToAdd.push({
              event_id: eventId!,
              title: todo,
              priority: 'medium',
              status: 'todo',
              sort_order: todoIdx,
              created_by: user.id,
              include_in_export: true,
              is_pwac_origin: true,
            });
          }
        });

        if (tasksToAdd.length > 0) {
          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(tasksToAdd);
          if (tasksError) throw tasksError;
        }
      } else {
        // Create fresh event with all items and tasks
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            name: currentPlan.planName,
            description: currentPlan.planSummary,
            event_date: eventDate?.toISOString(),
            theme_color: 'default',
            is_draft: false,
            published_at: new Date().toISOString(),
            allow_guest_items: true,
          })
          .select('id')
          .single();

        if (eventError) throw eventError;
        eventId = eventData.id;

        // Insert all items
        const allItems = currentPlan.menuItems.flatMap((category) =>
          category.items.map((item) => ({
            event_id: eventId!,
            name: item.name,
            category: mapCategory(category.category),
            quantity: 1,
            notes: item.note || null,
            include_in_export: true,
            is_pwac_origin: true,
          }))
        );

        if (allItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('event_items')
            .insert(allItems);
          if (itemsError) throw itemsError;
        }

        // Insert all tasks
        if (currentPlan.hostTodos.length > 0) {
          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(
              currentPlan.hostTodos.map((todo, index) => ({
                event_id: eventId!,
                title: todo,
                priority: 'medium' as const,
                status: 'todo' as const,
                sort_order: index,
                created_by: user.id,
                include_in_export: true,
                is_pwac_origin: true,
              }))
            );
          if (tasksError) throw tasksError;
        }
      }

      // Reset refinements for next plan
      localStorage.removeItem('pwac_refinements_remaining');

      toast({
        title: "Event created!",
        description: "Your event is ready. Redirecting to dashboard...",
      });

      onEventCreated(eventId!);
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Failed to create event",
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
          <Sparkles className="h-6 w-6 text-primary" />
          Your Event Plan
        </DialogTitle>
        <DialogDescription>
          Add items and tasks inline, refine with AI, then apply when ready
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Share Action Bar - Desktop */}
        <PWACShareActionBar
          eventId={draftEventId}
          eventUserId={user?.id || ''}
          eventName={currentPlan.planName}
          eventDate={eventDate}
          plan={currentPlan}
          addedItems={addedItems}
          addedTasks={addedTasks}
        />

        {/* AI Refinement Input */}
        <AIRefineInput
          refinementsRemaining={refinementsRemaining}
          onRefine={handleRefine}
          disabled={loading}
        />

        {/* A. Plan Header */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-2">{currentPlan.planName}</h2>
            <p className="text-muted-foreground">{currentPlan.planSummary}</p>
          </CardContent>
        </Card>

        {/* B. Event Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Event Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={['dayOf', 'duringEvent']} className="w-full">
              {currentPlan.timeline.threeDaysBefore.length > 0 && (
                <AccordionItem value="threeDaysBefore">
                  <AccordionTrigger className="text-sm font-medium">
                    3–5 Days Before
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 pl-4">
                      {currentPlan.timeline.threeDaysBefore.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {currentPlan.timeline.oneDayBefore.length > 0 && (
                <AccordionItem value="oneDayBefore">
                  <AccordionTrigger className="text-sm font-medium">
                    1 Day Before
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 pl-4">
                      {currentPlan.timeline.oneDayBefore.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {currentPlan.timeline.dayOf.length > 0 && (
                <AccordionItem value="dayOf">
                  <AccordionTrigger className="text-sm font-medium">
                    Day Of
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 pl-4">
                      {currentPlan.timeline.dayOf.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {currentPlan.timeline.oneHourBefore.length > 0 && (
                <AccordionItem value="oneHourBefore">
                  <AccordionTrigger className="text-sm font-medium">
                    1 Hour Before
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 pl-4">
                      {currentPlan.timeline.oneHourBefore.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {currentPlan.timeline.duringEvent.length > 0 && (
                <AccordionItem value="duringEvent">
                  <AccordionTrigger className="text-sm font-medium">
                    During the Event
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 pl-4">
                      {currentPlan.timeline.duringEvent.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>

        {/* C. Menu & Items List - Interactive */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Utensils className="h-5 w-5 text-primary" />
              Menu & Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPlan.menuItems.map((category, catIdx) => (
              <div key={catIdx}>
                <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  {category.category}
                </h4>
                <div className="space-y-2">
                  {category.items.map((item, itemIdx) => {
                    const key = getItemKey(catIdx, itemIdx);
                    const isAdded = addedItems.has(key);
                    return (
                      <PWACItemCard
                        key={key}
                        item={item}
                        category={category.category}
                        isAdded={isAdded}
                        itemId={addedItems.get(key)}
                        eventId={draftEventId || undefined}
                        onAdd={() => handleAddItem(catIdx, itemIdx, item, category.category)}
                        onEdit={() => handleEditItem(key, item, category.category)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* D. Host To-Dos - Interactive */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListTodo className="h-5 w-5 text-primary" />
              Host To-Dos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentPlan.hostTodos.map((todo, i) => {
                const key = getTaskKey(i);
                const isAdded = addedTasks.has(key);
                return (
                  <PWACTaskCard
                    key={key}
                    task={todo}
                    isAdded={isAdded}
                    taskId={addedTasks.get(key)}
                    eventId={draftEventId || undefined}
                    onAdd={() => handleAddTask(i, todo)}
                    onEdit={() => handleEditTask(key, todo)}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* E. Setup & Experience Tips */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              Setup & Experience Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentPlan.setupTips.map((tip, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary">💡</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-safe">
          <Button variant="outline" onClick={onBack} disabled={loading} className="w-full sm:w-auto h-12 sm:h-10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleApply} disabled={loading} className="flex-1 h-12 sm:h-10">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEnhanceMode ? 'Adding...' : 'Creating Event...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isEnhanceMode 
                  ? 'Add to Event' 
                  : (draftEventId ? 'Publish Event' : 'Apply this Plan')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Edit Sheets */}
      <PWACItemEditSheet
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />

      <PWACTaskEditSheet
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </>
  );
};

export default PlanOutputScreen;
