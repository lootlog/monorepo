import { useTranslation } from "react-i18next";
import { CalendarClock, Clock, Gauge, Swords } from "lucide-react";
import { formatStatisticsWeekdayDate } from "@/components/common/kill-analytics/format-statistics-date";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { EMPTY_VALUE } from "@/constants/empty-value";
import type { summarizePlayTime } from "./summarize-play-time";

const rateFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

type StatisticsPlayTimeTilesProps = {
  playTime: ReturnType<typeof summarizePlayTime>;
  /** False until online history loads, or when there is none. */
  available: boolean;
  /** Online time covers the whole account, so a world has no kill rate. */
  world: string | undefined;
  /** Names the shorter window online history covers, if it is shorter. */
  coverage?: string;
  formatDuration: (seconds: number) => string;
};

export function StatisticsPlayTimeTiles({
  playTime,
  available,
  world,
  coverage,
  formatDuration,
}: StatisticsPlayTimeTilesProps) {
  const { t } = useTranslation();

  const show = (seconds: number | null | undefined) =>
    available && seconds !== null && seconds !== undefined
      ? formatDuration(seconds)
      : EMPTY_VALUE;

  return (
    <StatsTileGrid className="sm:grid-cols-2 xl:grid-cols-4">
      <StatsTile
        icon={Clock}
        label={t("statistics.onlineTotal")}
        value={show(playTime.totalSeconds)}
        detail={coverage ?? t("statistics.wholeAccount")}
      />
      <StatsTile
        icon={CalendarClock}
        label={t("statistics.onlinePerDay")}
        value={show(playTime.averageSeconds)}
        detail={t("statistics.playedDays", { count: playTime.playedDays })}
      />
      <StatsTile
        icon={Swords}
        label={t("statistics.killsPerHour")}
        value={
          available && !world && playTime.killsPerHour !== null
            ? rateFormatter.format(playTime.killsPerHour)
            : EMPTY_VALUE
        }
        detail={
          world
            ? t("statistics.killsPerHourAllWorlds")
            : t("statistics.killsPerHourDetail")
        }
      />
      <StatsTile
        icon={Gauge}
        label={t("statistics.longestOnline")}
        value={show(playTime.longest?.seconds)}
        detail={
          playTime.longest && formatStatisticsWeekdayDate(playTime.longest.date)
        }
      />
    </StatsTileGrid>
  );
}
