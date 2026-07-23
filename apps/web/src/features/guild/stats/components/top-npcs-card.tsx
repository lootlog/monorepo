import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useLocalStorage } from "usehooks-ts";
import { ChevronRight, Crown, Medal, Skull, Trophy } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Card } from "@lootlog/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NpcTile } from "@/components/tiles/npc-tile";
import { cn } from "@lootlog/ui/lib/utils";
import {
  getKillsControllerGetGuildTopNpcsQueryKey,
  useKillsControllerGetGuildTopNpcs,
} from "@lootlog/api-client/react-query/main/kills";
import type { NpcType } from "@lootlog/api-client/models/main/npc-type";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { TRACKABLE_NPC_TYPES } from "../constants";
import { buildGuildTopNpcsParams } from "../utils/build-stats-query-params";

const STORAGE_KEY = "stats-top-npcs-type";

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 1:
      return <Trophy className="h-4 w-4 text-slate-400" />;
    case 2:
      return <Medal className="h-4 w-4 text-amber-600" />;
    default:
      return null;
  }
};

type TopNpcsCardProps = {
  world?: string;
  minLvl?: number;
  maxLvl?: number;
  period?: KillStatsPeriod;
};

export const TopNpcsCard: React.FC<TopNpcsCardProps> = ({
  world,
  minLvl,
  maxLvl,
  period,
}) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const [selectedNpcType, setSelectedNpcType] = useLocalStorage<NpcType>(
    STORAGE_KEY,
    "ELITE2",
  );
  const topNpcsParams = buildGuildTopNpcsParams({
    limit: 5,
    npcType: selectedNpcType,
    world,
    minLvl,
    maxLvl,
    period,
  });

  const { data, isLoading } = useKillsControllerGetGuildTopNpcs(
    { guildId: guildId ?? "" },
    topNpcsParams,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getKillsControllerGetGuildTopNpcsQueryKey(
          { guildId: guildId ?? "" },
          topNpcsParams,
        ),
      },
    },
  );

  if (isLoading) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Skull className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </h2>
          <Skeleton className="h-8 w-[120px]" />
        </div>
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
      </Card>
    );
  }

  const topNpcs = data?.topNpcs?.slice(0, 5) ?? [];
  const hasActiveFilters =
    Boolean(world) ||
    Boolean(minLvl) ||
    Boolean(maxLvl) ||
    (period !== undefined && period !== "all");

  if (!guildId) {
    return null;
  }

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3 flex flex-col h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Skull className="h-5 w-5" />
          {t("kills.topNpcs.title")}
        </h2>
        <Select
          value={selectedNpcType}
          onValueChange={(value) => setSelectedNpcType(value as NpcType)}
        >
          <SelectTrigger className="w-[120px] h-8">
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
      <div className="flex flex-col flex-1">
        {topNpcs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">
              {t(
                hasActiveFilters
                  ? "kills.topNpcs.filteredNoData"
                  : "kills.topNpcs.noData",
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {topNpcs.map((npc, index) => (
              <Link
                key={npc.npcId}
                to="/$guildId/stats/npcs/$npcId"
                params={{ guildId, npcId: String(npc.npcId) }}
                className={cn(
                  "flex items-center justify-between py-2 px-2 rounded-md transition-colors hover:bg-muted/30",
                  index === 0 && "bg-yellow-500/5",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    {getRankIcon(index) ?? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  {npc.npcIcon && (
                    <div className="w-8 flex-shrink-0">
                      <NpcTile
                        npc={{
                          id: npc.npcId,
                          name: npc.npcName,
                          lvl: npc.npcLvl,
                          icon: npc.npcIcon,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {npc.npcName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {npc.npcLvl}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground">x</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {npc.uniqueKills.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link
          to="/$guildId/stats/npcs"
          params={{ guildId }}
          className="block mt-3"
        >
          <Button variant="outline" className="w-full" size="sm">
            {t("kills.topNpcs.viewAll")}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};
