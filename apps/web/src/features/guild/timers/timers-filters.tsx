import { useTranslation } from "react-i18next";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import type { ViewMode } from "@/hooks/use-view-mode";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Layers } from "lucide-react";
import { FilterOptionCount } from "@/components/common/filter-option-count";

type TimerGroupOption = { key: string; label: string; count: number };

type TimersFiltersProps = {
  groups: TimerGroupOption[];
  selectedGroups: string[];
  onSelectedGroupsChange: (value: string[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  canChooseViewMode: boolean;
};

export const TimersFilters = ({
  groups,
  selectedGroups,
  onSelectedGroupsChange,
  viewMode,
  onViewModeChange,
  canChooseViewMode,
}: TimersFiltersProps) => {
  const { t } = useTranslation();

  return (
    <>
      {groups.length > 1 && (
        <FilterPopover
          options={groups.map((group) => ({
            value: group.key,
            label: group.label,
            render: () => (
              <FilterOptionCount label={group.label} count={group.count} />
            ),
          }))}
          value={selectedGroups}
          onValueChange={(key) =>
            onSelectedGroupsChange(
              selectedGroups.includes(key)
                ? selectedGroups.filter((selected) => selected !== key)
                : [...selectedGroups, key],
            )
          }
          placeholder={t("timers.groupsLabel")}
          icon={Layers}
          multiSelect
          showSearch={false}
          renderTriggerLabel={(count) =>
            count > 0
              ? t("common.filters.selectedCount", { count })
              : t("timers.groupsLabel")
          }
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
    </>
  );
};
