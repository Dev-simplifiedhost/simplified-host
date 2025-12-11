import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Check, AlertCircle } from "lucide-react";

interface EventData {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  pwac_share_token: string;
}

interface ItemData {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
  fulfillment_status: string | null;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
}

const SharedPlan = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [items, setItems] = useState<ItemData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);

  useEffect(() => {
    if (shareToken) {
      loadSharedPlan();
    }
  }, [shareToken]);

  // Update document title
  useEffect(() => {
    if (event) {
      document.title = `${event.name} - Event Plan | SimplifiedHost`;
    }
    return () => {
      document.title = 'SimplifiedHost';
    };
  }, [event]);

  const loadSharedPlan = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch event by share token
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, description, event_date, pwac_share_token')
        .eq('pwac_share_token', shareToken)
        .eq('is_draft', false)
        .single();

      if (eventError || !eventData) {
        setError('This plan could not be found or is no longer available.');
        setLoading(false);
        return;
      }

      setEvent(eventData);

      // Fetch items for this event - only those marked for export
      const { data: itemsData } = await supabase
        .from('event_items')
        .select('id, name, category, notes, fulfillment_status')
        .eq('event_id', eventData.id)
        .eq('include_in_export', true)
        .order('created_at', { ascending: true });

      if (itemsData) {
        setItems(itemsData);
      }

      // Fetch tasks for this event - only those marked for export
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('event_id', eventData.id)
        .eq('include_in_export', true)
        .order('created_at', { ascending: true });

      if (tasksData) {
        setTasks(tasksData);
      }
    } catch (err) {
      console.error('Error loading shared plan:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const getStatusDisplay = (status: string | null): { label: string; isDone: boolean } => {
    if (status === 'fulfilled' || status === 'done') {
      return { label: 'Done', isDone: true };
    }
    if (status === 'partial' || status === 'in_progress') {
      return { label: 'In progress', isDone: false };
    }
    return { label: 'Not started', isDone: false };
  };

  const formatCategory = (category: string | null): string => {
    if (!category) return 'Other';
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  };

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = formatCategory(item.category);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ItemData[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#142E26]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F9F7] p-6">
        <AlertCircle className="h-12 w-12 text-[#5E625E] mb-4" />
        <h1 className="text-xl font-semibold text-[#142E26] mb-2">Plan Not Found</h1>
        <p className="text-[#5E625E] text-center max-w-md mb-6">
          {error || 'This plan could not be found or is no longer available.'}
        </p>
        <Link 
          to="/" 
          className="text-[#142E26] underline underline-offset-2 hover:opacity-80"
        >
          Go to SimplifiedHost
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9F7]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-[#ECEEEB]">
        <div className="max-w-[720px] mx-auto px-6 py-4 text-center">
          <h2 className="text-lg font-bold text-[#142E26] tracking-wide">SimplifiedHost</h2>
          <p className="text-xs text-[#5E625E]">Plan Confidently. Host Effortlessly.</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[720px] mx-auto px-6 py-8">
        {/* Event Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#142E26] mb-3">
            {event.name}
          </h1>
          {event.event_date && (
            <div className="flex items-center justify-center gap-2 text-[#5E625E] mb-3">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.event_date)}</span>
            </div>
          )}
          <span className="inline-block text-xs text-[#5E625E] bg-[#F7F9F7] border border-[#ECEEEB] px-3 py-1 rounded-full">
            Shared via SimplifiedHost
          </span>
        </div>

        {/* Summary Section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#142E26] uppercase tracking-wider mb-3 pb-2 border-b border-[#ECEEEB]">
            Summary
          </h2>
          {event.description ? (
            <p className="text-[#222] text-sm leading-relaxed">{event.description}</p>
          ) : (
            <p className="text-[#5E625E] text-sm italic">No summary available.</p>
          )}
        </section>

        {/* Items Section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#142E26] uppercase tracking-wider mb-3 pb-2 border-b border-[#ECEEEB]">
            Items
          </h2>
          {Object.keys(itemsByCategory).length > 0 ? (
            Object.entries(itemsByCategory).map(([category, categoryItems]) => (
              <div key={category} className="mb-4">
                <h3 className="text-xs font-semibold text-[#5E625E] uppercase tracking-wide mb-2">
                  {category}
                </h3>
                <ul className="space-y-2">
                  {categoryItems.map((item) => {
                    const status = getStatusDisplay(item.fulfillment_status);
                    return (
                      <li 
                        key={item.id} 
                        className="bg-white rounded-lg p-3 border border-[#ECEEEB]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-[#222]">{item.name}</span>
                          <span 
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              status.isDone 
                                ? 'bg-green-50 text-green-700' 
                                : 'bg-[#F7F9F7] text-[#5E625E]'
                            }`}
                          >
                            {status.label}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-[#5E625E] mt-1">{item.notes}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-[#5E625E] text-sm italic">No items added yet.</p>
          )}
        </section>

        {/* Tasks Section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#142E26] uppercase tracking-wider mb-3 pb-2 border-b border-[#ECEEEB]">
            Tasks
          </h2>
          {tasks.length > 0 ? (
            <ul className="space-y-2">
              {tasks.map((task) => {
                const isCompleted = task.status === 'done';
                return (
                  <li 
                    key={task.id} 
                    className="bg-white rounded-lg p-3 border border-[#ECEEEB] flex items-center gap-3"
                  >
                    <div 
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isCompleted 
                          ? 'bg-[#142E26] border-[#142E26]' 
                          : 'border-[#5E625E]'
                      }`}
                    >
                      {isCompleted && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span 
                      className={`text-sm ${
                        isCompleted 
                          ? 'text-[#5E625E] line-through' 
                          : 'text-[#222]'
                      }`}
                    >
                      {task.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[#5E625E] text-sm italic">No tasks added yet.</p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#ECEEEB] bg-white">
        <div className="max-w-[720px] mx-auto px-6 py-6 text-center">
          <p className="text-xs text-[#5E625E]">
            Created with <span className="font-semibold text-[#142E26]">SimplifiedHost</span> — Plan Confidently.
          </p>
          <a 
            href="https://simplifiedhost.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-[#142E26] hover:underline"
          >
            simplifiedhost.com
          </a>
        </div>
      </footer>
    </div>
  );
};

export default SharedPlan;
