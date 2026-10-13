import { WeeklyActivityHeatmap } from "@/components/common/activity-heatmap/weekly-activity-heatmap";
import { formatIsoWeekday } from "@/components/common/kill-analytics/format-statistics-date";
import { summarizeActivityDistributions } from "@/components/common/kill-analytics/summarize-activity-distributions";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import type { GuildKillStatsResponseDtoOutputHourlyWeekdayItem } from "@lootlog/client/main";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { maxBy } from "es-toolkit";
import { useTranslation } from "react-i18next";

type KillStatsActivityProps = {
  cells: GuildKillStatsResponseDtoOutputHourlyWeekdayItem[];
  className?: string;
};

/** When the Organization kills: its weekday and hour rhythm in Polish time. */
export const KillStatsActivity = ({
  cells,
  className,
}: KillStatsActivityProps) => {
  const { t } = useTranslation();
  const { hourly, weekdays } = summarizeActivityDistributions(cells);
  const topHour = maxBy(hourly, (entry) => entry.kills);
  const topWeekday = maxBy(weekdays, (entry) => entry.kills);

  return (
    <SectionCard className={className}>
      <SectionCardHeader
        title={t("kills.activity.title")}
        description={t("kills.activity.summary", {
          weekday: formatIsoWeekday(topWeekday?.weekday ?? 1),
          hour: `${topHour?.hour ?? 0}:00`,
        })}
      />
      <SectionCardContent>
        <WeeklyActivityHeatmap
          cells={cells}
          label={t("kills.activity.title")}
        />
      </SectionCardContent>
    </SectionCard>
  );
};
