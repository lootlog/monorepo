import { cn } from "cn";
import type { ReactNode } from "react";
import { FilterChipList, type FilterChip } from "./filter-chip-list";
import { LIST_TILE_INSET_CLASS, LIST_TILE_RULE_CLASS } from "./list-tile";

type FilterBarProps = {
  /** Names the group of filters; a skeleton standing in for one has none. */
  ariaLabel?: string;
  children: ReactNode;
  /** The active filters, listed under the controls. */
  chips?: FilterChip[];
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  /** Stands in for the chips while the page loads. */
  chipsPlaceholder?: ReactNode;
};

const EMPTY_CHIPS: FilterChip[] = [];

const FILTER_BAR_HEIGHT_PROPERTY = "--filter-bar-height";

// Publishes the bar's height on its container, so a table header after it
// pins right under it (`FILTERED_TABLE_HEADER_CLASS`) whatever its height.
const publishFilterBarHeight = (bar: HTMLDivElement | null) => {
  const container = bar?.parentElement;

  if (!bar || !container) return;

  const measure = () =>
    container.style.setProperty(
      FILTER_BAR_HEIGHT_PROPERTY,
      `${bar.getBoundingClientRect().height}px`,
    );

  // Measured on mount, then again whenever wrapping or chips change it.
  const observer = new ResizeObserver(measure);

  measure();
  observer.observe(bar);

  return () => {
    observer.disconnect();
    container.style.removeProperty(FILTER_BAR_HEIGHT_PROPERTY);
  };
};

/**
 * A page's filters as an edge-to-edge bar that stays on top while the page
 * scrolls, with the active filters as chips under it. It belongs directly in
 * the page scroller marked `data-under-top-bar`, or in a `ResultsSurface`.
 */
export const FilterBar = ({
  ariaLabel,
  children,
  chips = EMPTY_CHIPS,
  clearFiltersLabel,
  onClearFilters,
  chipsPlaceholder,
}: FilterBarProps) => (
  <div
    ref={publishFilterBarHeight}
    data-list-tile
    className="sticky top-(--page-sticky-top) z-20 backdrop-blur-sm"
  >
    <div
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-12 flex-wrap items-center gap-2 py-2",
        LIST_TILE_RULE_CLASS,
        LIST_TILE_INSET_CLASS,
      )}
    >
      {children}
    </div>
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
);
