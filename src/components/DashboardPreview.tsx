import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Users } from "lucide-react";
import dashboardImage from "@/assets/dashboard-preview.jpg";

export const DashboardPreview = () => {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-xl" />
            <img
              src={dashboardImage}
              alt="SimplifiedHost dashboard preview"
              className="relative rounded-2xl shadow-2xl w-full h-auto border border-border/50"
            />
            
            {/* Floating stats cards */}
            <div className="absolute -right-4 top-8 bg-card border border-border rounded-xl p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">24 Tasks Done</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
              </div>
            </div>
            
            <div className="absolute -left-4 bottom-12 bg-card border border-border rounded-xl p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">48 RSVPs</p>
                  <p className="text-xs text-muted-foreground">85% confirmed</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right - Content */}
          <div className="space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Real-time Updates</span>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
              Your Command Center for{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Perfect Events
              </span>
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              The Host Dashboard gives you complete visibility and control. Track every detail, 
              collaborate with your team, and ensure nothing falls through the cracks.
            </p>
            
            <div className="space-y-4">
              {[
                "One-click event templates save hours of planning",
                "Real-time collaboration with co-hosts and guests",
                "Automatic reminders and deadline tracking",
                "Budget management and expense splitting",
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-foreground">{item}</p>
                </div>
              ))}
            </div>
            
            <Button size="lg" className="mt-4">
              Explore Dashboard Features
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
