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
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
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

  // Without collection there is no time to show, only an unknown.
  const known = data !== undefined && data.status !== "unavailable";

  return {
    seconds: known
      ? data.days.find((day) => day.date === today)?.onlineSeconds
      : null,
    average: known && played.length ? sum(played) / played.length : null,
    isOnlineNow:
      data?.status === "fresh" &&
      now - Date.parse(lastObservedAt ?? "") < ONLINE_NOW_MS,
    isStale: data?.status === "stale",
  };
};

/**
 * This week's kills, or `null` when they are unknown: not loaded, failed, or
 * outside the history Lootlog has. A day the API cannot count stays unknown
 * rather than zero.
 */
const summarizeWeek = (
  data: UserKillAnalyticsResponseDtoOutput | undefined,
  today: string,
) => {
  if (data === undefined || data.meta.coverage === "unavailable") return null;

  return {
    todayKills: data.daily.find((day) => day.date === today)?.kills ?? null,
    average: data.overview.averagePerDay ?? 0,
    favourite: data.npcs[0],
    streak: data.overview.currentStreak,
    longestStreak: data.overview.longestStreak,
  };
};

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

  const summary = summarizeWeek(week.data, range.to);
  const favourite = summary?.favourite;

  const {
    seconds: todayOnline,
    average: averageOnline,
    isOnlineNow,
    isStale,
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

  const loading = (value: string | undefined) =>
    week.isPending ? (
      <Skeleton className="my-0.5 h-6 w-16" />
    ) : (
      (value ?? EMPTY_VALUE)
    );

  const failed = [
    { query: week, message: t("statistics.loadError") },
    { query: online, message: t("statistics.today.onlineError") },
  ].filter(({ query }) => query.isError);

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
          value={loading(
            summary?.todayKills === null || summary === null
              ? undefined
              : numberFormatter.format(summary.todayKills),
          )}
          detail={
            summary &&
            summary.todayKills !== null && (
              <span className="flex items-center gap-1">
                <StatisticsDelta
                  delta={Math.round(summary.todayKills - summary.average)}
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
            isStale ? (
              <span className="text-signal-timer">
                {t("statistics.today.onlineStale")}
              </span>
            ) : isOnlineNow ? (
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
            summary
              ? t("statistics.days", { count: summary.streak })
              : undefined,
          )}
          detail={
            summary &&
            t("statistics.longestStreakDetail", {
              count: summary.longestStreak,
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
          value={loading(favourite?.npcName)}
          detail={
            favourite && t("statistics.count", { count: favourite.totalKills })
          }
        />
      </StatsTileGrid>
      {/* The tiles keep the last good values, or show them as unknown. */}
      {failed.map(({ query, message }) => (
        <QueryErrorNotice
          key={message}
          message={message}
          detail={query.data === undefined ? undefined : t("statistics.stale")}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
          className={LIST_TILE_RULE_CLASS}
        />
      ))}
    </BandSection>
  );
}
