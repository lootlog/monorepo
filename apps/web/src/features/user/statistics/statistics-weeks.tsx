import { useTranslation } from "react-i18next";
import { useKillsControllerGetUserKillActivity } from "@lootlog/client/main";
import { ChartSection } from "@/components/common/chart-section";
import { StatisticsDelta } from "./statistics-delta";
import { StatisticsWeekChart } from "./statistics-week-chart";
import { summarizeWeeks } from "./summarize-weeks";

/** This week next to the previous one, whatever period the page shows. */
type StatisticsWeeksProps = {
  world: string | undefined;
  characterId: string | undefined;
};

export function StatisticsWeeks({ world, characterId }: StatisticsWeeksProps) {
  const { t } = useTranslation();

  const activity = useKillsControllerGetUserKillActivity(
    { world, characterId },
    { query: { staleTime: 60_000 } },
  );

  const weeks = activity.data && summarizeWeeks(activity.data.daily);
  const delta = weeks ? weeks.currentKills - weeks.previousKills : 0;

  return (
    <ChartSection
      title={t("statistics.weeks")}
      description={
        weeks
          ? t("statistics.weeksSummary", { count: weeks.currentKills })
          : undefined
      }
      actions={
        weeks && (
          <StatisticsDelta
            delta={delta}
            percent={
              weeks.previousKills ? (delta / weeks.previousKills) * 100 : null
            }
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
