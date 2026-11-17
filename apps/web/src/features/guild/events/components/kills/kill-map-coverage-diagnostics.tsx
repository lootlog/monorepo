import type { TFunction } from "i18next";
import { cn } from "cn";
import {
  COVERAGE_SEGMENT_TEXT_CLASS_NAMES,
  getMapCoverageColorClassName,
} from "../../utils/get-map-coverage-color-class-name";
import type { KillMapTimelineDiagnostics } from "../../utils/kill-map-timeline-data";
import { formatDuration } from "@/utils/date/format-duration";

interface KillMapCoverageDiagnosticsProps {
  diagnostics: KillMapTimelineDiagnostics;
  t: TFunction;
}

export const KillMapCoverageDiagnostics = ({
  diagnostics,
  t,
}: KillMapCoverageDiagnosticsProps) => {
  const metrics = [
    {
      label: t("events.killDetail.mapCoverage.covered"),
      duration: formatDuration(diagnostics.coveredSeconds, "human"),
      detail: `${diagnostics.coveragePercent}%`,
      colorClassName: COVERAGE_SEGMENT_TEXT_CLASS_NAMES.COVERED,
      detailColorClassName: getMapCoverageColorClassName(
        diagnostics.coveragePercent,
      ),
    },
    {
      label: t("events.killDetail.mapCoverage.uncovered"),
      duration: formatDuration(diagnostics.uncoveredSeconds, "human"),
      detail: t("events.killDetail.mapCoverage.gapCount", {
        count: diagnostics.uncoveredCount,
      }),
      colorClassName: COVERAGE_SEGMENT_TEXT_CLASS_NAMES.UNCOVERED,
      detailColorClassName: "text-muted-foreground",
    },
    {
      label: t("events.killDetail.mapCoverage.unassigned"),
      duration: formatDuration(diagnostics.unassignedSeconds, "human"),
      detail: t("events.killDetail.mapCoverage.gapCount", {
        count: diagnostics.unassignedCount,
      }),
      colorClassName: COVERAGE_SEGMENT_TEXT_CLASS_NAMES.UNASSIGNED,
      detailColorClassName: "text-muted-foreground",
    },
  ];

  return (
    <dl className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="min-w-0 px-2.5 py-2.5 sm:px-3"
          aria-label={t("events.killDetail.mapCoverage.metricAccessible", {
            label: metric.label,
            duration: metric.duration,
            detail: metric.detail,
          })}
        >
          <dt className="truncate text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </dt>
          <dd className="mt-1 min-w-0 tabular-nums">
            <span
              className={cn(
                "block truncate text-sm font-semibold leading-none",
                metric.colorClassName,
              )}
            >
              {metric.duration}
            </span>
            <span
              className={cn(
                "mt-1 block truncate text-2xs font-medium leading-none",
                metric.detailColorClassName,
              )}
            >
              {metric.detail}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
};
