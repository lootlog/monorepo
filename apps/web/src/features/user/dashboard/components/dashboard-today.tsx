import { Link } from "@tanstack/react-router";
import { sum } from "es-toolkit";
import { Clock, Crown, Swords, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  useKillsControllerGetUserKillAnalytics,
  type UserKillAnalyticsResponseDtoOutput,
} from "@lootlog/client/main";
import {
  useUsersActivityControllerGetOnline,
  type UserOnlineResponseDto,
} from "@lootlog/client/activity";
import { BandSection } from "@/components/common/band-section";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { calendarRange } from "@/components/common/activity-heatmap/activity-calendar";
import { NpcTile } from "@/components/tiles/npc-tile";
import { EMPTY_VALUE } from "@/constants/empty-value";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { StatisticsDelta } from "@/features/user/statistics/statistics-delta";

const numberFormatter = new Intl.NumberFormat("pl-PL");

// The game client reports presence about once a minute.
const ONLINE_NOW_MS = 5 * 60_000;

/**
 * Today's time in game, the average day in game this week, and whether the
 * game client reported in just now.
 */
const summarizeOnline = (
  data: UserOnlineResponseDto | undefined,
  today: string,
  now: number,
) => {
  const lastObservedAt = data?.lastObservedAt;

  const played = (data?.days ?? []).flatMap((day) =>
    day.onlineSeconds ? [day.onlineSeconds] : [],
  );

  return {
    seconds: data?.days.find((day) => day.date === today)?.onlineSeconds,
    average: played.length ? sum(played) / played.length : null,
    isOnlineNow:
      data?.status === "fresh" &&
      now - Date.parse(lastObservedAt ?? "") < ONLINE_NOW_MS,
  };
};

const summarizeWeek = (
  data: UserKillAnalyticsResponseDtoOutput | undefined,
  today: string,
) => ({
  todayKills: data?.daily.find((day) => day.date === today)?.kills ?? 0,
  average: data?.overview.averagePerDay ?? 0,
  favourite: data?.npcs[0],
  streak: data?.overview.currentStreak ?? 0,
});

/** Today's play next to the week: kills, time in game, streak and the week's monster. */
export function DashboardToday() {
  const { t } = useTranslation();
  const now = useMinuteTimestamp();
  const range = calendarRange(new Date(now), 7);

  const week = useKillsControllerGetUserKillAnalytics(
    { days: "7" },
    { query: { staleTime: 60_000 } },
  );

  const online = useUsersActivityControllerGetOnline(range, {
    query: { staleTime: 60_000 },
  });

  const { todayKills, average, favourite, streak } = summarizeWeek(
    week.data,
    range.to,
  );

  const {
    seconds: todayOnline,
    average: averageOnline,
    isOnlineNow,
  } = summarizeOnline(online.data, range.to, now);

  const formatOnline = (seconds: number | null | undefined) =>
    seconds === null || seconds === undefined
      ? EMPTY_VALUE
      : seconds < 3600
        ? t("statistics.today.minutes", { minutes: Math.floor(seconds / 60) })
        : t("statistics.today.duration", {
            hours: Math.floor(seconds / 3600),
            minutes: Math.floor((seconds % 3600) / 60),
          });

  const loading = (value: string) =>
    week.isPending ? <Skeleton className="my-0.5 h-6 w-16" /> : value;

  return (
    <BandSection
      id="dashboard-today"
      title={t("statistics.today.title")}
      tiled
      trailing={
        <ChevronLink
          render=<Link
            to="/@me/statistics"
            search={{ tab: "overview", days: 7 }}
          />
        >
          {t("statistics.title")}
        </ChevronLink>
      }
    >
      <StatsTileGrid className="grid-cols-2 xl:grid-cols-4">
        <StatsTile
          icon={Swords}
          label={t("statistics.today.kills")}
          value={loading(numberFormatter.format(todayKills))}
          detail={
            week.data && (
              <span className="flex items-center gap-1">
                <StatisticsDelta
                  delta={Math.round(todayKills - average)}
                  percent={null}
                />
                {t("statistics.today.versusAverage")}
              </span>
            )
          }
        />
        <StatsTile
          icon={Clock}
          label={t("statistics.today.online")}
          value={
            online.isPending ? (
              <Skeleton className="my-0.5 h-6 w-20" />
            ) : (
              formatOnline(todayOnline)
            )
          }
          detail={
            isOnlineNow ? (
              <span className="flex items-center gap-1.5 text-signal-ready">
                <span className="size-1.5 rounded-full bg-current" />
                {t("statistics.today.onlineNow")}
              </span>
            ) : (
              averageOnline !== null &&
              t("statistics.today.averageOnline", {
                duration: formatOnline(averageOnline),
              })
            )
          }
        />
        <StatsTile
          icon={Zap}
          label={t("kills.records.streak")}
          value={loading(
            t("statistics.days", {
              count: streak,
            }),
          )}
          detail={
            week.data &&
            t("statistics.longestStreakDetail", {
              count: week.data.overview.longestStreak,
            })
          }
        />
        <StatsTile
          icon={Crown}
          media={
            favourite?.npcIcon ? (
              <span className="w-10 shrink-0">
                <NpcTile
                  npc={{
                    id: favourite.npcId,
                    name: favourite.npcName,
                    lvl: favourite.npcLvl,
                    icon: favourite.npcIcon,
                  }}
                />
              </span>
            ) : undefined
          }
          label={t("statistics.today.weekMonster")}
          value={loading(favourite?.npcName ?? EMPTY_VALUE)}
          detail={
            favourite && t("statistics.count", { count: favourite.totalKills })
          }
        />
      </StatsTileGrid>
    </BandSection>
  );
}
