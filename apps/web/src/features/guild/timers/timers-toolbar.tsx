import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { cn } from "cn";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";
import { TIMER_ROW_INSET_CLASS } from "./timers-layout";

export type TimerGroupOption = { key: string; label: string; count: number };

type TimersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  groups: TimerGroupOption[];
  selectedGroups: string[];
  onSelectedGroupsChange: (value: string[]) => void;
};

/**
 * The first row of the timer list: a name filter that reads as part of the
 * list rather than a second global search, and pills that narrow the list to
 * chosen groups. It stays on top while the list scrolls.
 */
export const TimersToolbar = ({
  search,
  onSearchChange,
  groups,
  selectedGroups,
  onSelectedGroupsChange,
}: TimersToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div
      data-list-tile
      className={cn(
        "sticky top-0 z-10 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 border-b border-sidebar-border py-2 backdrop-blur-sm transition-colors has-[input:focus-visible]:border-primary motion-reduce:transition-none",
        TIMER_ROW_INSET_CLASS,
      )}
    >
      {/* The bar's bottom rule lights up while the filter has focus. */}
      <label className="flex min-w-48 flex-1 items-center gap-2 text-sm text-muted-foreground focus-within:text-foreground">
        <Search aria-hidden className="size-4 shrink-0" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("timers.filterPlaceholder")}
          aria-label={t("timers.filterLabel")}
          className="h-8 min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            aria-label={t("timers.clearSearch")}
            onClick={() => onSearchChange("")}
            className="flex size-6 items-center justify-center rounded-md hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </label>
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
    </div>
  );
};
