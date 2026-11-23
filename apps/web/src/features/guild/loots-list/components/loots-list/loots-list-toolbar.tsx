import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useTranslation } from "react-i18next";
import { FilterBar } from "@/components/common/filter-bar";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { LootSearchField } from "@/features/guild/loots-list/components/loots-filters/loot-search-field";
import { LOOTS_VIEW_MODE_KEY } from "@/features/guild/loots-list/loots-list-layout";

export const LootsListToolbar = () => {
  const { t } = useTranslation();

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    LOOTS_VIEW_MODE_KEY,
    "grid",
    RESULTS_TABLE_MEDIA_QUERY,
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
