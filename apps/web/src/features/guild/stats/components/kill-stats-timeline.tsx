import type { GuildKillStatsResponseDtoOutputTimeline } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { ChartCard } from "@/components/common/chart-card";
import { KillAnalyticsTrend } from "@/components/common/kill-analytics/kill-analytics-trend";

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
      <ChartCard title={title} isLoading>
        {null}
      </ChartCard>
    );
  }

  if (!data) return null;

  if (data.points.every((point) => point.kills === 0)) {
    return (
      <ChartCard title={title} emptyMessage={t("statistics.noData")}>
        {null}
      </ChartCard>
    );
  }

  return (
    <KillAnalyticsTrend
      title={title}
      granularity={data.unit}
      data={data.points}
    />
  );
};
