import { useTranslation } from "react-i18next";
import { useUsersActivityControllerGetOnline } from "@lootlog/client/activity";
import { ChartSection } from "@/components/common/chart-section";
import { KillStatsActivity } from "@/components/common/kill-analytics/kill-stats-activity";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import type { StatisticsTabProps } from "./statistics-content";
import { StatisticsPlayTimeChart } from "./statistics-play-time-chart";
import { StatisticsPlayTimeTiles } from "./statistics-play-time-tiles";
import { StatisticsWeeks } from "./statistics-weeks";
import { summarizePlayTime } from "./summarize-play-time";

/** How long the activity service keeps online history. */
const ONLINE_HISTORY_DAYS = 112;

/** The last `days` calendar days through `to`, as the online history takes them. */
const rangeEnding = (to: string, days: number) => {
  const from = new Date(`${to}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - days + 1);

  return { from: from.toISOString().slice(0, 10), to };
};

export function StatisticsActivity({ data, search }: StatisticsTabProps) {
  const { t } = useTranslation();

  const online = useUsersActivityControllerGetOnline(
    rangeEnding(data.meta.endDate, Math.min(search.days, ONLINE_HISTORY_DAYS)),
    { query: { staleTime: 60_000 } },
  );

  const formatDuration = (seconds: number) =>
    t("statistics.duration", {
      hours: Math.floor(seconds / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
    });

  const available =
    online.data !== undefined && online.data.status !== "unavailable";

  const days = online.data?.days ?? [];
  const playTime = summarizePlayTime(days, data.daily);
  const killsByDate = new Map(data.daily.map((day) => [day.date, day.kills]));

  return (
    <>
      <StatisticsPlayTimeTiles
        playTime={playTime}
        available={available}
        narrowed={Boolean(search.world || search.characterId)}
        coverage={
          search.days > ONLINE_HISTORY_DAYS
            ? t("statistics.onlineLastDays", { days: ONLINE_HISTORY_DAYS })
            : undefined
        }
        formatDuration={formatDuration}
      />
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <ChartSection
          title={t("statistics.onlineTitle")}
          description={
            online.data?.status === "stale"
              ? t("statistics.onlineStale")
              : undefined
          }
          isLoading={online.isPending}
          emptyMessage={
            online.isError
              ? t("statistics.loadError")
              : available && playTime.totalSeconds > 0
                ? undefined
                : t("statistics.onlineUnavailable")
          }
        >
          <StatisticsPlayTimeChart
            points={days.map((day) => ({
              date: day.date,
              seconds: day.onlineSeconds,
              kills: killsByDate.get(day.date) ?? null,
            }))}
            formatDuration={formatDuration}
          />
        </ChartSection>
        <KillStatsActivity
          cells={data.hourlyWeekday}
          title={t("statistics.whenYouKill")}
        />
      </StatsSectionColumns>
      <StatisticsWeeks world={search.world} characterId={search.characterId} />
    </>
  );
}
