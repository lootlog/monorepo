import { SectionCard } from "@/components/common/section-card/section-card";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Calculator, Package, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmbeddedLootRowsSkeleton } from "./components/shared/embedded-loot-rows-skeleton";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <PageHeaderSkeleton
        media={<Skeleton className="size-16 shrink-0 rounded-xl" />}
        withMetadata
        actions={
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="text-lg leading-tight">
              <SkeletonLine className="h-5 w-16" />
            </div>
          </div>
        }
      />
      {/* Mirrors the loaded grid, including its single-column card order. */}
      <div className="grid min-w-0 items-start gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="contents 2xl:flex 2xl:min-w-0 2xl:flex-col 2xl:gap-3">
          <SectionCard className="order-1 min-w-0 overflow-hidden 2xl:order-none">
            <SectionCardHeader
              icon={Users}
              title={t("events.killDetail.participants")}
              actions={
                <span className="text-xs">
                  <SkeletonLine className="h-3 w-16" />
                </span>
              }
            />
            <TableRowsSkeleton rows={4} withHeader />
          </SectionCard>
          {/* The map timeline loads separately and shows no header until then. */}
          <SectionCard className="order-4 min-w-0 overflow-hidden 2xl:order-none">
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-12 rounded-lg" />
              ))}
            </div>
          </SectionCard>
        </div>
        <div className="contents 2xl:flex 2xl:min-w-0 2xl:flex-col 2xl:gap-3">
          <SectionCard className="order-3 min-w-0 overflow-hidden 2xl:order-none">
            <SectionCardHeader
              icon={Package}
              title={t("events.killDetail.matchingLoots")}
            />
            <EmbeddedLootRowsSkeleton rows={3} />
          </SectionCard>
          <SectionCard className="order-2 min-w-0 overflow-hidden 2xl:order-none">
            <SectionCardHeader
              icon={Calculator}
              title={t("events.killDetail.multipliers.title")}
            />
            <TableRowsSkeleton rows={3} withHeader />
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
