import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { FilterBar } from "@/components/common/filter-bar";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { CombatProfileOverview } from "./components/combat-profile-overview";

const FILTER_WIDTHS = ["md:w-52", "md:w-60", "md:w-44", "md:w-40"];

export const BattlePanelStatisticsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full min-h-0 pt-3">
      <div
        aria-busy="true"
        className="flex min-h-full flex-col gap-3 px-3 pb-3"
      >
        <FilterBar ariaLabel={t("battlePanel.filters.title")}>
          {FILTER_WIDTHS.map((width, index) => (
            <Skeleton
              key={width}
              className={`h-10 w-full rounded-md ${width} ${index > 0 ? "hidden md:block" : ""}`}
            />
          ))}
        </FilterBar>

        <CombatProfileOverview data={undefined} isLoading />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          <SectionCardSkeleton />
          <SectionCardSkeleton />
          <SectionCardSkeleton className="lg:col-span-2" />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <SectionCardSkeleton />
          <SectionCardSkeleton />
        </div>
      </div>
    </ScrollArea>
  );
};
