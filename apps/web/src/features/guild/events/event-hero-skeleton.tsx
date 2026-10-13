import { SectionCard } from "@/components/common/section-card/section-card";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { MapPin, Package, Skull, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmbeddedLootRowsSkeleton } from "./components/shared/embedded-loot-rows-skeleton";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventHeroSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <PageHeaderSkeleton
        media={<Skeleton className="size-16 shrink-0 rounded-xl" />}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div>
          <SectionCard className="overflow-hidden">
            <SectionCardHeader
              icon={MapPin}
              title={
                <span className="flex items-center gap-1.5">
                  {t("events.maps.title")}
                  <SkeletonLine className="h-4 w-10" />
                </span>
              }
            />
            <div className="divide-y divide-border/70">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-none" />
              ))}
            </div>
          </SectionCard>
        </div>
        <div className="space-y-3">
          <SectionCard className="overflow-hidden">
            <SectionCardHeader
              icon={Trophy}
              title={t("events.ranking.title")}
            />
            <TableRowsSkeleton rows={5} withHeader />
          </SectionCard>
          <SectionCard className="overflow-hidden">
            <SectionCardHeader
              icon={Skull}
              title={t("events.kills.recentTitle")}
            />
            <TableRowsSkeleton rows={5} withHeader />
          </SectionCard>
          <SectionCard className="overflow-hidden">
            <SectionCardHeader icon={Package} title={t("events.loots.title")} />
            <EmbeddedLootRowsSkeleton rows={3} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
