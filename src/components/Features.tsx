import { MousePointerClick, LayoutDashboard, Users, Shield, Zap, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: MousePointerClick,
    title: "Plan it With a Click",
    description: "Smart templates instantly create event timelines, guest lists, and task lists tailored to your gathering type.",
  },
  {
    icon: LayoutDashboard,
    title: "Host Dashboard",
    description: "Your control center. Track RSVPs, manage budgets, assign tasks, and monitor everything in real-time.",
  },
  {
    icon: Users,
    title: "Collaborative Planning",
    description: "Add co-hosts, let guests claim items, and work together seamlessly without endless group chats.",
  },
  {
    icon: Shield,
    title: "Guest Access Made Simple",
    description: "Attendees join via access code or URL—no login required. Quick, secure, and hassle-free.",
  },
  {
    icon: Zap,
    title: "Smart Automation",
    description: "Automated reminders, deadline tracking, and intelligent suggestions keep you ahead of schedule.",
  },
  {
    icon: Calendar,
    title: "Any Event, Any Size",
    description: "From intimate dinners to corporate retreats. Scale effortlessly with tools that adapt to your needs.",
  },
];

export const Features = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-3 md:space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Host with Confidence
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            Powerful features designed to simplify every step of your event planning journey
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group relative overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-5 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
