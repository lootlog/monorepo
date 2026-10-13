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
import { KillAnalyticsTrendSkeleton } from "./kill-analytics-trend-skeleton";

const METRICS = [
  { key: "total", icon: Skull },
  { key: "activeDays", icon: CalendarCheck },
  { key: "average", icon: Gauge },
  { key: "uniqueNpcs", icon: Ghost },
] as const;

const COMPARISON = [
  { key: "current", icon: TrendingUp },
  { key: "previous", icon: History },
  { key: "change", icon: Gauge },
] as const;

const RECORDS = [
  { key: "bestDay", icon: CalendarCheck },
  { key: "bestWeek", icon: CalendarRange },
  { key: "bestMonth", icon: CalendarDays },
] as const;

/** StatisticsOverview's layout with its static labels, while the numbers load. */
export function StatisticsOverviewSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" aria-label={t("common.loading")} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map(({ key, icon }) => (
          <KpiCard
            key={key}
            icon={icon}
            label={t(`statistics.${key}`)}
            value={null}
            isLoading
          />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <KillAnalyticsTrendSkeleton title={t("statistics.daily")} />
        <KillAnalyticsTrendSkeleton title={t("statistics.weekly")} />
      </div>
      <div className="space-y-2">
        <div className="px-1">
          <p className="text-sm font-semibold">{t("statistics.comparison")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("statistics.alignedComparison")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {COMPARISON.map(({ key, icon }) => (
            <KpiCard
              key={key}
              icon={icon}
              label={t(`statistics.${key}`)}
              value={null}
              isLoading
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="px-1 text-sm font-semibold">{t("statistics.records")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {RECORDS.map(({ key, icon }) => (
            <KpiCard
              key={key}
              icon={icon}
              label={t(`statistics.${key}`)}
              value={null}
              isLoading
            />
          ))}
        </div>
      </div>
    </div>
  );
}
