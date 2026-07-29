import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Skull } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { NpcTile } from "@/components/tiles/npc-tile";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import { cn } from "@lootlog/ui/lib/utils";
import {
  TRACKABLE_NPC_TYPES,
  type NpcType,
} from "@/features/user/kills/npc-types";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@lootlog/api-client/react-query/main/kills";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

type TopKilledNpcsCardProps = {
  world?: string;
  npcType: NpcType;
  period: KillStatsPeriod;
  onNpcTypeChange: (type: NpcType) => void;
};

export const TopKilledNpcsCard: React.FC<TopKilledNpcsCardProps> = ({
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
  const { data, isLoading } = useKillsControllerGetUserKillStats(
    killStatsParams,
    {
      query: {
        queryKey: getKillsControllerGetUserKillStatsQueryKey(killStatsParams),
        staleTime: 30_000,
      },
    },
  );
  const hasActiveFilters = Boolean(world) || period !== "all";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5" />
              <Skeleton className="h-5 w-40" />
            </CardTitle>
            <Skeleton className="h-8 w-[120px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topNpcs = data?.topNpcs?.slice(0, 5) ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5" />
            {t("kills.home.topKilledNpcs.title")}
          </CardTitle>
          <Select value={npcType} onValueChange={onNpcTypeChange}>
            <SelectTrigger size="sm" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKABLE_NPC_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`npcType.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {topNpcs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground text-center">
              {t(
                hasActiveFilters
                  ? "kills.home.topKilledNpcs.filteredNoData"
                  : "kills.home.topKilledNpcs.noData",
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {topNpcs.map((npc, index) => (
              <div
                key={npc.npcId}
                className={cn(
                  "flex items-center justify-between py-2 px-2 rounded-md transition-colors hover:bg-muted/30",
                  index === 0 && "bg-yellow-500/5",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    <PodiumRankIcon
                      rank={index + 1}
                      fallback={
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      }
                    />
                  </div>
                  {npc.npcIcon && (
                    <NpcTile
                      npc={{
                        id: npc.npcId,
                        name: npc.npcName,
                        lvl: npc.npcLvl,
                        icon: npc.npcIcon,
                      }}
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {npc.npcName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {npc.npcLvl}
                      {npc.npcProf}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground">x</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {npc.totalKills.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          to="/@me/kills"
          className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
        >
          {t("kills.home.topKilledNpcs.viewAll")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
};
