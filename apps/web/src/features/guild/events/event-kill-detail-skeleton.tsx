import { BandSection } from "@/components/common/band-section";
import { DetailBar } from "@/components/common/detail-bar";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { KillDetailColumns } from "./components/kills/kill-detail-columns";
import { EmbeddedLootRowsSkeleton } from "./components/shared/embedded-loot-rows-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="min-h-0 flex-1">
      <div aria-busy="true" className="min-w-0">
        <DetailBar
          meta={
            <>
              <span className="flex items-center gap-2.5">
                <Skeleton className="size-10 rounded-lg" />
                <SkeletonLine className="h-4 w-40" />
              </span>
              <SkeletonLine className="h-3 w-40" />
            </>
          }
          actions={<Skeleton className="size-12 rounded-full" />}
        />
        <KillDetailColumns
          participants={
            <BandSection
              id="kill-participants-skeleton"
              title={t("events.killDetail.participants")}
              tiled
            >
              <TableRowsSkeleton rows={4} withHeader />
            </BandSection>
          }
          maps={
            <BandSection
              id="kill-map-coverage-skeleton"
              title={t("events.killDetail.mapCoverage.title")}
              tiled
            >
              <TableRowsSkeleton rows={3} withHeader />
            </BandSection>
          }
          rules={
            <BandSection
              id="kill-scoring-rules-skeleton"
              title={t("events.killDetail.multipliers.title")}
              tiled
            >
              <TableRowsSkeleton rows={3} />
            </BandSection>
          }
          loots={
            <BandSection
              id="kill-matching-loots-skeleton"
              title={t("events.killDetail.matchingLoots")}
              tiled
            >
              <EmbeddedLootRowsSkeleton rows={3} />
            </BandSection>
          }
        />
      </div>
    </ScrollArea>
  );
};
