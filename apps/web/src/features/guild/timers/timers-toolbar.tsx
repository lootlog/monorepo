import { useTranslation } from "react-i18next";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import type { ViewMode } from "@/hooks/use-view-mode";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PillToggleGroup } from "@/components/common/pill-toggle-group";

type TimerGroupOption = { key: string; label: string; count: number };

type TimersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  groups: TimerGroupOption[];
  selectedGroups: string[];
  onSelectedGroupsChange: (value: string[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  canChooseViewMode: boolean;
};

export const TimersToolbar = ({
  search,
  onSearchChange,
  groups,
  selectedGroups,
  onSelectedGroupsChange,
  viewMode,
  onViewModeChange,
  canChooseViewMode,
}: TimersToolbarProps) => {
  const { t } = useTranslation();

  return (
    <ListToolbar
      search={search}
      onSearchChange={onSearchChange}
      placeholder={t("timers.filterPlaceholder")}
      label={t("timers.filterLabel")}
      clearLabel={t("timers.clearSearch")}
    >
      {groups.length > 1 && (
        <PillToggleGroup
          multiple
          label={t("timers.groupsLabel")}
          value={selectedGroups}
          onValueChange={onSelectedGroupsChange}
          options={groups.map((group) => ({
            value: group.key,
            label: group.label,
            count: group.count,
          }))}
        />
      )}
      {canChooseViewMode && (
        <ViewModeToggle
          value={viewMode}
          onChange={onViewModeChange}
          listLabel={t("timers.view.list")}
          gridLabel={t("timers.view.grid")}
          size="sm"
        />
      )}
    </ListToolbar>
  );
};
