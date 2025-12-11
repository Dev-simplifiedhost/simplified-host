import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicCommentsSection } from "./PublicCommentsSection";

interface CommentsCompactProps {
  eventId: string;
  hostName?: string;
  enabled: boolean;
}

export interface CommentsCompactHandle {
  expand: () => void;
}

export const CommentsCompact = forwardRef<CommentsCompactHandle, CommentsCompactProps>(
  ({ eventId, hostName, enabled }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [commentCount, setCommentCount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      expand: () => {
        setIsExpanded(true);
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }));

    useEffect(() => {
      if (!enabled) return;
      loadCommentCount();
    }, [eventId, enabled]);

    const loadCommentCount = async () => {
      try {
        const { count } = await supabase
          .from('event_comments')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'approved')
          .is('parent_comment_id', null);
        
        setCommentCount(count || 0);
      } catch (error) {
        console.error('Error loading comment count:', error);
      }
    };

    if (!enabled) return null;

    return (
      <div ref={containerRef} className="py-3">
        <div className="rounded-lg border border-border/30 overflow-hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-[15px] font-medium text-foreground">Comments & Discussion</span>
              {commentCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
                  {commentCount}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isExpanded && (
            <div className="px-3 py-2">
              <PublicCommentsSection eventId={eventId} hostName={hostName} />
            </div>
          )}
        </div>
      </div>
    );
  }
);

CommentsCompact.displayName = "CommentsCompact";
