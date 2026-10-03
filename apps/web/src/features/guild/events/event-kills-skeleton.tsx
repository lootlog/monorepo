import { KpiCard } from "@/components/common/kpi-card";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <PageHeaderSkeleton withMetadata />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Swords}
          label={t("events.kills.killCount")}
          value={null}
          isLoading
        />
      </div>
      <SkeletonFilterBar />
      <SectionCardSkeleton withIcon withDescription={false}>
        <TableRowsSkeleton rows={7} withHeader />
      </SectionCardSkeleton>
    </div>
  );
};
