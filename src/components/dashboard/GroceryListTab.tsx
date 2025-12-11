import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, 
  Share2, 
  Download, 
  Loader2, 
  Plus, 
  Minus,
  Check,
  Copy,
  Wand2
} from "lucide-react";

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  forItem: string;
  checked?: boolean;
}

interface GroceryList {
  id: string;
  items: GroceryItem[];
  guest_count: number;
  serving_multiplier: number;
  share_token: string;
  is_public: boolean;
}

export const GroceryListTab = ({ eventId }: { eventId: string }) => {
  const { toast } = useToast();
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [guestCount, setGuestCount] = useState(10);

  useEffect(() => {
    loadGroceryList();
  }, [eventId]);

  const loadGroceryList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setGroceryList({
          ...data,
          items: Array.isArray(data.items) ? data.items as unknown as GroceryItem[] : []
        });
        setGuestCount(data.guest_count || 10);
      }
    } catch (error) {
      console.error('Error loading grocery list:', error);
      toast({
        title: "Error",
        description: "Failed to load grocery list",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateList = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-grocery-list', {
        body: { eventId, guestCount }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Grocery list generated successfully"
      });

      await loadGroceryList();
    } catch (error) {
      console.error('Error generating list:', error);
      toast({
        title: "Error",
        description: "Failed to generate grocery list. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const adjustServings = async (multiplier: number) => {
    if (!groceryList) return;

    const newMultiplier = Math.max(0.5, groceryList.serving_multiplier + multiplier);
    
    try {
      const { error } = await supabase
        .from('grocery_lists')
        .update({ serving_multiplier: newMultiplier })
        .eq('id', groceryList.id);

      if (error) throw error;

      setGroceryList({
        ...groceryList,
        serving_multiplier: newMultiplier
      });
    } catch (error) {
      console.error('Error adjusting servings:', error);
      toast({
        title: "Error",
        description: "Failed to adjust serving size",
        variant: "destructive"
      });
    }
  };

  const toggleItemCheck = (index: number) => {
    if (!groceryList) return;
    
    const updatedItems = [...groceryList.items];
    updatedItems[index] = {
      ...updatedItems[index],
      checked: !updatedItems[index].checked
    };
    
    setGroceryList({
      ...groceryList,
      items: updatedItems
    });
  };

  const shareList = async () => {
    if (!groceryList) return;

    try {
      const { error } = await supabase
        .from('grocery_lists')
        .update({ is_public: true })
        .eq('id', groceryList.id);

      if (error) throw error;

      const shareUrl = `${window.location.origin}/grocery/${groceryList.share_token}`;
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: "Link copied!",
        description: "Anyone with this link can view your grocery list"
      });
    } catch (error) {
      console.error('Error sharing list:', error);
      toast({
        title: "Error",
        description: "Failed to share grocery list",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async () => {
    if (!groceryList) return;

    // Simple print-based PDF export
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const categories = [...new Set(groceryList.items.map(item => item.category))];
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Grocery List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #666; padding-bottom: 10px; }
            h2 { color: #666; margin-top: 20px; }
            ul { list-style: none; padding: 0; }
            li { padding: 8px 0; border-bottom: 1px solid #eee; }
            .meta { color: #999; font-size: 14px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>🛒 Grocery List</h1>
          <div class="meta">
            For ${groceryList.guest_count} guests | Serving multiplier: ${groceryList.serving_multiplier}x
          </div>
          ${categories.map(category => `
            <h2>${category}</h2>
            <ul>
              ${groceryList.items
                .filter(item => item.category === category)
                .map(item => `
                  <li>
                    ☐ ${item.name} - ${(item.quantity * groceryList.serving_multiplier).toFixed(1)} ${item.unit}
                    <span style="color: #999; font-size: 12px;">(for ${item.forItem})</span>
                  </li>
                `).join('')}
            </ul>
          `).join('')}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!groceryList) {
    return (
      <Card>
        <CardHeader className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <CardTitle>No Grocery List Yet</CardTitle>
          <CardDescription>
            Generate a smart grocery list from your event menu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guestCount">Number of Guests</Label>
            <Input
              id="guestCount"
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
            />
          </div>
          <Button 
            onClick={generateList} 
            disabled={generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Grocery List
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categories = [...new Set(groceryList.items.map(item => item.category))];
  const checkedCount = groceryList.items.filter(i => i.checked).length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={shareList} variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share List
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={generateList} disabled={generating} variant="outline">
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Regenerate
            </Button>
          </div>

          <Separator />

          {/* Serving Size Calculator */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Serving Size Multiplier</Label>
              <p className="text-xs text-muted-foreground">
                {groceryList.guest_count} guests × {groceryList.serving_multiplier}x
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => adjustServings(-0.25)}
                disabled={groceryList.serving_multiplier <= 0.5}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="min-w-[60px] justify-center">
                {groceryList.serving_multiplier}x
              </Badge>
              <Button
                size="icon"
                variant="outline"
                onClick={() => adjustServings(0.25)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {checkedCount} of {groceryList.items.length} items checked
          </div>
        </CardContent>
      </Card>

      {/* Grocery Items by Category */}
      {categories.map(category => {
        const categoryItems = groceryList.items
          .map((item, index) => ({ ...item, originalIndex: index }))
          .filter(item => item.category === category);

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {categoryItems.map(({ originalIndex, ...item }) => (
                  <li
                    key={originalIndex}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleItemCheck(originalIndex)}
                  >
                    <div className="mt-0.5">
                      {item.checked ? (
                        <div className="h-5 w-5 rounded border-2 border-primary bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded border-2 border-input" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>
                          {(item.quantity * groceryList.serving_multiplier).toFixed(1)} {item.unit}
                        </span>
                        <span>•</span>
                        <span className="text-xs">for {item.forItem}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
