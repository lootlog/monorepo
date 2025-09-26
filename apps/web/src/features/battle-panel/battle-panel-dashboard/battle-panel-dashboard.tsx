import { BattlesChart } from "@/features/battle-panel/battle-panel-dashboard/components/battles-chart";
import { RecentBattles } from "@/features/battle-panel/battle-panel-dashboard/components/recent-battles";
import { StatsOverview } from "@/features/battle-panel/battle-panel-dashboard/components/stats-overview";

import { Separator } from "@lootlog/ui/components/separator";

export const BattlePanelDashboard = () => {
  return (
    <div>
      <StatsOverview />
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <BattlesChart />
        <BattlesChart />
      </div>
      <Separator />
      <RecentBattles />
    </div>
  );
};
