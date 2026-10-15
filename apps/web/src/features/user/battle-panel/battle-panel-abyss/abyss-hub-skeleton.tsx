import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";
import { ResultsSurface } from "@/components/common/results-surface";
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
    <div aria-busy="true">
      <ResultsSurface
        filters={
          <>
            <Skeleton className="h-10 w-full rounded-lg sm:w-80" />
            {FILTER_WIDTHS.map((width) => (
              <Skeleton
                key={width}
                className={`h-10 w-full rounded-md ${width}`}
              />
            ))}
          </>
        }
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
