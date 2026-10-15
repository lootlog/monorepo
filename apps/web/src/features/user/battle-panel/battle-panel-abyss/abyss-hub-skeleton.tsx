import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";
import { ResultsSurface } from "@/components/common/results-surface";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { AbyssSummaryCards } from "./abyss-summary-cards";

// The character, season and level range filters, which narrower pages move
// to a panel.
const FILTER_WIDTHS = ["w-[220px]", "w-[260px]", "w-44"];

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
    <div aria-busy="true">
      <ResultsSurface
        search={<Skeleton className="h-10 w-full rounded-lg sm:w-[281px]" />}
        filters={FILTER_WIDTHS.map((width) => (
          <Skeleton
            key={width}
            aria-hidden="true"
            className={`hidden h-10 rounded-lg xl:block ${width}`}
          />
        ))}
        filtersLabel={t("battlePanel.filters.title")}
      >
        <div className="p-3">
          <AbyssSummaryCards isLoading />
        </div>
        <BattlesTable battles={[]} isLoading pagination={SKELETON_PAGINATION} />
      </ResultsSurface>
    </div>
  );
};
