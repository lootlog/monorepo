import { upperFirst } from "es-toolkit";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { UserLootStatsResponseDtoOutputMonstersItem } from "@lootlog/client/main";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import { StatsLeaderboardNpcMedia } from "@/components/common/stats-leaderboard-npc-media";

type StatisticsMonsterLegendsProps = {
  monsters?: UserLootStatsResponseDtoOutputMonstersItem[];
  isLoading: boolean;
  size: number;
  actions?: ReactNode;
};

export function StatisticsMonsterLegends({
  monsters = [],
  isLoading,
  size,
  actions,
}: StatisticsMonsterLegendsProps) {
  const { t } = useTranslation();
  const rows = monsters.slice(0, size);

  return (
    <StatsLeaderboardSection
      title={t("statistics.monsterDrops.title")}
      actions={actions}
      isLoading={isLoading}
      loadingRows={size}
      emptyMessage={rows.length ? undefined : t("statistics.noData")}
    >
      {rows.map((monster, index) => (
        <StatsLeaderboardRow
          key={`${monster.world}:${monster.npc.id}`}
          rank={index + 1}
          media={
            monster.npc.icon && (
              <StatsLeaderboardNpcMedia
                npc={{
                  name: monster.npc.name,
                  lvl: monster.npc.lvl ?? undefined,
                  icon: monster.npc.icon,
                }}
              />
            )
          }
          title={monster.npc.name}
          subtitle={`${upperFirst(monster.world)} · ${t(
            "statistics.monsterLegends",
            { legends: monster.legends, caught: monster.caught },
          )}`}
          value={monster.kills}
        />
      ))}
    </StatsLeaderboardSection>
  );
}
