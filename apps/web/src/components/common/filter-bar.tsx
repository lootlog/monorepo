import { FiltersFab } from "@/components/filters/filters-fab";
import { FiltersOverlay } from "@/components/filters/filters-overlay";
import { cn } from "cn";
import { useState, type ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";
import { FilterChipList, type FilterChip } from "./filter-chip-list";
import { LIST_TILE_INSET_CLASS, LIST_TILE_RULE_CLASS } from "./list-tile";
import { RESULTS_TABLE_MEDIA_QUERY } from "./page-sticky-table-header";

type FilterBarProps = {
  /** Names the group of filters and their panel; a skeleton has none. */
  ariaLabel?: string;
  /**
   * The bar's lead, which stays in it at every width: an `InlineSearchField`,
   * or navigation such as view tabs on a page without a search.
   */
  search?: ReactNode;
  /** The filters, listed in the bar after the search. */
  children?: ReactNode;
  /**
   * The same filters stacked for a panel. Pages narrower than a results
   * table open them from a floating button instead of listing `children`.
   */
  stackedFilters?: ReactNode;
  /** The active filters, listed under the controls. */
  chips?: FilterChip[];
  /** How many filters are active, for pages without chips; defaults to the chips. */
  activeFilterCount?: number;
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
 * scrolls: a borderless search first, the filters after it, and the active
 * filters as chips under them. It belongs directly in the page scroller
 * marked `data-under-top-bar`, or in a `ResultsSurface`.
 */
export const FilterBar = ({
  ariaLabel,
  search,
  children,
  stackedFilters,
  chips = EMPTY_CHIPS,
  activeFilterCount = chips.length,
  clearFiltersLabel,
  onClearFilters,
  chipsPlaceholder,
}: FilterBarProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const isWide = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
  const usesPanel = stackedFilters !== undefined && !isWide;
  const hasControls = Boolean(search) || (!usesPanel && Boolean(children));

  return (
    <>
      <div
        ref={publishFilterBarHeight}
        data-list-tile
        className="sticky top-(--page-sticky-top) z-20 backdrop-blur-sm"
      >
        {hasControls && (
          <div
            role={ariaLabel ? "group" : undefined}
            aria-label={ariaLabel}
            data-inline-search-bar
            className={cn(
              // The bar's bottom rule lights up while the search has focus.
              "flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 py-2 transition-colors has-[[data-slot=inline-search]_input:focus-visible]:border-primary motion-reduce:transition-none",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            {search}
            {!usesPanel && children && (
              // Wraps under the search as a whole once both no longer fit.
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {children}
              </div>
            )}
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
      {/* Outside the bar, whose backdrop filter would pin a fixed button to it. */}
      {usesPanel && (
        <>
          <FiltersFab
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
