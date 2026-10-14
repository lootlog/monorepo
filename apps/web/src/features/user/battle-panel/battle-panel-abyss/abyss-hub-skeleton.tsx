import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";
import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { AbyssSummaryCards } from "./abyss-summary-cards";

const FILTER_WIDTHS = ["md:w-52", "md:w-[260px]", "md:w-44"];

const SKELETON_PAGINATION = {
  hasNext: false,
  hasPrev: false,
  pageIndex: 0,
  pageSize: 20,
  totalCount: 0,
};

export const AbyssHubSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 p-3">
      <FilterBar ariaLabel={t("battlePanel.filters.title")}>
        {FILTER_WIDTHS.map((width) => (
          <Skeleton key={width} className={`h-10 w-full rounded-md ${width}`} />
        ))}
      </FilterBar>
      <AbyssSummaryCards isLoading />
      <Skeleton className="h-11 w-full rounded-lg sm:w-80" />
      <div className="flex min-h-[640px] min-w-0 flex-col">
        <BattlesTable battles={[]} isLoading pagination={SKELETON_PAGINATION} />
      </div>
    </div>
  );
};
