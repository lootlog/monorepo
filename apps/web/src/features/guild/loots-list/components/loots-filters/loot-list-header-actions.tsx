import { useTranslation } from "react-i18next";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  LOOTS_GRID_MEDIA_QUERY,
  LOOTS_VIEW_MODE_KEY,
} from "@/features/guild/loots-list/loots-list-layout";

/**
 * The loot list's view control, in the top bar next to the Organization
 * search that already covers searching loots. The filters open from their
 * own rail at the right edge, or from a floating button on phones.
 */
export const LootListHeaderActions = () => {
  const { t } = useTranslation();

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    LOOTS_VIEW_MODE_KEY,
    "grid",
    LOOTS_GRID_MEDIA_QUERY,
  );

  if (!canChooseViewMode) return null;

  return (
    <HeaderSlotPortal slot="actions">
      <ViewModeToggle
        value={viewMode}
        onChange={setViewMode}
        listLabel={t("loots.header.listView")}
        gridLabel={t("loots.header.gridView")}
        size="default"
      />
    </HeaderSlotPortal>
  );
};
