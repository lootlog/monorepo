import { upperFirst } from "es-toolkit";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import { NpcTile } from "@/components/tiles/npc-tile";
import type { StatisticsRanking, StatisticsSearch } from "./statistics-search";

/** Rows of each monster preview on the overview. */
const PREVIEW_SIZE = 5;

type StatisticsTopNpcsProps = {
  ranking: StatisticsRanking;
  npcs: UserKillAnalyticsResponseDtoOutput["npcs"];
  search: StatisticsSearch;
};

/** The first monsters of a ranking, opening the whole ranking from its heading. */
export function StatisticsTopNpcs({
  ranking,
  npcs,
  search,
}: StatisticsTopNpcsProps) {
  const { t } = useTranslation();
  const top = npcs.slice(0, PREVIEW_SIZE);
  const gains = ranking === "gains";

  const value = (npc: (typeof top)[number]) =>
    gains ? npc.deltaKills : npc.totalKills;

  return (
    <StatsLeaderboardSection
      title={t(`statistics.rankings.${ranking}`)}
      emptyMessage={
        top.length
          ? undefined
          : t(gains ? "statistics.noGains" : "statistics.noData")
      }
      actions={
        <ChevronLink
          render=<Link
            to="/@me/statistics"
            search={{
              ...search,
              tab: "monsters",
              ranking: gains ? "gains" : undefined,
            }}
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
          value={value(npc)}
          maxValue={top[0] ? value(top[0]) : 0}
        />
      ))}
    </StatsLeaderboardSection>
  );
}
