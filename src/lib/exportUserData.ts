import { supabase } from "@/integrations/supabase/client";

export const exportUserData = async (userId: string, userEmail: string) => {
  try {
    // Fetch all user's events
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId);

    if (eventsError) throw eventsError;

    // Fetch all RSVPs for user's events
    const eventIds = events?.map((e) => e.id) || [];
    let rsvps = [];
    if (eventIds.length > 0) {
      const { data: rsvpData, error: rsvpError } = await supabase
        .from("rsvps")
        .select("*")
        .in("event_id", eventIds);

      if (rsvpError) throw rsvpError;
      rsvps = rsvpData || [];
    }

    // Fetch all items for user's events
    let items = [];
    if (eventIds.length > 0) {
      const { data: itemData, error: itemError } = await supabase
        .from("event_items")
        .select("*")
        .in("event_id", eventIds);

      if (itemError) throw itemError;
      items = itemData || [];
    }

    // Fetch all tasks for user's events
    let tasks = [];
    if (eventIds.length > 0) {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .in("event_id", eventIds);

      if (taskError) throw taskError;
      tasks = taskData || [];
    }

    // Fetch all announcements for user's events
    let announcements = [];
    if (eventIds.length > 0) {
      const { data: announcementData, error: announcementError } = await supabase
        .from("announcements")
        .select("*")
        .in("event_id", eventIds);

      if (announcementError) throw announcementError;
      announcements = announcementData || [];
    }

    // Fetch user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    // Fetch user's activities
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", userId);

    if (activitiesError) throw activitiesError;

    // Fetch collaborations
    const { data: collaborations, error: collaborationsError } = await supabase
      .from("event_collaborators")
      .select("*")
      .eq("user_id", userId);

    if (collaborationsError) throw collaborationsError;

    // Create export object
    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        email: userEmail,
        user_id: userId,
      },
      profile: profile,
      events: events,
      rsvps: rsvps,
      items: items,
      tasks: tasks,
      announcements: announcements,
      activities: activities,
      collaborations: collaborations,
      summary: {
        total_events: events?.length || 0,
        total_rsvps: rsvps.length,
        total_items: items.length,
        total_tasks: tasks.length,
        total_announcements: announcements.length,
        total_activities: activities?.length || 0,
        total_collaborations: collaborations?.length || 0,
      },
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `simplifiedhost-data-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return exportData;
  } catch (error) {
    console.error("Error exporting user data:", error);
    throw error;
  }
};
