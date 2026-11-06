import { Button } from "@lootlog/ui/components/button";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FilterCount } from "@/components/common/filter-count";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";

type FiltersButtonProps = {
  activeFilterCount: number;
  onOpenFilters: () => void;
};

/**
 * Pages too narrow for their filter bar open the filters from the app's top
 * bar, as an action on the current view, with the count of active filters.
 */
export const FiltersButton = ({
  activeFilterCount,
  onOpenFilters,
}: FiltersButtonProps) => {
  const { t } = useTranslation();
  // Phone bars drop control borders; their icons stand alone.
  const isMobile = useIsMobile();

  return (
    <HeaderSlotPortal slot="actions">
      <Button
        type="button"
        variant={isMobile ? "ghost" : "outline"}
        size="icon"
        onClick={onOpenFilters}
        aria-label={
          activeFilterCount > 0
            ? `${t("common.filters.title")}. ${t("common.filters.activeCount", { count: activeFilterCount })}`
            : t("common.filters.title")
        }
        className="relative"
      >
        <SlidersHorizontal aria-hidden="true" />
        <FilterCount count={activeFilterCount} variant="corner" />
      </Button>
    </HeaderSlotPortal>
  );
};
