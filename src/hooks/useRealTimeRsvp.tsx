import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Custom hook to set up real-time subscription for RSVP changes
 * based on guest tokens stored in localStorage
 */
export const useRealTimeRsvp = (onUpdate: () => void, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Get all guest tokens from localStorage
    const tokens: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('guest_token_')) {
        const token = localStorage.getItem(key);
        if (token) tokens.push(token);
      }
    }

    if (tokens.length === 0) return;

    const rsvpChannel = supabase
      .channel(`guest-rsvps-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
        },
        (payload) => {
          const updatedToken = (payload.new as any)?.guest_token;
          if (updatedToken && tokens.includes(updatedToken)) {
            console.log('RSVP change detected:', payload.eventType);
            onUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rsvpChannel);
    };
  }, [onUpdate, enabled]);
};