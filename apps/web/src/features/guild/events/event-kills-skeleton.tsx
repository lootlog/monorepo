import { KpiCard } from "@/components/common/kpi-card";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { SkeletonPageHeader } from "./components/skeleton-page-header";
import { SkeletonSectionCard } from "./components/skeleton-section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <SkeletonPageHeader />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Swords}
          label={t("events.kills.killCount")}
          value={null}
          isLoading
        />
      </div>
      <SkeletonFilterBar />
      <SkeletonSectionCard>
        <TableRowsSkeleton rows={7} withHeader />
      </SkeletonSectionCard>
    </div>
  );
};
