import { supabase } from "@/integrations/supabase/client";
import type { EventPlanData } from "@/components/plan-with-click/PlanWithClickDialog";

interface CreateEventOptions {
  plan: EventPlanData;
  eventDate?: Date;
  location?: string;
  userId: string;
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

export const createEventFromPlan = async ({ plan, eventDate, location, userId }: CreateEventOptions) => {
  // Create event with plan name and summary
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      name: plan.planName,
      description: plan.planSummary,
      event_date: eventDate?.toISOString(),
      location: location || null,
      theme_color: 'default',
      is_draft: false,
      published_at: new Date().toISOString(),
      allow_guest_items: true,
    })
    .select('id, event_code')
    .single();

  if (eventError) throw eventError;

  const eventId = eventData.id;

  // Create items from menuItems
  const allItems: Array<{
    event_id: string;
    name: string;
    category: string;
    quantity: number;
    notes: string | null;
  }> = [];

  for (const categoryGroup of plan.menuItems) {
    for (const item of categoryGroup.items) {
      allItems.push({
        event_id: eventId,
        name: item.name,
        category: mapCategory(categoryGroup.category),
        quantity: 1, // Default quantity = 1
        notes: item.note || null,
      });
    }
  }

  if (allItems.length > 0) {
    const { error: itemsError } = await supabase
      .from('event_items')
      .insert(allItems);

    if (itemsError) throw itemsError;
  }

  // Create tasks from hostTodos
  if (plan.hostTodos.length > 0) {
    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(
        plan.hostTodos.map((todo, index) => ({
          event_id: eventId,
          title: todo,
          priority: 'medium' as const,
          status: 'todo' as const,
          sort_order: index,
          created_by: userId,
        }))
      );

    if (tasksError) throw tasksError;
  }

  return { eventId, eventCode: eventData.event_code };
};
