import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useTranslation } from "react-i18next";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import type { ViewMode } from "@/hooks/use-view-mode";
import { FILTER_PILL_CLASS } from "@lootlog/ui/lib/filter-pill";
import { ListToolbar } from "@/components/common/list-toolbar";

export type TimerGroupOption = { key: string; label: string; count: number };

type TimersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  groups: TimerGroupOption[];
  selectedGroups: string[];
  onSelectedGroupsChange: (value: string[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  /** False below the width where the grid gets a second column. */
  canChooseViewMode: boolean;
};

/**
 * The timer name filter, with pills that narrow the list to chosen groups,
 * then the view control.
 */
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
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          spacing={1.5}
          value={selectedGroups}
          onValueChange={onSelectedGroupsChange}
          aria-label={t("timers.groupsLabel")}
          className="flex-wrap"
        >
          {groups.map((group) => (
            <ToggleGroupItem
              key={group.key}
              value={group.key}
              className={FILTER_PILL_CLASS}
            >
              {group.label}
              <span className="text-muted-foreground tabular-nums">
                {group.count}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
