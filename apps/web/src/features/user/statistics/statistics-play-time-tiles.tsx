import { upperFirst } from "es-toolkit";
import { useTranslation } from "react-i18next";
import { CalendarClock, Clock, Gauge, Swords } from "lucide-react";
import { formatStatisticsWeekdayDate } from "@/components/common/kill-analytics/format-statistics-date";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { EMPTY_VALUE } from "@/constants/empty-value";
import type { summarizePlayTime } from "./summarize-play-time";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

const rateFormatter = new Intl.NumberFormat(PRODUCT_LOCALE, {
  maximumFractionDigits: 1,
});

type StatisticsPlayTimeTilesProps = {
  playTime: ReturnType<typeof summarizePlayTime>;
  available: boolean;
  world?: string;
  characterSelected: boolean;
  formatDuration: (seconds: number) => string;
};

export function StatisticsPlayTimeTiles({
  playTime,
  available,
  world,
  characterSelected,
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
        detail={world ? upperFirst(world) : t("statistics.wholeAccount")}
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
          available && !characterSelected && playTime.killsPerHour !== null
            ? rateFormatter.format(playTime.killsPerHour)
            : EMPTY_VALUE
        }
        detail={
          characterSelected
            ? t("statistics.killsPerHourNoCharacter")
            : world
              ? upperFirst(world)
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
