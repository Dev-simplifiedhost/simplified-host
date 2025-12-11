import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Shield } from "lucide-react";

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

interface AuditEntry {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string | null;
}

export function AuditLogDialog({ open, onOpenChange, eventId }: AuditLogDialogProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, eventId]);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("collaborator_audit_log")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const filteredLogs = filter === "all" 
    ? logs 
    : logs.filter(log => log.action.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Log
          </DialogTitle>
          <DialogDescription>
            Complete history of collaborator actions and changes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filter by Action</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="insert">New Collaborators</SelectItem>
                <SelectItem value="update">Permission Changes</SelectItem>
                <SelectItem value="delete">Removals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No audit entries found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      {log.user_id && (
                        <p className="text-sm text-muted-foreground mb-1">
                          By: {log.user_id.substring(0, 8)}...
                        </p>
                      )}
                      {log.details && (
                        <div className="text-sm">
                          <p className="font-medium">Details:</p>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
