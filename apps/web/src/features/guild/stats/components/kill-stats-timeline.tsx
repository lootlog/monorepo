import type { GuildKillStatsResponseDtoOutputTimeline } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";
import { KillAnalyticsTrend } from "@/components/common/kill-analytics/kill-analytics-trend";
import { formatStatisticsDate } from "@/components/common/kill-analytics/format-statistics-date";

const numberFormatter = new Intl.NumberFormat("pl-PL");

type KillStatsTimelineProps = {
  data?: GuildKillStatsResponseDtoOutputTimeline;
  isLoading?: boolean;
};

export const KillStatsTimeline = ({
  data,
  isLoading = false,
}: KillStatsTimelineProps) => {
  const { t } = useTranslation();

  const title =
    data?.unit === "hour" ? t("statistics.hourly") : t("statistics.daily");

  if (isLoading) {
    return (
      <ChartSection title={title} isLoading>
        {null}
      </ChartSection>
    );
  }

  if (!data) return null;

  if (data.points.every((point) => point.kills === 0)) {
    return (
      <ChartSection title={title} emptyMessage={t("statistics.noData")}>
        {null}
      </ChartSection>
    );
  }

  // All-time totals include kills from before hourly history began.
  const firstDate = data.points[0]?.date;

  const description =
    data.untimedKills > 0 && firstDate
      ? t("kills.timeline.untimed", {
          date: formatStatisticsDate(firstDate),
          kills: numberFormatter.format(data.untimedKills),
        })
      : undefined;

  return (
    <KillAnalyticsTrend
      title={title}
      description={description}
      granularity={data.unit}
      data={data.points}
    />
  );
};
