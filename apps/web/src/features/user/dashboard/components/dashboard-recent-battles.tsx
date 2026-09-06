import { useBattleTableActions } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-actions";
import { BattleTableDeleteDialogs } from "@/features/user/battle-panel/battle-panel-battles-list/components/battle-table-delete-dialogs";
import { DashboardRecentBattleActions } from "./dashboard-recent-battle-actions";
import { useBattlesControllerGetDashboardBattles } from "@lootlog/client/battlelog";
import { Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { StatisticsQueryState } from "@/features/user/statistics/statistics-query-state";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { DashboardRecentBattle } from "./dashboard-recent-battle";

export function DashboardRecentBattles() {
  const { t } = useTranslation();
  const actions = useBattleTableActions({
    selectedBattles: [],
    clearSelection: () => {},
    removeBattleFromSelection: () => {},
  });
  const now = useMinuteTimestamp();
  const query = useBattlesControllerGetDashboardBattles(
    { size: 5, sortOrder: "desc", includeTotal: false },
    { query: { staleTime: 60_000 } },
  );
  return (
    <SectionCard>
      <SectionCardHeader
        icon={Swords}
        title={t("statistics.recentBattles.title")}
        actions={
          <ChevronLink render={<Link to="/@me/battle-panel" />}>
            {t("statistics.recentBattles.showAll")}
          </ChevronLink>
        }
      />
      <StatisticsQueryState
        query={query}
        loading={
          <div
            role="status"
            aria-label={t("common.loading")}
            className="space-y-3 p-3"
          >
            {[0, 1, 2].map((key) => (
              <Skeleton
                key={key}
                className="h-12 w-full motion-reduce:animate-none"
              />
            ))}
          </div>
        }
      >
        {query.data?.battles.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {t("statistics.recentBattles.empty")}
          </p>
        ) : (
          <ul>
            {query.data?.battles.map((battle) => (
              <DashboardRecentBattle
                key={battle.id}
                battle={battle}
                now={now}
                actions={
                  <DashboardRecentBattleActions
                    battle={battle}
                    actions={actions}
                  />
                }
              />
            ))}
          </ul>
        )}
      </StatisticsQueryState>
      <BattleTableDeleteDialogs
        isBulkDeleteDialogOpen={false}
        isDeletePending={actions.isDeletePending}
        onBulkDelete={actions.handleBulkDelete}
        onBulkDeleteOpenChange={actions.setIsBulkDeleteDialogOpen}
        onSingleDelete={actions.handleSingleDelete}
        onSingleDeleteOpenChange={(open) => {
          if (!open) actions.setSingleDeleteBattle(null);
        }}
        selectedCount={0}
        singleDeleteBattle={actions.singleDeleteBattle}
      />
    </SectionCard>
  );
}
