import type { UserKillStatsResponseDtoOutput } from "@lootlog/api-client/models/main/user-kill-stats-response-dto-output";
import { Button } from "@lootlog/ui/components/button";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ChevronRight, CircleAlert, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NpcTile } from "@/components/tiles/npc-tile";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import {
  TRACKABLE_NPC_TYPES,
  type NpcType,
} from "@/features/user/kills/npc-types";

type TopKilledNpcsPanelProps = {
  data?: UserKillStatsResponseDtoOutput;
  hasActiveFilters: boolean;
  isError: boolean;
  isLoading: boolean;
  npcType: NpcType;
  onNpcTypeChange: (type: NpcType) => void;
  onRetry: () => void;
  onViewAll: () => void;
};

export const TopKilledNpcsPanel = ({
  data,
  hasActiveFilters,
  isError,
  isLoading,
  npcType,
  onNpcTypeChange,
  onRetry,
  onViewAll,
}: TopKilledNpcsPanelProps) => {
  const { t } = useTranslation();
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
      <div role="alert" className="px-3 py-8 text-center">
        <CircleAlert className="mx-auto size-5 text-destructive" />
        <p className="mt-3 text-sm text-muted-foreground">
          {t("kills.home.topKilledNpcs.loadError")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 min-h-11 lg:min-h-9"
          onClick={onRetry}
        >
          <RefreshCw className="size-4" />
          {t("common.actions.retry")}
        </Button>
      </div>
    );
  } else if (topNpcs.length === 0) {
    content = (
      <div className="px-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t(
            hasActiveFilters
              ? "kills.home.topKilledNpcs.filteredNoData"
              : "kills.home.topKilledNpcs.noData",
          )}
        </p>
      </div>
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
        <Button variant="ghost" size="sm" className="h-10" onClick={onViewAll}>
          {t("kills.home.topKilledNpcs.viewAll")}
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </div>
    </section>
  );
};
