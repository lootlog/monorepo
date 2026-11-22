import type { CustomTimerList } from "@lootlog/schema/timer-settings";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { toolbarStripLightSubRowClassName } from "@/components/ui/toolbar-strip";
import { TimersListChip } from "./timers-list-chip";

type TimersListFilterProps = {
  lists: CustomTimerList[];
  selectedLists: string[];
  onChange: (selectedLists: string[]) => void;
};

export const TimersListFilter: FC<TimersListFilterProps> = ({
  lists,
  selectedLists,
  onChange,
}) => {
  const { t } = useTranslation("timers");

  const selectedIds = new Set(selectedLists);

  const selected = lists
    .map(({ id }) => id)
    .filter((id) => selectedIds.has(id));

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((entry) => entry !== id)
        : [...selected, id],
    );
  };

  return (
    <div
      role="group"
      aria-label={t("filters.listsLabel")}
      title={t("filters.listsHint")}
      className={cn(toolbarStripLightSubRowClassName, "ll:gap-1 ll:p-1")}
    >
      <TimersListChip
        pressed={selected.length === 0}
        onPressedChange={() => onChange([])}
      >
        {t("filters.listsAll")}
      </TimersListChip>
      {lists.map((list) => (
        <TimersListChip
          key={list.id}
          pressed={selectedIds.has(list.id)}
          title={list.name}
          onPressedChange={() => toggle(list.id)}
          onContextMenu={() => onChange([list.id])}
        >
          <span className="ll:truncate">{list.name}</span>
        </TimersListChip>
      ))}
    </div>
  );
};
