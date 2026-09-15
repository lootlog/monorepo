import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WindowActionButton } from "@/components/draggable-window/window-action-button";

type TimersActionsProps = {
  timerFiltersEnabled?: boolean;
  toggleTimerFiltersEnabled: () => void;
  colorFiltersEnabled?: boolean;
  toggleColorFiltersEnabled: () => void;
  timersSortOrder: "asc" | "desc";
  setTimersSortOrder: (order: "asc" | "desc") => void;
  showHiddenTimers: boolean;
  setShowHiddenTimers: (show: boolean) => void;
};

const ICON_SIZE = 14;

type OptionItem = {
  key: string;
  label: string;
  checked?: boolean;
  icon?: ReactNode;
  onSelect: () => void;
};

/**
 * Every option, filters included, lives in one menu so the title bar keeps
 * room for the title at the minimum window width.
 */
export const TimersActions: FC<TimersActionsProps> = ({
  timerFiltersEnabled = false,
  toggleTimerFiltersEnabled,
  colorFiltersEnabled = false,
  toggleColorFiltersEnabled,
  timersSortOrder,
  setTimersSortOrder,
  showHiddenTimers,
  setShowHiddenTimers,
}) => {
  const { t } = useTranslation("timers");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const sortDesc = timersSortOrder === "desc";

  const options: OptionItem[] = [
    {
      key: "filters",
      label: t("toolbar.filters"),
      checked: timerFiltersEnabled,
      onSelect: toggleTimerFiltersEnabled,
    },
    {
      key: "color-filters",
      label: t("toolbar.colorFilters"),
      checked: colorFiltersEnabled,
      onSelect: toggleColorFiltersEnabled,
    },
    {
      key: "hidden-timers",
      label: t("toolbar.hiddenTimers"),
      checked: showHiddenTimers,
      onSelect: () => setShowHiddenTimers(!showHiddenTimers),
    },
    {
      key: "sort",
      label: t(sortDesc ? "toolbar.sortAsc" : "toolbar.sortDesc"),
      icon: sortDesc ? (
        <ArrowUpNarrowWide size={ICON_SIZE} aria-hidden="true" />
      ) : (
        <ArrowDownNarrowWide size={ICON_SIZE} aria-hidden="true" />
      ),
      onSelect: () => setTimersSortOrder(sortDesc ? "asc" : "desc"),
    },
  ];

  return (
    <>
      <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
        <PopoverTrigger asChild>
          <WindowActionButton
            label={t("toolbar.options")}
            active={optionsOpen}
            onClick={() => setOptionsOpen((open) => !open)}
          >
            <SlidersHorizontal size={ICON_SIZE} aria-hidden="true" />
          </WindowActionButton>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="ll-action-menu ll:w-48 ll:overflow-hidden ll:p-0"
        >
          {options.map((option) => (
            <Button
              key={option.key}
              size="xs"
              variant="menu"
              aria-pressed={option.checked}
              className="ll:w-full ll:justify-between"
              onClick={option.onSelect}
            >
              <span>{option.label}</span>
              {option.icon ??
                (option.checked ? (
                  <Check size={ICON_SIZE} aria-hidden="true" />
                ) : null)}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </>
  );
};
