import { upperFirst } from "es-toolkit";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import { NpcTile } from "@/components/tiles/npc-tile";
import type { StatisticsSearch } from "./statistics-search";

/** Rows of each ranking preview on the overview. */
export const STATISTICS_PREVIEW_SIZE = 5;

type StatisticsTopNpcsProps = {
  npcs: UserKillAnalyticsResponseDtoOutput["npcs"];
  search: StatisticsSearch;
};

/** The most killed monsters, opening the whole ranking from its heading. */
export function StatisticsTopNpcs({ npcs, search }: StatisticsTopNpcsProps) {
  const { t } = useTranslation();
  const top = npcs.slice(0, STATISTICS_PREVIEW_SIZE);

  return (
    <StatsLeaderboardSection
      title={t("statistics.ranking")}
      emptyMessage={top.length ? undefined : t("statistics.noData")}
      actions={
        <ChevronLink
          render=<Link
            to="/@me/statistics"
            search={{ ...search, tab: "monsters" }}
          />
        >
          {t("statistics.allMonsters")}
        </ChevronLink>
      }
    >
      {top.map((npc, index) => (
        <StatsLeaderboardRow
          key={`${npc.world}:${npc.npcId}`}
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
          subtitle={`${t(`npcType.${npc.npcType}`)} · ${t("kills.level", { level: formatLevel(npc.npcLvl, npc.npcProf) })} · ${upperFirst(npc.world)}`}
          value={npc.totalKills}
        />
      ))}
    </StatsLeaderboardSection>
  );
}
