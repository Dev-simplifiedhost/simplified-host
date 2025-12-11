import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, FileText, Trash2, Plus } from "lucide-react";

interface MyTemplatesProps {
  onApplyTemplate: (tasks: any[]) => void;
}

interface UserTemplate {
  id: string;
  template_name: string;
  event_type: string | null;
  tasks: any;
  created_at: string;
}

export function MyTemplates({ onApplyTemplate }: MyTemplatesProps) {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("user_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setTemplates(data);
    }
  };

  const saveCurrentTasks = async (eventId: string) => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Get current tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, description, priority, category_id")
      .eq("event_id", eventId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_templates")
      .insert([{
        user_id: user.id,
        template_name: newTemplateName.trim(),
        event_type: newTemplateType || null,
        tasks: tasks || []
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Template saved",
        description: "Your checklist has been saved for reuse"
      });
      setSaveDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateType("");
      loadTemplates();
    }

    setLoading(false);
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase
      .from("user_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Template deleted",
        description: "Template has been removed"
      });
      loadTemplates();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Templates
            </CardTitle>
            <CardDescription>
              Reusable checklists you've saved
            </CardDescription>
          </div>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save as Template</DialogTitle>
                <DialogDescription>
                  Save your current task list to reuse for future events
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="My Birthday Party Checklist"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Type (optional)</Label>
                  <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="friendsgiving">Friendsgiving</SelectItem>
                      <SelectItem value="holiday">Holiday Party</SelectItem>
                      <SelectItem value="dinner">Dinner Party</SelectItem>
                      <SelectItem value="office_party">Office Party</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => saveCurrentTasks("current-event-id")} disabled={loading}>
                  Save Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No saved templates yet. Save your current checklist to reuse it later!
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{template.template_name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{Array.isArray(template.tasks) ? template.tasks.length : 0} tasks</span>
                        {template.event_type && (
                          <Badge variant="secondary">{template.event_type}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApplyTemplate(Array.isArray(template.tasks) ? template.tasks : [])}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
