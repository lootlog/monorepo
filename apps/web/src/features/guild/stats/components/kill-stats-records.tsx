import { BandSection } from "@/components/common/band-section";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import {
  formatIsoWeekday,
  formatStatisticsDateHour,
  formatStatisticsWeekdayDate,
} from "@/components/common/kill-analytics/format-statistics-date";
import type { GuildKillStatsResponseDtoOutput } from "@lootlog/client/main";
import { getKillShift } from "@/components/common/kill-analytics/kill-shift";
import { Crown, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { summarizeKillRecords } from "../utils/summarize-kill-records";

const numberFormatter = new Intl.NumberFormat("pl-PL");

type KillStatsRecordsProps = {
  data: Pick<GuildKillStatsResponseDtoOutput, "timeline" | "hourlyWeekday">;
};

/** The Organization's best moment, longest streak and busiest hour in the period. */
export const KillStatsRecords = ({ data }: KillStatsRecordsProps) => {
  const { t } = useTranslation();

  const records = summarizeKillRecords(
    data.timeline.points,
    data.hourlyWeekday,
  );

  if (!records) return null;

  const hourly = data.timeline.unit === "hour";
  const { best, longestStreak, peak } = records;
  const shift = getKillShift(peak.hour);

  return (
    <BandSection id="kill-stats-records" title={t("kills.records.title")} tiled>
      <StatsTileGrid className="sm:grid-cols-3">
        <StatsTile
          icon={Crown}
          label={
            hourly ? t("kills.records.bestHour") : t("kills.records.bestDay")
          }
          value={numberFormatter.format(best.kills)}
          detail={
            hourly
              ? formatStatisticsDateHour(best.date)
              : formatStatisticsWeekdayDate(best.date)
          }
        />
        <StatsTile
          icon={Zap}
          label={t("kills.records.streak")}
          value={
            hourly
              ? t("kills.records.hours", { count: longestStreak })
              : t("statistics.days", { count: longestStreak })
          }
          detail={
            hourly
              ? t("kills.records.streakHours")
              : t("kills.records.streakDays")
          }
        />
        <StatsTile
          icon={shift.icon}
          label={t(`kills.records.shift.${shift.key}`)}
          value={`${formatIsoWeekday(peak.weekday, true)} ${peak.hour}:00`}
          detail={t("kills.records.peakDetail", { count: peak.kills })}
        />
      </StatsTileGrid>
    </BandSection>
  );
};
