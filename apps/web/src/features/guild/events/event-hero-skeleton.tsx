import { BandSection } from "@/components/common/band-section";
import { DetailBar } from "@/components/common/detail-bar";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { HeroDetailResponsiveLayout } from "./components/heroes/hero-detail-responsive-layout";
import { EmbeddedLootRowsSkeleton } from "./components/shared/embedded-loot-rows-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventHeroSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="min-h-0 flex-1">
      <div aria-busy="true" className="min-w-0">
        <DetailBar
          meta={
            <span className="flex items-center gap-2.5">
              <Skeleton className="size-10 rounded-lg" />
              <SkeletonLine className="h-4 w-40" />
            </span>
          }
        />
        <HeroDetailResponsiveLayout
          maps={
            <BandSection
              id="hero-maps-skeleton"
              title={t("events.maps.title")}
              tiled
            >
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-14 w-full rounded-none border-b border-sidebar-border"
                />
              ))}
            </BandSection>
          }
          sidebar={
            <>
              <BandSection
                id="hero-ranking-skeleton"
                title={t("events.ranking.title")}
                tiled
              >
                <TableRowsSkeleton rows={5} withHeader />
              </BandSection>
              <BandSection
                id="hero-kills-skeleton"
                title={t("events.kills.recentTitle")}
                tiled
              >
                <TableRowsSkeleton rows={5} withHeader />
              </BandSection>
              <BandSection
                id="hero-loots-skeleton"
                title={t("events.loots.title")}
                tiled
              >
                <EmbeddedLootRowsSkeleton rows={3} />
              </BandSection>
            </>
          }
        />
      </div>
    </ScrollArea>
  );
};
