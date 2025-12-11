import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, Info, Eye, Settings } from "lucide-react";

interface ContributionsCardProps {
  contributionsEnabled: boolean;
  contributionGoal: number;
  stripeTotal: number;
  manualTotal: number;
  contributorCount: number;
  isCollaborator?: boolean;
  onEnableContributions: () => void;
  onViewContributions: () => void;
  onPreviewGuestView: () => void;
  onOpenEducationModal: () => void;
}

export function ContributionsCard({
  contributionsEnabled,
  contributionGoal,
  stripeTotal,
  manualTotal,
  contributorCount,
  isCollaborator = false,
  onEnableContributions,
  onViewContributions,
  onPreviewGuestView,
  onOpenEducationModal,
}: ContributionsCardProps) {
  const totalCollected = stripeTotal + manualTotal;
  const progressPercent = contributionGoal > 0 ? Math.min((totalCollected / contributionGoal) * 100, 100) : 0;

  // Disabled state
  if (!contributionsEnabled) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Contributions
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenEducationModal}>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Payments Powered by Stripe</p>
                  <p className="text-xs mt-1">
                    SimplifiedHost uses Stripe to process online payments. Funds go directly to you.
                    Manual payments are tracked here for your convenience.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isCollaborator 
              ? "The host has not enabled contributions for this event."
              : "Contributions are turned off for this event."
            }
          </p>
          {!isCollaborator && (
            <Button onClick={onEnableContributions} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Enable Contributions
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Enabled but no contributions yet
  if (totalCollected === 0 && contributorCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Contributions
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenEducationModal}>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Payments Powered by Stripe</p>
                  <p className="text-xs mt-1">
                    SimplifiedHost uses Stripe to process online payments. Funds go directly to you.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">No contributions yet.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onViewContributions} className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              View Settings
            </Button>
            <Button variant="ghost" onClick={onPreviewGuestView} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Enabled with contributions
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contributions
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenEducationModal}>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Payments Powered by Stripe</p>
                <p className="text-xs mt-1">
                  SimplifiedHost uses Stripe to process online payments. Funds go directly to you.
                  Manual payments are tracked here for your convenience.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-2xl font-bold">${totalCollected.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              ${stripeTotal.toFixed(2)} via Stripe · ${manualTotal.toFixed(2)} manual
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{contributorCount}</p>
            <p className="text-xs text-muted-foreground">contributors</p>
          </div>
        </div>

        {contributionGoal > 0 && (
          <div className="space-y-1.5">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              ${totalCollected.toFixed(2)} of ${contributionGoal.toFixed(2)} goal
            </p>
          </div>
        )}

        <Button onClick={onViewContributions} className="w-full">
          View Contributions
        </Button>
      </CardContent>
    </Card>
  );
}
