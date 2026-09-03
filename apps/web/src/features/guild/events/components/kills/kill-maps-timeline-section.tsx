import type { TFunction } from "i18next";
import { useParams } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useEventsMonitoringControllerGetKillTimelineData } from "@lootlog/client/main";
import { KillMapsTimelineTable } from "./kill-maps-timeline-table";

interface KillMapsTimelineSectionProps {
  eventId: string;
  heroId: string;
  killId: string;
  minSpawnTimeAtKill: string;
  killedAt: string;
  memberRoleColors: ReadonlyMap<number, string>;
  t: TFunction;
}

export const KillMapsTimelineSection = ({
  eventId,
  heroId,
  killId,
  minSpawnTimeAtKill,
  killedAt,
  memberRoleColors,
  t,
}: KillMapsTimelineSectionProps) => {
  const { guildId } = useParams({ strict: false });
  const { data: mapsTimeline, isLoading } =
    useEventsMonitoringControllerGetKillTimelineData({
      guildId: guildId ?? "",
      eventId,
      heroId,
      killId,
    });

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="space-y-2 p-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!mapsTimeline || mapsTimeline.length === 0) return null;

  const startTime = new Date(minSpawnTimeAtKill);
  const endTime = new Date(killedAt);
  const sortedMaps = [...mapsTimeline].sort((leftMap, rightMap) => {
    const gapCountDifference = rightMap.gaps.length - leftMap.gaps.length;
    if (gapCountDifference !== 0) return gapCountDifference;
    return leftMap.mapName.localeCompare(rightMap.mapName);
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Map className="size-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">
            {t("events.killDetail.mapCoverage.title")}
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("events.killDetail.mapCoverage.mapCount", {
              count: sortedMaps.length,
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            {t("events.killDetail.mapCoverage.covered")}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-amber-500" />
            {t("events.killDetail.mapCoverage.uncovered")}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-destructive" />
            {t("events.killDetail.mapCoverage.unassigned")}
          </span>
        </div>
      </div>

      <div className="border-t border-border/70">
        <KillMapsTimelineTable
          maps={sortedMaps}
          startTime={startTime}
          endTime={endTime}
          memberRoleColors={memberRoleColors}
          t={t}
        />
      </div>
    </section>
  );
};
