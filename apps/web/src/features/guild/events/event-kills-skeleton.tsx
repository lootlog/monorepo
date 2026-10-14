import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skull } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true">
      <SkeletonFilterBar />
      <div className="flex flex-col gap-3 px-3 py-3">
        <SectionCard className="w-full min-w-0 overflow-hidden">
          <SectionCardHeader icon={Skull} title={t("events.kills.title")} />
          <TableRowsSkeleton
            rows={7}
            trailingColumns={3}
            withHeader
            withNpcTile
          />
        </SectionCard>
      </div>
    </div>
  );
};
