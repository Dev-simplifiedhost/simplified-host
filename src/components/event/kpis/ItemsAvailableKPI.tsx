import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

interface ItemsAvailableKPIProps {
  title: string;
  itemStats: { total: number; available: number };
  onClick?: () => void;
}

export const ItemsAvailableKPI = ({ title, itemStats, onClick }: ItemsAvailableKPIProps) => {
  const percentageFulfilled = itemStats.total > 0 
    ? Math.round(((itemStats.total - itemStats.available) / itemStats.total) * 100)
    : 0;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer border-border/50"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <Package className="h-5 w-5 text-primary" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {itemStats.available}
            </span>
            <span className="text-sm text-muted-foreground">
              of {itemStats.total} items
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {percentageFulfilled}% fulfilled
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
