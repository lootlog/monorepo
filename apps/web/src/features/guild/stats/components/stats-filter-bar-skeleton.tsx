import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";

export const StatsFilterBarSkeleton = () => {
  const { t } = useTranslation();

  return (
    <FilterBar ariaLabel={t("kills.filters.title")}>
      <Skeleton className="h-10 w-full rounded-lg md:w-[200px]" />
      <Skeleton className="hidden h-10 w-[200px] rounded-lg md:block" />
      <Skeleton className="hidden h-10 w-[200px] rounded-lg md:block" />
    </FilterBar>
  );
};
