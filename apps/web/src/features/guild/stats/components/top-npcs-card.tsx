import { NpcTile } from "@/components/tiles/npc-tile";
import {
  getKillsControllerGetGuildTopNpcsQueryKey,
  useKillsControllerGetGuildTopNpcs,
  type NpcType,
} from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { buildGuildTopNpcsParams } from "../utils/build-stats-query-params";
import { StatsLeaderboardCard } from "./stats-leaderboard-card";
import { StatsLeaderboardRow } from "./stats-leaderboard-row";

const LEADERBOARD_SIZE = 5;

type TopNpcsCardProps = {
  guildId: string;
  npcType: NpcType;
  world?: string;
  minLvl?: number;
  maxLvl?: number;
  period?: KillStatsPeriod;
};

export const TopNpcsCard = ({
  guildId,
  npcType,
  world,
  minLvl,
  maxLvl,
  period,
}: TopNpcsCardProps) => {
  const { t } = useTranslation();

  const topNpcsParams = buildGuildTopNpcsParams({
    limit: LEADERBOARD_SIZE,
    npcType,
    world,
    minLvl,
    maxLvl,
    period,
  });

  const { data, isLoading } = useKillsControllerGetGuildTopNpcs(
    { guildId },
    topNpcsParams,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getKillsControllerGetGuildTopNpcsQueryKey(
          { guildId },
          topNpcsParams,
        ),
      },
    },
  );

  const topNpcs = data?.topNpcs?.slice(0, LEADERBOARD_SIZE) ?? [];

  const hasActiveFilters =
    Boolean(world) ||
    Boolean(minLvl) ||
    Boolean(maxLvl) ||
    (period !== undefined && period !== "all");

  return (
    <StatsLeaderboardCard
      title={t("kills.topNpcs.title")}
      description={t("kills.topNpcs.description", {
        type: t(`npcType.${npcType}`),
      })}
      isLoading={isLoading}
      emptyMessage={
        topNpcs.length === 0
          ? t(
              hasActiveFilters
                ? "kills.topNpcs.filteredNoData"
                : "kills.topNpcs.noData",
            )
          : undefined
      }
      actions={
        <ChevronLink
          className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
          render=<Link to="/$guildId/stats/npcs" params={{ guildId }} />
        >
          {t("kills.topNpcs.viewAll")}
        </ChevronLink>
      }
    >
      {topNpcs.map((npc, index) => (
        <StatsLeaderboardRow
          key={npc.npcId}
          rank={index + 1}
          media={
            npc.npcIcon && (
              <span className="w-8 shrink-0">
                <NpcTile
                  npc={{
                    id: npc.npcId,
                    name: npc.npcName,
                    lvl: npc.npcLvl,
                    icon: npc.npcIcon,
                  }}
                />
              </span>
            )
          }
          title={npc.npcName}
          subtitle={t("kills.level", { level: npc.npcLvl })}
          value={npc.uniqueKills}
          maxValue={topNpcs[0]?.uniqueKills ?? 0}
          link={{
            to: "/$guildId/stats/npcs/$npcId",
            params: { guildId, npcId: String(npc.npcId) },
          }}
        />
      ))}
    </StatsLeaderboardCard>
  );
};
