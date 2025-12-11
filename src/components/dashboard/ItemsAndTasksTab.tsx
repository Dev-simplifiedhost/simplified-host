import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lock, Package, CheckSquare } from "lucide-react";
import { ItemsTabV2 } from "./ItemsTabV2";
import { TasksTab } from "./TasksTab";

interface ItemsAndTasksTabProps {
  eventId: string;
  eventName: string;
  contributionsEnabled: boolean;
  contributionGoal: number;
  expectedGuestCount: number;
}

export const ItemsAndTasksTab = ({
  eventId,
  eventName,
  contributionsEnabled,
  contributionGoal,
  expectedGuestCount,
}: ItemsAndTasksTabProps) => {
  return (
    <div className="space-y-6">
      {/* Items Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Items</h2>
          <Badge variant="outline" className="text-xs">Guest-Facing</Badge>
        </div>
        
        <ItemsTabV2 
          eventId={eventId} 
          eventName={eventName}
          contributionsEnabled={contributionsEnabled}
          contributionGoal={contributionGoal}
          expectedGuestCount={expectedGuestCount}
        />
      </section>

      <Separator className="my-6" />

      {/* Tasks Section */}
      <section>
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Host Tasks
              </CardTitle>
              <Badge variant="secondary" className="text-xs">Not Visible to Guests</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <TasksTab eventId={eventId} eventDate={null} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
