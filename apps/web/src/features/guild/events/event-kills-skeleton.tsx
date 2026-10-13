import { KpiCard } from "@/components/common/kpi-card";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skull, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <SkeletonFilterBar />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Swords}
          label={t("events.kills.killCount")}
          value={null}
          isLoading
        />
      </div>
      <SectionCard className="w-full min-w-0 overflow-hidden">
        <SectionCardHeader icon={Skull} title={t("events.kills.title")} />
        <TableRowsSkeleton rows={7} withHeader />
      </SectionCard>
    </div>
  );
};
