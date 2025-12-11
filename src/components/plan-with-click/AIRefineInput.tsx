import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2 } from "lucide-react";

interface AIRefineInputProps {
  refinementsRemaining: number;
  onRefine: (prompt: string) => Promise<void>;
  disabled?: boolean;
}

const SUGGESTION_CHIPS = [
  "Simplify appetizers",
  "Add more drinks",
  "Make it casual",
  "Swap desserts",
];

const AIRefineInput = ({
  refinementsRemaining,
  onRefine,
  disabled,
}: AIRefineInputProps) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || refinementsRemaining <= 0) return;
    
    setLoading(true);
    try {
      await onRefine(input.trim());
      setInput("");
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const isDisabled = disabled || refinementsRemaining <= 0 || loading;

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Refine with AI</span>
        </div>
        <Badge 
          variant={refinementsRemaining > 0 ? "secondary" : "destructive"} 
          className="text-xs"
        >
          {refinementsRemaining}/3 left
        </Badge>
      </div>

      {refinementsRemaining > 0 ? (
        <>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Replace the mains with BBQ options"
              className="flex-1 h-11"
              disabled={isDisabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={isDisabled || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                disabled={isDisabled}
                className="px-2.5 py-1 text-xs bg-background border border-border/50 rounded-full hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          You've used all 3 refinements for this plan. Apply the plan to continue editing.
        </p>
      )}
    </div>
  );
};

export default AIRefineInput;
