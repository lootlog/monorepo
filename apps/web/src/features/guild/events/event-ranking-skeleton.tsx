import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventRankingSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <SkeletonFilterBar />
      <SectionCard className="w-full min-w-0 overflow-hidden">
        <SectionCardHeader icon={Trophy} title={t("events.ranking.title")} />
        <TableRowsSkeleton rows={8} withHeader />
      </SectionCard>
    </div>
  );
};
