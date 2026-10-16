import { maxBy, upperFirst } from "es-toolkit";
import { Crown, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KillStatsOverview } from "@/components/common/kill-analytics/kill-stats-overview";
import { BandSection } from "@/components/common/band-section";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { getKillShift } from "@/components/common/kill-analytics/kill-shift";
import { KillAnalyticsTrend } from "@/components/common/kill-analytics/kill-analytics-trend";
import {
  formatIsoWeekday,
  formatStatisticsWeekdayDate,
} from "@/components/common/kill-analytics/format-statistics-date";
import { NpcTile } from "@/components/tiles/npc-tile";
import { TRACKABLE_NPC_TYPES } from "@/features/user/kills/npc-types";
import { useNavigate } from "@tanstack/react-router";
import type { StatisticsTabProps } from "./statistics-content";
import { toNpcType } from "./statistics-filters";
import { StatisticsDelta } from "./statistics-delta";
import { StatisticsTopNpcs } from "./statistics-top-npcs";
import { StatisticsTopLegends } from "./statistics-top-legends";
import { StatisticsWorldsSection } from "./statistics-worlds-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

const numberFormatter = new Intl.NumberFormat("pl-PL");

export function StatisticsOverview({ data, search }: StatisticsTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/@me/statistics" });
  const { overview, comparison } = data;
  const favourite = data.npcs[0];
  const bestDay = data.records.bestDay;
  const peak = maxBy(data.hourlyWeekday, (cell) => cell.kills);

  // The records come from the same kills, so they show together or not at all.
  const hasRecords = favourite && bestDay && peak && peak.kills > 0;
  const shift = getKillShift(peak?.hour ?? 0);

  return (
    <>
      <KillStatsOverview
        total={overview.totalKills}
        totalDetail={
          <span className="flex flex-wrap items-center gap-1">
            <StatisticsDelta
              delta={comparison.deltaKills}
              percent={comparison.deltaPercent}
            />
            {t("statistics.versusPrevious", { days: search.days })}
          </span>
        }
        types={TRACKABLE_NPC_TYPES.flatMap((type) => {
          const kills =
            data.types.find((entry) => entry.npcType === type)?.totalKills ?? 0;

          // Few players hunt Elite III, so its tile shows only once they do.
          return type === "ELITE3" && kills === 0 ? [] : [{ type, kills }];
        })}
        onSelectType={(type) =>
          void navigate({
            search: (current) => ({
              ...current,
              tab: "monsters",
              npcType: toNpcType(type),
            }),
          })
        }
      />
      {hasRecords && (
        <BandSection
          id="statistics-records"
          title={t("kills.records.title")}
          tiled
        >
          <StatsTileGrid className="sm:grid-cols-2 xl:grid-cols-4">
            <StatsTile
              media={
                favourite.npcIcon ? (
                  <span className="w-10 shrink-0">
                    <NpcTile
                      npc={{
                        id: favourite.npcId,
                        name: favourite.npcName,
                        lvl: favourite.npcLvl,
                        icon: favourite.npcIcon,
                      }}
                    />
                  </span>
                ) : undefined
              }
              icon={Crown}
              label={t("statistics.favouriteNpc")}
              value={favourite.npcName}
              detail={`${t("statistics.count", { count: favourite.totalKills })} · ${upperFirst(favourite.world)}`}
            />
            <StatsTile
              icon={Crown}
              label={t("kills.records.bestDay")}
              value={numberFormatter.format(bestDay.kills)}
              detail={formatStatisticsWeekdayDate(bestDay.startDate)}
            />
            <StatsTile
              icon={Zap}
              label={t("kills.records.streak")}
              value={t("statistics.days", { count: overview.currentStreak })}
              detail={t("statistics.longestStreakDetail", {
                count: overview.longestStreak,
              })}
            />
            <StatsTile
              icon={shift.icon}
              label={t("statistics.peakTime")}
              value={`${formatIsoWeekday(peak.weekday, true)} ${peak.hour}:00`}
              detail={t(`kills.records.shift.${shift.key}`)}
            />
          </StatsTileGrid>
        </BandSection>
      )}
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <KillAnalyticsTrend title={t("statistics.daily")} data={data.daily} />
        <StatisticsWorldsSection worlds={data.worlds} search={search} />
      </StatsSectionColumns>
      <StatsSectionColumns className="xl:grid-cols-2">
        <StatisticsTopNpcs npcs={data.npcs} search={search} />
        <StatisticsTopLegends search={search} />
      </StatsSectionColumns>
    </>
  );
}
