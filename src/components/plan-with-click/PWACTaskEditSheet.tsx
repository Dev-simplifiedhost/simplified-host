import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  include_in_export?: boolean;
}

interface PWACTaskEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskData | null;
  onSave: (data: Omit<TaskData, 'id'>) => Promise<void>;
  onDelete: () => Promise<void>;
}

const PWACTaskEditSheet = ({
  open,
  onOpenChange,
  task,
  onSave,
  onDelete,
}: PWACTaskEditSheetProps) => {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [includeInExport, setIncludeInExport] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setIsCompleted(task.status === 'done');
      setIncludeInExport(task.include_in_export ?? true);
    }
  }, [task]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title,
        description,
        status: isCompleted ? 'done' : 'todo',
        include_in_export: includeInExport,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  const content = (
    <div className="space-y-4 px-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="task-title">Task Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Buy paper plates"
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description (optional)</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any additional details..."
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2 py-2">
        <Checkbox
          id="task-completed"
          checked={isCompleted}
          onCheckedChange={(checked) => setIsCompleted(!!checked)}
        />
        <Label htmlFor="task-completed" className="cursor-pointer">
          Mark as completed
        </Label>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="include-export" className="font-medium">Include in Export / Shared Plan</Label>
            <p className="text-xs text-muted-foreground">
              This task will appear when you share or print your plan
            </p>
          </div>
          <Switch
            id="include-export"
            checked={includeInExport}
            onCheckedChange={setIncludeInExport}
          />
        </div>
      </div>

      <Button
        variant="destructive"
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full h-12"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Task
      </Button>
    </div>
  );

  const footer = (
    <div className="flex gap-3 p-4 pb-safe">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12">
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 h-12">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  );

  // Delete confirmation dialog
  const deleteDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove this task from your event. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle>Edit Task</DrawerTitle>
            </DrawerHeader>
            {content}
            <DrawerFooter className="p-0">
              {footer}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
          <SheetFooter className="p-0">
            {footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {deleteDialog}
    </>
  );
};

export default PWACTaskEditSheet;
