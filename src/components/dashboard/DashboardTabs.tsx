import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Package, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "items-tasks", label: "Items & Tasks", icon: Package },
  { id: "guests", label: "Guests", icon: Users },
  { id: "payments", label: "Payments", icon: DollarSign },
];

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="sticky top-14 z-30 bg-background border-b -mx-4 px-4 md:mx-0 md:px-0">
      <div className="overflow-x-auto scrollbar-hide">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="inline-flex w-auto min-w-full h-12 bg-transparent gap-1 p-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "h-12 px-4 gap-2 rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                    "data-[state=active]:shadow-none transition-colors"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
