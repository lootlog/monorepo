import { SectionCard } from "@/components/common/section-card/section-card";
import {
  formatIsoWeekday,
  formatStatisticsDateHour,
  formatStatisticsWeekdayDate,
} from "@/components/common/kill-analytics/format-statistics-date";
import type { GuildKillStatsResponseDtoOutput } from "@lootlog/client/main";
import { Crown, Moon, Sun, Sunrise, Sunset, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { summarizeKillRecords } from "../utils/summarize-kill-records";
import { KillStatsRecord } from "./kill-stats-record";

const numberFormatter = new Intl.NumberFormat("pl-PL");

const SHIFTS = [
  { until: 6, key: "night", icon: Moon },
  { until: 12, key: "morning", icon: Sunrise },
  { until: 18, key: "afternoon", icon: Sun },
  { until: 24, key: "evening", icon: Sunset },
] as const;

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
  const shift = SHIFTS.find((entry) => peak.hour < entry.until) ?? SHIFTS[3];

  return (
    <SectionCard
      role="region"
      aria-label={t("kills.records.title")}
      className="grid divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0 xl:grid-cols-1 xl:grid-rows-3 xl:divide-x-0 xl:divide-y"
    >
      <KillStatsRecord
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
      <KillStatsRecord
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
      <KillStatsRecord
        icon={shift.icon}
        label={t(`kills.records.shift.${shift.key}`)}
        value={`${formatIsoWeekday(peak.weekday, true)} ${peak.hour}:00`}
        detail={t("kills.records.peakDetail", { count: peak.kills })}
      />
    </SectionCard>
  );
};
