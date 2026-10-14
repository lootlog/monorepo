import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Package, Skull, Swords, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmbeddedLootRowsSkeleton } from "./components/shared/embedded-loot-rows-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <PageHeader
        icon={Trophy}
        title=<SkeletonLine className="h-5 w-40" />
        status=<Skeleton className="h-5 w-16 rounded-full" />
        metadata=<SkeletonLine className="h-3 w-56 max-w-full" />
        actions=<Skeleton className="h-9 w-9 rounded-lg sm:w-32" />
      >
        <SectionCardFooter className="grid gap-1 p-1.5 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full rounded-lg" />
          ))}
        </SectionCardFooter>
      </PageHeader>

      {/* Mirrors the loaded grid, including its single-column card order. */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="contents xl:block xl:min-w-0 xl:space-y-3">
          <SectionCard className="order-1 overflow-hidden xl:order-none">
            <SectionCardHeader icon={Swords} title={t("events.heroes.title")} />
            <TableRowsSkeleton rows={4} withHeader />
          </SectionCard>
          <SectionCard className="order-4 overflow-hidden xl:order-none">
            <SectionCardHeader icon={Package} title={t("events.loots.title")} />
            <EmbeddedLootRowsSkeleton rows={3} />
          </SectionCard>
        </div>
        <div className="contents xl:block xl:min-w-0 xl:space-y-3">
          <SectionCard className="order-2 overflow-hidden xl:order-none">
            <SectionCardHeader
              icon={Trophy}
              title={t("events.ranking.title")}
            />
            <TableRowsSkeleton rows={5} withHeader />
          </SectionCard>
          <SectionCard className="order-3 overflow-hidden xl:order-none">
            <SectionCardHeader
              icon={Skull}
              title={t("events.kills.recentTitle")}
            />
            <TableRowsSkeleton rows={5} withHeader />
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
