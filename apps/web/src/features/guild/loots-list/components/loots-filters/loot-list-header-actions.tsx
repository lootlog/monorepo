import { Button } from "@lootlog/ui/components/button";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
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
      <Button
        type="button"
        variant={isFiltersOpen ? "default" : "outline"}
        size={isMobile ? "icon-sm" : "default"}
        onClick={onToggleFilters}
        aria-label={isMobile ? t("loots.header.filtersButton") : undefined}
        aria-expanded={isFiltersOpen}
        className="relative shrink-0"
      >
        <Filter aria-hidden="true" />
        {!isMobile && t("loots.header.filtersButton")}
        {hasActiveFilters && !isFiltersOpen && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 size-3 animate-pop-in rounded-full border-2 border-background bg-primary motion-reduce:animate-none"
          />
        )}
      </Button>
    </HeaderSlotPortal>
  );
};
