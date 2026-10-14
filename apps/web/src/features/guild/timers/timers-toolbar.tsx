import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useTranslation } from "react-i18next";
import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";
import { ListToolbar } from "@/components/common/list-toolbar";

export type TimerGroupOption = { key: string; label: string; count: number };

type TimersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  groups: TimerGroupOption[];
  selectedGroups: string[];
  onSelectedGroupsChange: (value: string[]) => void;
};

/** The timer name filter, with pills that narrow the list to chosen groups. */
export const TimersToolbar = ({
  search,
  onSearchChange,
  groups,
  selectedGroups,
  onSelectedGroupsChange,
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
    </ListToolbar>
  );
};
