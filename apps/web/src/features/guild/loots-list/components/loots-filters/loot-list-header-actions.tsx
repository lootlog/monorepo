import { Button } from "@lootlog/ui/components/button";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "cn";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { LootFiltersActiveDot } from "./loot-filters-active-dot";
import {
  LOOTS_GRID_MEDIA_QUERY,
  LOOTS_VIEW_MODE_KEY,
} from "@/features/guild/loots-list/loots-list-layout";

type LootListHeaderActionsProps = {
  isFiltersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
};

/**
 * The loot list's view and filter controls, in the top bar next to the
 * Organization search that already covers searching loots.
 */
export const LootListHeaderActions = ({
  isFiltersOpen,
  hasActiveFilters,
  onToggleFilters,
}: LootListHeaderActionsProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    LOOTS_VIEW_MODE_KEY,
    "grid",
    LOOTS_GRID_MEDIA_QUERY,
  );

  return (
    <HeaderSlotPortal slot="actions">
      {canChooseViewMode && (
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          listLabel={t("loots.header.listView")}
          gridLabel={t("loots.header.gridView")}
          size="default"
        />
      )}
      {/* Phones open the filters from a floating button instead. */}
      {!isMobile && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToggleFilters}
          aria-label={t("loots.header.filtersButton")}
          aria-expanded={isFiltersOpen}
          // Drawn like the view toggle beside it: the border stays and an open
          // panel fills only the inside, as the toggle's selected segment does.
          className={cn(
            "relative shrink-0",
            isFiltersOpen &&
              "bg-primary text-primary-foreground hover:border-border hover:bg-primary/90 hover:text-primary-foreground",
          )}
        >
          <Filter aria-hidden="true" />
          {hasActiveFilters && !isFiltersOpen && <LootFiltersActiveDot />}
        </Button>
      )}
    </HeaderSlotPortal>
  );
};
