import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ExternalLink, 
  DollarSign, 
  FileText, 
  Leaf,
  CheckCircle2,
  Lightbulb,
  CircleDot,
  User,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ItemData {
  id: string;
  name: string;
  category: string;
  notes?: string | null;
  goal_type: string;
  goal_quantity: number | null;
  goal_amount: number | null;
  current_quantity: number;
  current_amount: number;
  fulfillment_status: string;
  is_host_provided: boolean;
  is_suggested: boolean;
  serves_per_unit?: number | null;
  link_url?: string | null;
  dietary_tags?: string[] | null;
  dietary_other?: string | null;
  item_claims?: any[];
  include_in_export?: boolean;
  is_pwac_origin?: boolean;
  suggested_count?: number;
  suggested_by?: string[];
}

interface ItemTileProps {
  item: ItemData;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export const ItemTile = ({ item, onClick, selectable, selected, onSelect }: ItemTileProps) => {
  const showQuantity = !item.goal_type || item.goal_type === 'quantity' || item.goal_type === 'both';
  const showMoney = item.goal_type === 'monetary' || item.goal_type === 'both';
  
  const quantityProgress = item.goal_quantity ? (item.current_quantity / item.goal_quantity) * 100 : 0;
  const moneyProgress = item.goal_amount ? (item.current_amount / item.goal_amount) * 100 : 0;
  
  const isFulfilled = item.fulfillment_status === 'fulfilled';
  const isPartial = item.fulfillment_status === 'partial';
  const isAvailable = item.fulfillment_status === 'unfulfilled' && !item.is_host_provided;
  const hasDietary = (item.dietary_tags?.length || 0) > 0;
  const hasNotes = !!item.notes;
  const hasLink = !!item.link_url;

  // Determine border color based on status
  const getBorderColor = () => {
    if (item.is_host_provided) return "border-l-blue-500";
    if (isFulfilled) return "border-l-emerald-600";
    if (isPartial) return "border-l-yellow-500";
    if (isAvailable) return "border-l-green-400";
    return "border-l-border";
  };

  // Determine background based on status
  const getBackground = () => {
    if (item.is_host_provided) return "bg-blue-50/50 dark:bg-blue-950/20";
    if (isFulfilled) return "bg-emerald-50/50 dark:bg-emerald-950/20";
    return "";
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelect?.(item.id, checked);
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        "border-l-4",
        getBorderColor(),
        getBackground(),
        selected && "ring-2 ring-primary"
      )}
      onClick={selectable ? undefined : onClick}
    >
      <CardContent className="p-3">
        {selectable && (
          <div className="flex items-center gap-3 mb-2">
            <Checkbox 
              checked={selected} 
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
            />
            <span 
              className="text-sm font-medium cursor-pointer flex-1"
              onClick={onClick}
            >
              {item.name}
            </span>
          </div>
        )}
        <div className={cn("flex items-start justify-between gap-2", selectable && "hidden")}>
          {/* Left: Name and badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "font-medium text-sm truncate",
                isFulfilled && "text-muted-foreground"
              )}>
                {item.name}
              </span>
              
              {/* Status badges - mutually exclusive */}
              {item.is_host_provided ? (
                <Badge className="text-xs h-5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0">
                  <User className="h-3 w-3 mr-1" />
                  Host Provided
                </Badge>
              ) : isFulfilled ? (
                <Badge className="text-xs h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Covered
                </Badge>
              ) : isPartial ? (
                <Badge variant="outline" className="text-xs h-5 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300 border-yellow-200">
                  {item.current_quantity}/{item.goal_quantity || '?'} claimed
                </Badge>
              ) : isAvailable && (
                <Badge variant="outline" className="text-xs h-5 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border-green-200">
                  <CircleDot className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              )}
              
              {/* Source badge - only show for guest suggested if not already showing host badge */}
              {item.is_suggested && !item.is_host_provided && (
                <Badge variant="outline" className="text-xs h-5 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {(item.suggested_count || 1) > 1 
                    ? `Suggested by ${item.suggested_count} guests`
                    : 'Suggested'}
                </Badge>
              )}
            </div>

            {/* Progress indicators - only show if not host provided and has goals */}
            {!item.is_host_provided && (
              <div className="mt-2 space-y-1.5">
                {showQuantity && item.goal_quantity && (
                  <div className="flex items-center gap-2">
                    <Progress value={quantityProgress} className="h-1.5 flex-1 max-w-32" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.current_quantity}/{item.goal_quantity}
                    </span>
                  </div>
                )}
                
                {showMoney && item.goal_amount && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <Progress value={moneyProgress} className="h-1.5 flex-1 max-w-32" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ${item.current_amount?.toFixed(0) || 0}/${item.goal_amount?.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Badges and Icons - flex-wrap for small screens */}
          <div className="flex flex-wrap items-center justify-end gap-1 flex-shrink-0">
            {/* Hide Exported badge for suggested items */}
            {item.include_in_export && !item.is_suggested && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground border-muted-foreground/40">
                ↗ Exported
              </Badge>
            )}
            {item.is_pwac_origin && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-primary/5 border-primary/30 text-primary">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                AI
              </Badge>
            )}
            {hasDietary && (
              <Leaf className="h-4 w-4 text-green-600" />
            )}
            {hasNotes && (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            {hasLink && (
              <ExternalLink className="h-4 w-4 text-blue-500" />
            )}
          </div>
        </div>

        {/* Dietary tags */}
        {hasDietary && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.dietary_tags?.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5">
                {tag.replace('_', '-')}
              </Badge>
            ))}
            {(item.dietary_tags?.length || 0) > 3 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                +{(item.dietary_tags?.length || 0) - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
