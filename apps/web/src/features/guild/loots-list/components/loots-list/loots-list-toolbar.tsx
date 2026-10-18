import { useTranslation } from "react-i18next";
import { FilterBar } from "@/components/common/filter-bar";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { LootSearchField } from "@/features/guild/loots-list/components/loots-filters/loot-search-field";
import {
  LOOTS_GRID_MEDIA_QUERY,
  LOOTS_VIEW_MODE_KEY,
} from "@/features/guild/loots-list/loots-list-layout";

/**
 * The loot list's first row: its loot search, then the view control. The
 * filters open from their own rail at the right edge, or from a floating
 * button on phones.
 */
export const LootsListToolbar = () => {
  const { t } = useTranslation();

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    LOOTS_VIEW_MODE_KEY,
    "grid",
    LOOTS_GRID_MEDIA_QUERY,
  );

  return (
    <FilterBar search={<LootSearchField />}>
      {canChooseViewMode && (
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          listLabel={t("loots.header.listView")}
          gridLabel={t("loots.header.gridView")}
          size="sm"
        />
      )}
    </FilterBar>
  );
};
