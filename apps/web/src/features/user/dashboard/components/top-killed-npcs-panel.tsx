import { Button } from "@lootlog/ui/components/button";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Alert, AlertTitle } from "@lootlog/ui/components/alert";
import { Empty, EmptyHeader, EmptyTitle } from "@lootlog/ui/components/empty";
import { Link } from "@tanstack/react-router";
import { ChevronRight, CircleAlert, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/api-client/react-query/main/kills";
import { NpcTile } from "@/components/tiles/npc-tile";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import {
  TRACKABLE_NPC_TYPES,
  type NpcType,
} from "@/features/user/kills/npc-types";

type TopKilledNpcsPanelProps = {
  world?: string;
  npcType: NpcType;
  period: KillStatsPeriod;
  onNpcTypeChange: (type: NpcType) => void;
};

export const TopKilledNpcsPanel: React.FC<TopKilledNpcsPanelProps> = ({
  world,
  npcType,
  period,
  onNpcTypeChange,
}) => {
  const { t } = useTranslation();
  const killStatsParams = {
    world,
    npcTypes: [npcType],
    period: period === "all" ? undefined : period,
  };
  const { data, isError, isLoading, refetch } =
    useKillsControllerGetUserKillStats(killStatsParams, {
      query: {
        queryKey: getKillsControllerGetUserKillStatsQueryKey(killStatsParams),
        staleTime: 30_000,
      },
    });
  const hasActiveFilters = Boolean(world) || period !== "all";
  const topNpcs = data?.topNpcs?.slice(0, 5) ?? [];
  let content: ReactNode;

  if (isLoading) {
    content = (
      <div className="divide-y divide-border/70">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2.5 px-3 py-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    );
  } else if (isError && !data) {
    content = (
      <Alert variant="destructive" className="m-3 w-auto">
        <CircleAlert />
        <AlertTitle>{t("kills.home.topKilledNpcs.loadError")}</AlertTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-fit min-h-11 lg:min-h-9"
          onClick={() => void refetch()}
        >
          <RefreshCw data-icon="inline-start" />
          {t("common.actions.retry")}
        </Button>
      </Alert>
    );
  } else if (topNpcs.length === 0) {
    content = (
      <Empty className="min-h-40 border-0 bg-transparent p-3">
        <EmptyHeader>
          <EmptyTitle>
            {t(
              hasActiveFilters
                ? "kills.home.topKilledNpcs.filteredNoData"
                : "kills.home.topKilledNpcs.noData",
            )}
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  } else {
    content = (
      <ol className="divide-y divide-border/70">
        {topNpcs.map((npc, index) => (
          <li key={npc.npcId} className="min-h-12 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center">
                  <PodiumRankIcon
                    rank={index + 1}
                    fallback={
                      <span className="text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                    }
                  />
                </div>
                {npc.npcIcon ? (
                  <NpcTile
                    className="[&_img]:max-h-8 [&_img]:max-w-7 [&_img]:rounded-md"
                    npc={{
                      id: npc.npcId,
                      name: npc.npcName,
                      lvl: npc.npcLvl,
                      icon: npc.npcIcon,
                    }}
                  />
                ) : (
                  <span aria-hidden className="w-7 shrink-0" />
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium leading-tight">
                    {npc.npcName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {npc.npcLvl}
                    {npc.npcProf}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {t("kills.home.topKilledNpcs.killCount", {
                  count: npc.totalKills.toLocaleString(),
                })}
              </span>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <section
      aria-labelledby="dashboard-top-npcs-title"
      aria-busy={isLoading}
      className="@container/top-npcs flex min-w-0 flex-col"
    >
      <div className="flex min-h-12 flex-col gap-2 border-b border-border/70 px-3 py-2 @md/top-npcs:flex-row @md/top-npcs:items-center @md/top-npcs:justify-between">
        <h3 id="dashboard-top-npcs-title" className="text-sm font-semibold">
          {t("kills.home.topKilledNpcs.title")}
        </h3>
        <div
          role="group"
          aria-label={t("kills.filters.npcType")}
          className="w-full shrink-0 @md/top-npcs:w-auto"
        >
          <FilterPopover
            options={TRACKABLE_NPC_TYPES.map((type) => ({
              value: type,
              label: t(`npcType.${type}`),
            }))}
            value={npcType}
            onValueChange={onNpcTypeChange}
            width="w-full @md/top-npcs:w-[120px]"
            triggerClassName="h-11 w-full @md/top-npcs:h-9"
            showSearch={false}
          />
        </div>
      </div>

      <div className="border-b border-border/70">{content}</div>

      <div className="mt-auto flex min-h-10 justify-center px-3 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-10"
          render={
            <Link to="/@me/kills">
              {t("kills.home.topKilledNpcs.viewAll")}
              <ChevronRight className="ml-2 size-4" />
            </Link>
          }
          nativeButton={false}
        />
      </div>
    </section>
  );
};
