import { PageHeader } from "@/components/layout/page-header";
import { BattlesChart } from "@/screens/battles-panel/components/battles-chart";
import { RecentBattles } from "@/screens/battles-panel/components/recent-battles";
import { StatsOverview } from "@/screens/battles-panel/components/stats-overview";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";

export const BattlesPanel = () => {
  return (
    <div className="flex flex-row w-full h-full min-h-0">
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <PageHeader>
          <div className="flex flex-row gap-2 items-center justify-center">
            <SidebarTrigger />
            <h1 className="font-semibold p-0">Panel walk</h1>
          </div>
        </PageHeader>
        <ScrollArea className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
          <StatsOverview />
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <BattlesChart />
            <BattlesChart />
          </div>
          <Separator />
          <RecentBattles />
        </ScrollArea>
      </div>
    </div>
  );
};
