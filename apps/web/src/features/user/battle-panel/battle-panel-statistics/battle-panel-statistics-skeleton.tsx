import { SectionCard } from "@/components/common/section-card/section-card";
import { BattlePanelFilterBar } from "@/features/user/battle-panel/components/battle-panel-filter-bar";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { CombatProfileOverview } from "./components/combat-profile-overview";

const FILTER_WIDTHS = ["md:w-52", "md:w-60", "md:w-44", "md:w-40"];

const cardSkeleton = (className?: string) => (
  <SectionCard className={className}>
    <div className="flex min-h-12 flex-col justify-center gap-1.5 border-b border-border/70 px-3 py-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56 max-w-full" />
    </div>
    <div className="p-3">
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  </SectionCard>
);

export const BattlePanelStatisticsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full min-h-0 pt-3">
      <div
        aria-busy="true"
        className="flex min-h-full flex-col gap-3 bg-background px-3 pb-3"
      >
        <BattlePanelFilterBar ariaLabel={t("battlePanel.filters.title")}>
          {FILTER_WIDTHS.map((width, index) => (
            <Skeleton
              key={width}
              className={`h-10 w-full rounded-md ${width} ${index > 0 ? "hidden md:block" : ""}`}
            />
          ))}
        </BattlePanelFilterBar>

        <CombatProfileOverview data={undefined} isLoading />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          {cardSkeleton()}
          {cardSkeleton()}
          {cardSkeleton("lg:col-span-2")}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {cardSkeleton()}
          {cardSkeleton()}
        </div>
      </div>
    </ScrollArea>
  );
};
