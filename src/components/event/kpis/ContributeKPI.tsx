import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface ContributeKPIProps {
  title: string;
  event: any;
  onClick?: () => void;
}

export const ContributeKPI = ({ title, event, onClick }: ContributeKPIProps) => {
  const hasContributionMethods = event.contribution_methods && 
    Array.isArray(event.contribution_methods) && 
    event.contribution_methods.length > 0;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer border-border/50"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {hasContributionMethods 
              ? "Multiple payment options available"
              : "Help make this event special"}
          </p>
          
          {event.contribution_message && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {event.contribution_message}
            </p>
          )}
          
          <div className="pt-2">
            <span className="text-xs font-medium text-primary">
              Click to contribute →
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
