import { useTranslation } from "react-i18next";
import { useKillsControllerGetUserKillActivity } from "@lootlog/client/main";
import { ChartSection } from "@/components/common/chart-section";
import { StatisticsDelta } from "./statistics-delta";
import { StatisticsWeekChart } from "./statistics-week-chart";
import { summarizeWeeks } from "./summarize-weeks";

/** This week next to the previous one, whatever period the page shows. */
export function StatisticsWeeks({ world }: { world: string | undefined }) {
  const { t } = useTranslation();

  const activity = useKillsControllerGetUserKillActivity(
    { world },
    { query: { staleTime: 60_000 } },
  );

  const weeks = activity.data && summarizeWeeks(activity.data.daily);

  // Days without history leave the comparison open instead of counting zero.
  const totals =
    weeks && weeks.currentKills !== null && weeks.previousKills !== null
      ? { current: weeks.currentKills, previous: weeks.previousKills }
      : null;

  const delta = totals ? totals.current - totals.previous : 0;

  return (
    <ChartSection
      title={t("statistics.weeks")}
      description={
        totals
          ? t("statistics.weeksSummary", { count: totals.current })
          : weeks
            ? t("statistics.weeksIncomplete")
            : undefined
      }
      actions={
        totals && (
          <StatisticsDelta
            delta={delta}
            percent={totals.previous ? (delta / totals.previous) * 100 : null}
          />
        )
      }
      isLoading={activity.isPending}
      emptyMessage={activity.isError ? t("statistics.loadError") : undefined}
    >
      {weeks && <StatisticsWeekChart days={weeks.days} />}
    </ChartSection>
  );
}
