import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const CATEGORIES = [
  { value: 'appetizers', label: 'Appetizers' },
  { value: 'mains', label: 'Main Dishes' },
  { value: 'sides', label: 'Sides' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'decorations', label: 'Decorations' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];

interface ItemData {
  id: string;
  name: string;
  quantity: number;
  category: string;
  notes?: string;
  include_in_export?: boolean;
}

interface PWACItemEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemData | null;
  onSave: (data: Omit<ItemData, 'id'>) => Promise<void>;
  onDelete: () => Promise<void>;
}

const PWACItemEditSheet = ({
  open,
  onOpenChange,
  item,
  onSave,
  onDelete,
}: PWACItemEditSheetProps) => {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState("other");
  const [notes, setNotes] = useState("");
  const [includeInExport, setIncludeInExport] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(item.quantity);
      setCategory(item.category);
      setNotes(item.notes || "");
      setIncludeInExport(item.include_in_export ?? true);
    }
  }, [item]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, quantity, category, notes, include_in_export: includeInExport });
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
        <Label htmlFor="item-name">Item Name</Label>
        <Input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Chips and Salsa"
          className="h-12"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="item-quantity">Quantity</Label>
          <Input
            id="item-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="item-category" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-notes">Notes (optional)</Label>
        <Textarea
          id="item-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special notes..."
          rows={2}
        />
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="include-export" className="font-medium">Include in Export / Shared Plan</Label>
            <p className="text-xs text-muted-foreground">
              This item will appear when you share or print your plan
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
        Delete Item
      </Button>
    </div>
  );

  const footer = (
    <div className="flex gap-3 p-4 pb-safe">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12">
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 h-12">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  );

  // Delete confirmation dialog
  const deleteDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove "{item?.name}" from your event. This action cannot be undone.
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
              <DrawerTitle>Edit Item</DrawerTitle>
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
            <SheetTitle>Edit Item</SheetTitle>
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

export default PWACItemEditSheet;
