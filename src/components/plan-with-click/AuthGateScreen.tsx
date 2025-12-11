import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogIn, UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";
import type { EventPlanData } from "./PlanWithClickDialog";

interface AuthGateScreenProps {
  plan: EventPlanData;
  onSignUp: () => void;
  onSignIn: () => void;
  onBack: () => void;
  embedded?: boolean;
}

const AuthGateScreen = ({ plan, onSignUp, onSignIn, onBack }: AuthGateScreenProps) => {
  // Count total items from menuItems
  const totalItems = plan.menuItems.reduce((acc, cat) => acc + cat.items.length, 0);
  
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">Your Event is Ready!</DialogTitle>
        <DialogDescription>
          Sign in or create an account to publish your event and start sharing
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Preview card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">{plan.planName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{plan.planSummary}</p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{plan.hostTodos.length} tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{totalItems} items</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="font-medium">What you'll get:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Shareable event link and code
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Automatic RSVP tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Guest item claiming
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Event management dashboard
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pb-safe">
          <Button onClick={onSignUp} className="w-full h-12" size="lg">
            <UserPlus className="mr-2 h-4 w-4" />
            Create Account & Publish
          </Button>
          <Button onClick={onSignIn} variant="outline" className="w-full h-12" size="lg">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button onClick={onBack} variant="ghost" className="w-full h-12">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Edit Event Details
          </Button>
        </div>
      </div>
    </>
  );
};

export default AuthGateScreen;
