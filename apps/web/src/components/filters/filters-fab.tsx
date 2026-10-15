import { Button } from "@lootlog/ui/components/button";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FilterCount } from "@/components/common/filter-count";

type FiltersFabProps = {
  activeFilterCount: number;
  onOpenFilters: () => void;
};

/**
 * Narrow pages open their filters from a floating button within thumb reach.
 * It rises above a footer docked at the bottom edge, such as pagination,
 * which publishes its height as `--docked-footer-height`.
 */
export const FiltersFab = ({
  activeFilterCount,
  onOpenFilters,
}: FiltersFabProps) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      onClick={onOpenFilters}
      aria-label={
        activeFilterCount > 0
          ? `${t("common.filters.title")}. ${t("common.filters.activeCount", { count: activeFilterCount })}`
          : t("common.filters.title")
      }
      className="fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--docked-footer-height,0px))] z-40 size-14 rounded-full shadow-lg shadow-black/40 [&_svg:not([class*='size-'])]:size-6"
    >
      <SlidersHorizontal aria-hidden="true" />
      <FilterCount count={activeFilterCount} variant="corner" />
    </Button>
  );
};
