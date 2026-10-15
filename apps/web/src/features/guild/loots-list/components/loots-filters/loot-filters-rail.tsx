import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { FilterX, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { FilterCount } from "@/components/common/filter-count";
import {
  LOOT_FILTER_SECTIONS,
  getLootFilterSectionState,
  type LootFilterSectionKey,
  type LootFiltersState,
} from "./loot-filter-sections";
import { LootFiltersIconTooltip } from "./loot-filters-icon-tooltip";

// Separates the rail's groups with the sidebar's own rule color.
const railDivider = (
  <div
    aria-hidden="true"
    className="my-1 h-px w-6 shrink-0 bg-sidebar-border"
  />
);

type LootFiltersRailProps = {
  state: LootFiltersState;
  /** Opens the panel, scrolled to a section when one is given. */
  onOpen: (section?: LootFilterSectionKey) => void;
  isPanelOpen?: boolean;
  /** Focuses the open button on mount, after the panel collapsed into it. */
  autoFocus?: boolean;
};

/**
 * The collapsed filters panel: it opens the panel, shows which sections narrow
 * the list, and applies quick filters without opening anything.
 */
export const LootFiltersRail = ({
  state,
  onOpen,
  isPanelOpen = false,
  autoFocus = false,
}: LootFiltersRailProps) => {
  const { t, totalActiveFilterCount } = state;
  const openButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocus) openButton.current?.focus();
  }, [autoFocus]);

  const activeCountLabel =
    totalActiveFilterCount > 0
      ? t("common.filters.activeCount", { count: totalActiveFilterCount })
      : undefined;

  return (
    <div className="flex h-full w-14 flex-col items-center gap-1 overflow-y-auto py-2 [scrollbar-width:none]">
      <LootFiltersIconTooltip
        label={t("loots.filtersPanel.expand")}
        detail={activeCountLabel}
        trigger={
          <Button
            ref={openButton}
            variant="ghost"
            size="icon"
            aria-label={
              activeCountLabel
                ? `${t("loots.filtersPanel.expand")}. ${activeCountLabel}`
                : t("loots.filtersPanel.expand")
            }
            aria-expanded={isPanelOpen}
            onClick={() => onOpen()}
            className="relative shrink-0"
          >
            <SlidersHorizontal aria-hidden="true" />
            <FilterCount
              count={totalActiveFilterCount}
              variant="corner"
              className="ring-sidebar"
            />
          </Button>
        }
      />

      {railDivider}

      {LOOT_FILTER_SECTIONS.map(({ key, icon: Icon, titleKey }) => {
        const { count } = getLootFilterSectionState(state, key);
        const title = t(titleKey);

        const detail =
          count > 0 ? t("common.filters.activeCount", { count }) : undefined;

        return (
          <LootFiltersIconTooltip
            key={key}
            label={title}
            detail={detail}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={detail ? `${title}. ${detail}` : title}
                onClick={() => onOpen(key)}
                className={cn(
                  "relative shrink-0",
                  count > 0 ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" />
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-2 size-1.5 rounded-full bg-primary"
                  />
                )}
              </Button>
            }
          />
        );
      })}

      {state.allQuickFilters.length > 0 && railDivider}

      {state.allQuickFilters.map((filter) => {
        const isApplied = state.isQuickFilterApplied(filter.filters);

        const label =
          "category" in filter
            ? `${filter.category}: ${filter.label}`
            : filter.label;

        return (
          <LootFiltersIconTooltip
            key={filter.id}
            label={label}
            detail={
              isApplied
                ? t("loots.filtersPanel.quickFilters.applied")
                : undefined
            }
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={label}
                aria-pressed={isApplied}
                onClick={() => state.toggleQuickFilter(filter.filters)}
                className={cn(
                  "shrink-0",
                  isApplied
                    ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                    : "text-muted-foreground",
                )}
              >
                {/* Like Lootlogs without an icon in the app rail. */}
                <span aria-hidden="true" className="text-sm font-semibold">
                  {filter.label.trim().charAt(0).toUpperCase()}
                </span>
              </Button>
            }
          />
        );
      })}

      {state.hasActiveFilters && (
        <div className="mt-auto flex flex-col items-center pt-1">
          {railDivider}
          <LootFiltersIconTooltip
            label={t("loots.filtersPanel.quickFilters.clearButton")}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("loots.filtersPanel.quickFilters.clearButton")}
                onClick={state.clearFilters}
                className="shrink-0 text-muted-foreground"
              >
                <FilterX aria-hidden="true" />
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
};
