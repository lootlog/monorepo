import { createCachedFormatter } from "@lootlog/datetime";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Gauge,
  Ghost,
  History,
  Skull,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { KpiCard } from "@/components/common/kpi-card";
import { KillAnalyticsTrend } from "./kill-analytics-trend";
import { formatStatisticsDateRange } from "./format-statistics-date";
import { EMPTY_VALUE } from "@/constants/empty-value";

const getOverviewDateFormatter = createCachedFormatter("pl-PL", {});

const countFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

const deltaFormatter = new Intl.NumberFormat("pl-PL", {
  signDisplay: "exceptZero",
});

const percentFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const RECORDS = [
  { key: "bestDay", icon: CalendarCheck },
  { key: "bestWeek", icon: CalendarRange },
  { key: "bestMonth", icon: CalendarDays },
] as const;

export function StatisticsOverview({
  data,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
}) {
  const { t } = useTranslation();
  const dateFormatter = getOverviewDateFormatter(data.meta.timezone);
  const previousStart = new Date(data.meta.startDate);
  previousStart.setUTCDate(previousStart.getUTCDate() - data.meta.days);

  const { overview, comparison } = data;

  const metrics = [
    { key: "total", icon: Skull, value: overview.totalKills },
    { key: "activeDays", icon: CalendarCheck, value: overview.activeDays },
    {
      key: "average",
      icon: Gauge,
      value: overview.activeDays
        ? overview.totalKills / overview.activeDays
        : null,
    },
    { key: "uniqueNpcs", icon: Ghost, value: overview.uniqueNpcs },
  ] as const;

  return (
    <>
      <section aria-labelledby="statistics-overview-title">
        <h2 id="statistics-overview-title" className="sr-only">
          {t("statistics.overview")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ key, icon, value }) => (
            <KpiCard
              key={key}
              icon={icon}
              label={t(`statistics.${key}`)}
              value={
                value === null ? EMPTY_VALUE : countFormatter.format(value)
              }
            />
          ))}
        </div>
      </section>
      <div className="grid gap-3 xl:grid-cols-2">
        <KillAnalyticsTrend title={t("statistics.daily")} data={data.daily} />
        <KillAnalyticsTrend
          title={t("statistics.weekly")}
          data={data.weekly.map((week) => ({
            date: week.startDate,
            kills: week.kills,
            partial: week.partial,
          }))}
        />
      </div>
      <section
        aria-labelledby="statistics-comparison-title"
        className="space-y-2"
      >
        <div className="px-1">
          <h2
            id="statistics-comparison-title"
            className="text-sm font-semibold"
          >
            {t("statistics.comparison")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("statistics.alignedComparison")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            icon={TrendingUp}
            label={t("statistics.current")}
            value={countFormatter.format(comparison.currentKills)}
            detail={`${dateFormatter.format(new Date(data.meta.startDate))} – ${dateFormatter.format(new Date(comparison.currentThrough))}`}
          />
          <KpiCard
            icon={History}
            label={t("statistics.previous")}
            value={countFormatter.format(comparison.previousKills)}
            detail={`${dateFormatter.format(previousStart)} – ${dateFormatter.format(new Date(comparison.previousThrough))}`}
          />
          <KpiCard
            icon={Gauge}
            label={t("statistics.change")}
            value={deltaFormatter.format(comparison.deltaKills)}
            detail={
              comparison.deltaPercent === null
                ? undefined
                : percentFormatter.format(comparison.deltaPercent / 100)
            }
          />
        </div>
      </section>
      <section aria-labelledby="statistics-records-title" className="space-y-2">
        <h2
          id="statistics-records-title"
          className="px-1 text-sm font-semibold"
        >
          {t("statistics.records")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {RECORDS.map(({ key, icon }) => {
            const record = data.records[key];

            return (
              <KpiCard
                key={key}
                icon={icon}
                label={t(`statistics.${key}`)}
                value={
                  record ? countFormatter.format(record.kills) : EMPTY_VALUE
                }
                detail={
                  record &&
                  `${formatStatisticsDateRange(record.startDate, record.endDate)}${record.partial ? ` · ${t("statistics.partial")}` : ""}`
                }
              />
            );
          })}
        </div>
      </section>
    </>
  );
}
