import { Card } from "@lootlog/ui/components/card";
import { Accordion } from "@lootlog/ui/components/accordion";
import { Map } from "lucide-react";
import { KillMapTimelineCard } from "./kill-map-timeline-card";
import { useKillTimeline } from "../../hooks/queries/use-kill-timeline";
import type { TFunction } from "i18next";

interface KillMapsTimelineSectionProps {
  eventId: string;
  heroId: string;
  killId: string;
  minSpawnTimeAtKill: string;
  killedAt: string;
  t: TFunction;
}

export const KillMapsTimelineSection = ({
  eventId,
  heroId,
  killId,
  minSpawnTimeAtKill,
  killedAt,
  t,
}: KillMapsTimelineSectionProps) => {
  const { data: mapsTimeline, isLoading } = useKillTimeline({
    eventId,
    heroId,
    killId,
  });

  const startTime = new Date(minSpawnTimeAtKill);
  const endTime = new Date(killedAt);

  if (isLoading) {
    return (
      <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  if (!mapsTimeline || mapsTimeline.length === 0) {
    return null;
  }

  const sortedMaps = [...mapsTimeline].sort((a, b) => {
    const aGaps = a.gaps.length;
    const bGaps = b.gaps.length;
    if (aGaps !== bGaps) return bGaps - aGaps;
    return a.mapName.localeCompare(b.mapName);
  });

  return (
    <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 shadow-inner shadow-primary/10">
          <Map className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("events.killDetail.mapCoverage.subtitle", "Pokrycie")}
          </p>
          <h3 className="text-base font-semibold">
            {t("events.killDetail.mapCoverage.title")}
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500" />
          <span>{t("events.killDetail.mapCoverage.covered")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-500" />
          <span>{t("events.killDetail.mapCoverage.uncovered")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-destructive" />
          <span>{t("events.killDetail.mapCoverage.unassigned")}</span>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={[]} className="w-full">
        {sortedMaps.map((map) => (
          <KillMapTimelineCard
            key={map.mapId}
            map={map}
            startTime={startTime}
            endTime={endTime}
            t={t}
          />
        ))}
      </Accordion>
    </Card>
  );
};
