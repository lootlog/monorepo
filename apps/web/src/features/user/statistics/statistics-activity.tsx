import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ActivityHeatmap } from "@/components/common/activity-heatmap/activity-heatmap";
import { KpiCard } from "@/components/common/kpi-card";
import { Flame, Trophy } from "lucide-react";
import { WeeklyActivityHeatmap } from "@/components/common/activity-heatmap/weekly-activity-heatmap";
import { formatIsoWeekday } from "@/components/common/kill-analytics/format-statistics-date";
import { summarizeActivityDistributions } from "@/components/common/kill-analytics/summarize-activity-distributions";
import { StatisticsDistribution } from "./statistics-distribution";

export function StatisticsActivity({
  data,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
}) {
  const { t } = useTranslation();
  const distributions = summarizeActivityDistributions(data.hourlyWeekday);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={Flame}
          label={t("statistics.currentStreak")}
          value={t("statistics.days", { count: data.overview.currentStreak })}
        />
        <KpiCard
          icon={Trophy}
          label={t("statistics.longestStreak")}
          value={t("statistics.days", { count: data.overview.longestStreak })}
        />
      </div>
      <SectionCard>
        <SectionCardHeader title={t("statistics.activity")} />
        <SectionCardContent>
          <ActivityHeatmap
            days={data.daily.map((day) => ({
              date: day.date,
              value: day.kills,
              partial: day.partial,
            }))}
            label={t("statistics.activity")}
            formatValue={(value) => t("statistics.count", { count: value })}
          />
        </SectionCardContent>
      </SectionCard>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <StatisticsDistribution
          title={t("statistics.hourlyDistribution")}
          rows={distributions.hourly.map(({ hour, kills }) => ({
            label: `${String(hour).padStart(2, "0")}:00`,
            kills,
          }))}
        />
        <StatisticsDistribution
          title={t("statistics.weekdayDistribution")}
          rows={distributions.weekdays.map(({ weekday, kills }) => ({
            label: formatIsoWeekday(weekday),
            kills,
          }))}
        />
      </div>
      <SectionCard>
        <SectionCardHeader
          title={t("statistics.hours")}
          description={t("statistics.polishTime")}
        />
        <SectionCardContent>
          <WeeklyActivityHeatmap
            cells={data.hourlyWeekday}
            label={t("statistics.hours")}
          />
        </SectionCardContent>
      </SectionCard>
    </>
  );
}
