import type { CustomTimerList } from "@lootlog/schema/timer-settings";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toolbarStripLightSubRowClassName } from "@/components/ui/toolbar-strip";

type TimersListFilterProps = {
  lists: CustomTimerList[];
  selectedLists: string[];
  onChange: (selectedLists: string[]) => void;
};

/**
 * A row of the player's lists under the filter strip. A click toggles a list
 * and a right-click keeps only that one, so switching views takes one click;
 * with nothing selected no list filters the timers.
 */
export const TimersListFilter: FC<TimersListFilterProps> = ({
  lists,
  selectedLists,
  onChange,
}) => {
  const { t } = useTranslation("timers");

  // Ids of lists deleted meanwhile no longer count as a selection.
  const selected = lists
    .filter((list) => selectedLists.includes(list.id))
    .map(({ id }) => id);

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
      className={cn(toolbarStripLightSubRowClassName, "ll:gap-0.5")}
    >
      {lists.map((list) => (
        <Button
          key={list.id}
          size="xs"
          variant="taskbar"
          aria-pressed={selected.includes(list.id)}
          className="ll:min-w-0 ll:max-w-full"
          onClick={() => toggle(list.id)}
          onContextMenu={(event) => {
            event.preventDefault();
            onChange([list.id]);
          }}
        >
          <span className="ll:truncate">{list.name}</span>
        </Button>
      ))}
    </div>
  );
};
