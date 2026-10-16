import { upperFirst } from "es-toolkit";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { UserLootStatsResponseDtoOutputMonstersItem } from "@lootlog/client/main";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import { NpcTile } from "@/components/tiles/npc-tile";

type StatisticsMonsterLegendsProps = {
  monsters?: UserLootStatsResponseDtoOutputMonstersItem[];
  isLoading: boolean;
  size: number;
  actions?: ReactNode;
};

/** The most killed bosses with the legends they dropped and the user caught. */
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
              <span className="w-8 shrink-0">
                <NpcTile
                  className="h-9"
                  imageClassName="max-h-9"
                  npc={{
                    id: monster.npc.id,
                    name: monster.npc.name,
                    lvl: monster.npc.lvl ?? undefined,
                    icon: monster.npc.icon,
                  }}
                />
              </span>
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
