import { BandSection } from "@/components/common/band-section";
import {
  LIST_BAND_HEADING_CLASS,
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { AlertTriangle, Clock3, MapPinned, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EventHeaderSkeleton } from "./components/header/event-header-skeleton";

const KPIS = [
  { icon: AlertTriangle, labelKey: "events.coordination.priority.critical" },
  { icon: Clock3, labelKey: "events.coordination.priority.warning" },
  { icon: MapPinned, labelKey: "events.coordination.summary.coverageLabel" },
  { icon: Timer, labelKey: "events.coordination.summary.nextSpawnLabel" },
] as const;

export const EventCoordinationSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="min-h-0 flex-1">
      <EventHeaderSkeleton tab="coordination" />
      <div aria-busy="true" className="min-w-0">
        <BandSection
          id="coordination-summary-skeleton"
          title={t("events.coordination.title")}
          tiled
        >
          <StatsTileGrid className="grid-cols-2 xl:grid-cols-4">
            {KPIS.map((kpi) => (
              <StatsTile
                key={kpi.labelKey}
                icon={kpi.icon}
                label={t(kpi.labelKey)}
                value={<Skeleton className="my-0.5 h-6 w-16" />}
              />
            ))}
          </StatsTileGrid>
        </BandSection>
        {Array.from({ length: 3 }, (_, index) => (
          <section key={index}>
            <div
              className={cn(
                LIST_GROUP_HEADING_CLASS,
                LIST_BAND_HEADING_CLASS,
                LIST_TILE_INSET_CLASS,
              )}
            >
              <Skeleton className="h-4 w-32" />
            </div>
            <div
              className={cn("flex flex-col gap-5 py-5", LIST_TILE_INSET_CLASS)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  );
};
