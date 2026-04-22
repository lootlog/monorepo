import { RecentBattles } from "@/features/user/battle-panel/battle-panel-dashboard/components/recent-battles";
import { StatsOverview } from "@/features/user/battle-panel/battle-panel-dashboard/components/stats-overview";
import { useBattlesControllerGetBattleAnalytics } from "@/lib/api/generated/battlelog/battles/battles";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@lootlog/ui/components/empty";
import { Swords } from "lucide-react";
import { BattlePanelDashboardSkeleton } from "@/features/user/battle-panel/battle-panel-dashboard/battle-panel-dashboard-skeleton";
import { useTranslation } from "react-i18next";

export const BattlePanelDashboard = () => {
  const { t } = useTranslation();
  const { data: analytics, isLoading } = useBattlesControllerGetBattleAnalytics(
    { period: "180d" },
  );

  if (isLoading) {
    return <BattlePanelDashboardSkeleton />;
  }

  if (!analytics || analytics.totalBattles === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Swords />
          </EmptyMedia>
          <EmptyTitle>{t("battlePanel.list.savedEmpty")}</EmptyTitle>
          <EmptyDescription>
            {t("battlePanel.dashboard.emptyDescription")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="px-3 py-3 flex flex-col gap-4">
        <StatsOverview />
        <RecentBattles />
      </div>
    </ScrollArea>
  );
};
