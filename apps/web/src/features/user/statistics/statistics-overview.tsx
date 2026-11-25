import { maxBy, upperFirst } from "es-toolkit";
import { Crown, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KillStatsOverview } from "@/components/common/kill-analytics/kill-stats-overview";
import { BandSection } from "@lootlog/ui/components/band-section";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { getKillShift } from "@/components/common/kill-analytics/kill-shift";
import { KillAnalyticsTrend } from "@/components/common/kill-analytics/kill-analytics-trend";
import {
  formatIsoWeekday,
  formatStatisticsWeekdayDate,
} from "@/components/common/kill-analytics/format-statistics-date";
import { NpcTile } from "@/components/tiles/npc-tile";
import { TRACKABLE_NPC_TYPES } from "@lootlog/domain/npc-type";
import { useNavigate } from "@tanstack/react-router";
import type { StatisticsTabProps } from "./statistics-content";
import { toNpcType } from "./statistics-search";
import { StatisticsDelta } from "./statistics-delta";
import { StatisticsTopNpcs } from "./statistics-top-npcs";
import { StatisticsTopLegends } from "./statistics-top-legends";
import { StatisticsWorldsSection } from "./statistics-worlds-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { formatNumber } from "@lootlog/domain/locale";

export function StatisticsOverview({ data, search }: StatisticsTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/@me/statistics" });
  const { overview, comparison } = data;
  const favourite = data.npcs[0];
  const bestDay = data.records.bestDay;
  const peak = maxBy(data.hourlyWeekday, (cell) => cell.kills);

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
              value={formatNumber(bestDay.kills)}
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
              label={t(`kills.records.shift.${shift.key}`)}
              value={`${formatIsoWeekday(peak.weekday, true)} ${peak.hour}:00`}
              detail={t("kills.records.peakDetail", { count: peak.kills })}
            />
          </StatsTileGrid>
        </BandSection>
      )}
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <KillAnalyticsTrend title={t("statistics.daily")} data={data.daily} />
        <StatisticsWorldsSection worlds={data.worlds} search={search} />
      </StatsSectionColumns>
      <StatsSectionColumns fill className="xl:grid-cols-2">
        <StatisticsTopNpcs npcs={data.npcs} search={search} />
        <StatisticsTopLegends search={search} />
      </StatsSectionColumns>
    </>
  );
}
