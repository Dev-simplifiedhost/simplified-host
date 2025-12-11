import { useState, useEffect, useCallback } from "react";

interface DismissalRecord {
  id: string;
  dismissedAt: number;
  duration: "session" | "day" | "permanent";
}

const STORAGE_KEY = "simplifiedhost_notification_dismissals";

export function useNotificationDismissals() {
  const [dismissals, setDismissals] = useState<DismissalRecord[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: DismissalRecord[] = JSON.parse(stored);
        // Clean up expired dismissals
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const valid = parsed.filter(d => {
          if (d.duration === "permanent") return true;
          if (d.duration === "day") return now - d.dismissedAt < oneDayMs;
          // Session dismissals are cleared on page reload (not stored)
          return false;
        });
        setDismissals(valid);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
    } catch (e) {
      console.error("Error loading notification dismissals:", e);
    }
  }, []);

  const isDismissed = useCallback((id: string): boolean => {
    return dismissals.some(d => d.id === id);
  }, [dismissals]);

  const dismiss = useCallback((id: string, duration: "session" | "day" | "permanent" = "session") => {
    const record: DismissalRecord = {
      id,
      dismissedAt: Date.now(),
      duration,
    };

    setDismissals(prev => {
      const updated = [...prev.filter(d => d.id !== id), record];
      
      // Only persist non-session dismissals
      const toPersist = updated.filter(d => d.duration !== "session");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
      
      return updated;
    });
  }, []);

  const undismiss = useCallback((id: string) => {
    setDismissals(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.filter(d => d.duration !== "session")));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setDismissals([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getDismissedIds = useCallback((): string[] => {
    return dismissals.map(d => d.id);
  }, [dismissals]);

  return {
    isDismissed,
    dismiss,
    undismiss,
    clearAll,
    getDismissedIds,
    dismissedCount: dismissals.length,
  };
}
