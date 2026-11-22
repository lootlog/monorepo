import { FiltersButton } from "@/components/filters/filters-button";
import { FiltersOverlay } from "@/components/filters/filters-overlay";
import { cn } from "cn";
import { useState, type ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";
import { FilterChipList, type FilterChip } from "./filter-chip-list";
import { LIST_TILE_INSET_CLASS, LIST_TILE_RULE_CLASS } from "./list-tile";
import { RESULTS_TABLE_MEDIA_QUERY } from "./page-sticky-table-header";
import { FilterBarContext } from "@lootlog/ui/components/filter-bar-context";
import { observeTopBarGlass } from "@/components/layout/observe-top-bar-glass";

type FilterBarProps = {
  ariaLabel?: string;
  search?: ReactNode;
  children?: ReactNode;
  stackedFilters?: ReactNode;
  chips?: FilterChip[];
  activeFilterCount?: number;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  chipsPlaceholder?: ReactNode;
};

const EMPTY_CHIPS: FilterChip[] = [];

const FILTER_BAR_HEIGHT_PROPERTY = "--filter-bar-height";

const publishFilterBarHeight = (bar: HTMLDivElement | null) => {
  const container = bar?.parentElement;

  if (!bar || !container) return;

  const measure = () =>
    container.style.setProperty(
      FILTER_BAR_HEIGHT_PROPERTY,
      `${bar.getBoundingClientRect().height}px`,
    );

  const observer = new ResizeObserver(measure);

  measure();
  observer.observe(bar);

  return () => {
    observer.disconnect();
    container.style.removeProperty(FILTER_BAR_HEIGHT_PROPERTY);
  };
};

const attachFilterBar = (bar: HTMLDivElement | null) => {
  const stopPublishing = publishFilterBarHeight(bar);
  const stopObserving = observeTopBarGlass(bar);

  return () => {
    stopPublishing?.();
    stopObserving?.();
  };
};

export const FilterBar = ({
  ariaLabel,
  search,
  children,
  stackedFilters,
  chips = EMPTY_CHIPS,
  activeFilterCount: activeFilterCountProp,
  clearFiltersLabel,
  onClearFilters,
  chipsPlaceholder,
}: FilterBarProps) => {
  const activeFilterCount = activeFilterCountProp ?? chips.length;
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const isWide = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
  const usesPanel = stackedFilters !== undefined && !isWide;
  const hasControls = Boolean(search) || (!usesPanel && Boolean(children));

  return (
    <>
      <div
        ref={attachFilterBar}
        data-list-tile
        className="glass-bar sticky top-(--page-sticky-top) z-20"
      >
        {hasControls && (
          <div
            role={ariaLabel ? "group" : undefined}
            aria-label={ariaLabel}
            data-inline-search-bar
            className={cn(
              "flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 py-2 transition-colors has-[[data-slot=inline-search]_input:focus-visible]:border-primary motion-reduce:transition-none",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <FilterBarContext value>
              {search}
              {!usesPanel && children && (
                <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
                  {children}
                </div>
              )}
            </FilterBarContext>
          </div>
        )}
        {clearFiltersLabel !== undefined && onClearFilters && (
          <FilterChipList
            chips={chips}
            clearLabel={clearFiltersLabel}
            onClear={onClearFilters}
            className={cn(
              "border-sidebar-border bg-transparent",
              LIST_TILE_INSET_CLASS,
            )}
          />
        )}
        {chipsPlaceholder}
      </div>
      {usesPanel && (
        <>
          <FiltersButton
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setIsPanelOpen(true)}
          />
          <FiltersOverlay
            open={isPanelOpen}
            onOpenChange={setIsPanelOpen}
            title={ariaLabel ?? ""}
            activeFilterCount={activeFilterCount}
            onClear={onClearFilters}
          >
            {stackedFilters}
          </FiltersOverlay>
        </>
      )}
    </>
  );
};
