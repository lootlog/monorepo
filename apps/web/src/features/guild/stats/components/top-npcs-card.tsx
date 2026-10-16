import { formatLevel } from "@lootlog/domain/profession";
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
import {
  LEADERBOARD_SIZE,
  StatsLeaderboardSection,
} from "@/components/common/stats-leaderboard-section";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";

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
    Boolean(minLvl) ||
    Boolean(maxLvl) ||
    (period !== undefined && period !== "all");

  return (
    <StatsLeaderboardSection
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
              // Capped below the row's 48px so a tall sprite never grows it.
              <span className="w-8 shrink-0">
                <NpcTile
                  className="h-9"
                  imageClassName="max-h-9"
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
          subtitle={t("kills.level", { level: formatLevel(npc.npcLvl) })}
          value={npc.uniqueKills}
          maxValue={topNpcs[0]?.uniqueKills ?? 0}
          link={{
            to: "/$guildId/stats/npcs/$npcId",
            params: { guildId, npcId: String(npc.npcId) },
          }}
        />
      ))}
    </StatsLeaderboardSection>
  );
};
