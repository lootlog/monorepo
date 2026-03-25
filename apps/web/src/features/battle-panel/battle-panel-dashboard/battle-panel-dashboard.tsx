// import { BattlesChart } from "@/features/battle-panel/battle-panel-dashboard/components/battles-chart";
import { RecentBattles } from "@/features/battle-panel/battle-panel-dashboard/components/recent-battles";
import { StatsOverview } from "@/features/battle-panel/battle-panel-dashboard/components/stats-overview";
import { useBattleAnalytics } from "@/hooks/api/battle-log/use-battle-analytics";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@lootlog/ui/components/empty";
import { Swords } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";

export const BattlePanelDashboard = () => {
  const { data: analytics, isLoading } = useBattleAnalytics({ period: "180d" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!analytics || analytics.totalBattles === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Swords />
          </EmptyMedia>
          <EmptyTitle>Brak zapisanych walk</EmptyTitle>
          <EmptyDescription>
            Nie masz jeszcze żadnej zapisanej walki. Aby rozpocząć zbieranie
            danych o walkach, włącz panel walk w dodatku w grze w ustawieniach w
            zakładce &ldquo;Panel walk&rdquo;.
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
