import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface ContributeCompactProps {
  contributionsEnabled: boolean;
  contributionMessage?: string;
  onContribute: () => void;
}

export const ContributeCompact = ({
  contributionsEnabled,
  contributionMessage,
  onContribute,
}: ContributeCompactProps) => {
  if (!contributionsEnabled) return null;

  return (
    <div className="py-3">
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
        <h3 className="text-[15px] font-medium text-foreground">Contribute</h3>
        <p className="text-[13px] text-muted-foreground mt-1">
          {contributionMessage || "Help make this event special."}
        </p>
        <Button
          onClick={onContribute}
          size="sm"
          className="mt-3 h-9 px-4 gap-1.5"
        >
          <DollarSign className="h-4 w-4" />
          Contribute
        </Button>
      </div>
    </div>
  );
};
