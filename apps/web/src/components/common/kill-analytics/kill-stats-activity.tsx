import { WeeklyActivityHeatmap } from "@/components/common/activity-heatmap/weekly-activity-heatmap";
import { formatIsoWeekday } from "@/components/common/kill-analytics/format-statistics-date";
import { summarizeActivityDistributions } from "@/components/common/kill-analytics/summarize-activity-distributions";
import { BandSection } from "@/components/common/band-section";
import type { GuildKillStatsResponseDtoOutputHourlyWeekdayItem } from "@lootlog/client/main";
import { maxBy } from "es-toolkit";
import { useId } from "react";
import { useTranslation } from "react-i18next";

type KillStatsActivityProps = {
  cells: GuildKillStatsResponseDtoOutputHourlyWeekdayItem[];
  /** Defaults to the Organization's "Kiedy bijecie". */
  title?: string;
};

/** When kills happen: the weekday and hour rhythm in Polish time. */
export const KillStatsActivity = ({ cells, title }: KillStatsActivityProps) => {
  const { t } = useTranslation();
  const heading = title ?? t("kills.activity.title");
  const id = useId();
  const { hourly, weekdays } = summarizeActivityDistributions(cells);
  const topHour = maxBy(hourly, (entry) => entry.kills);
  const topWeekday = maxBy(weekdays, (entry) => entry.kills);

  return (
    <BandSection
      id={id}
      title={heading}
      description={t("kills.activity.summary", {
        weekday: formatIsoWeekday(topWeekday?.weekday ?? 1),
        hour: `${topHour?.hour ?? 0}:00`,
      })}
      wide
    >
      <WeeklyActivityHeatmap cells={cells} label={heading} />
    </BandSection>
  );
};
