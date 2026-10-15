import { useResetScrollTop } from "@/hooks/utils/use-virtual-infinite-scroll";
import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { cn } from "cn";
import { useRef, type ReactNode } from "react";
import { FilterBar } from "./filter-bar";
import type { FilterChip } from "./filter-chip-list";
import { TableScroller } from "./table-scroller";

type ResultsSurfaceProps = {
  /** The leading search of the page's `FilterBar`. */
  search?: ReactNode;
  /**
   * The filters of the page's `FilterBar`. Without them or a search, the
   * results sit under the filter bar of the page around them.
   */
  filters?: ReactNode;
  /** The filters stacked for the panel narrow pages open them in. */
  stackedFilters?: ReactNode;
  filtersLabel?: string;
  chips?: FilterChip[];
  /** How many filters are active, for pages without chips; defaults to the chips. */
  activeFilterCount?: number;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  /** Stands in for the chips while the page loads. */
  chipsPlaceholder?: ReactNode;
  /** The results; a table header in them uses `FILTERED_TABLE_HEADER_CLASS`. */
  children: ReactNode;
  /** Actions on the selected results, docked above the footer. */
  selectionBar?: ReactNode;
  /** Pagination, docked at the bottom edge while the results scroll. */
  footer?: ReactNode;
  /** Scrolls the page back to its top when it changes, such as the page of results. */
  scrollResetKey?: string | number;
  className?: string;
};

/**
 * A page of filtered results, edge to edge in the page scroller marked
 * `data-under-top-bar`: the `FilterBar` stays on top, a table header pins
 * right under it, and the footer stays at the bottom edge.
 */
const DOCKED_FOOTER_HEIGHT_PROPERTY = "--docked-footer-height";

// Publishes the docked footer's height on the surface, so a floating button,
// such as the one opening the filters, rises above it.
const publishDockedFooterHeight = (footer: HTMLDivElement | null) => {
  const surface = footer?.parentElement;

  if (!footer || !surface) return;

  const observer = new ResizeObserver(() =>
    surface.style.setProperty(
      DOCKED_FOOTER_HEIGHT_PROPERTY,
      `${footer.getBoundingClientRect().height}px`,
    ),
  );

  observer.observe(footer);

  return () => {
    observer.disconnect();
    surface.style.removeProperty(DOCKED_FOOTER_HEIGHT_PROPERTY);
  };
};

export const ResultsSurface = ({
  search,
  filters,
  stackedFilters,
  filtersLabel,
  chips,
  activeFilterCount,
  clearFiltersLabel,
  onClearFilters,
  chipsPlaceholder,
  children,
  selectionBar,
  footer,
  scrollResetKey,
  className,
}: ResultsSurfaceProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useResetScrollTop({
    behavior: getPrefersReducedMotion() ? "auto" : "smooth",
    getScrollElement: () =>
      surfaceRef.current?.closest<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      ) ?? null,
    resetKey: scrollResetKey === undefined ? undefined : String(scrollResetKey),
  });

  return (
    <div ref={surfaceRef} className={cn("flex min-w-0 flex-col", className)}>
      {(search || filters) && (
        <FilterBar
          ariaLabel={filtersLabel}
          search={search}
          stackedFilters={stackedFilters}
          chips={chips}
          activeFilterCount={activeFilterCount}
          clearFiltersLabel={clearFiltersLabel}
          onClearFilters={onClearFilters}
          chipsPlaceholder={chipsPlaceholder}
        >
          {filters}
        </FilterBar>
      )}
      <TableScroller className="min-w-0">{children}</TableScroller>
      {(selectionBar || footer) && (
        // Overlaps the last row's rule while it sits right after the rows.
        <div
          ref={publishDockedFooterHeight}
          className="sticky bottom-0 z-20 -mt-px bg-sidebar"
        >
          {selectionBar && (
            <div className="border-t border-sidebar-border">{selectionBar}</div>
          )}
          {footer}
        </div>
      )}
    </div>
  );
};
