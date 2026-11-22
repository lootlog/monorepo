import { useResetScrollTop } from "@/hooks/utils/use-virtual-infinite-scroll";
import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { cn } from "cn";
import { useRef, type ReactNode } from "react";
import { FilterBar } from "./filter-bar";
import type { FilterChip } from "./filter-chip-list";
import { TableScroller } from "./table-scroller";

type ResultsSurfaceProps = {
  search?: ReactNode;
  filters?: ReactNode;
  stackedFilters?: ReactNode;
  filtersLabel?: string;
  chips?: FilterChip[];
  activeFilterCount?: number;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  chipsPlaceholder?: ReactNode;
  children: ReactNode;
  selectionBar?: ReactNode;
  footer?: ReactNode;
  scrollResetKey?: string | number;
  className?: string;
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
    <div
      ref={surfaceRef}
      data-page-fill
      className={cn("flex min-w-0 flex-col", className)}
    >
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
      <TableScroller className="min-w-0 grow">{children}</TableScroller>
      {(selectionBar || footer) && (
        <div className="sticky bottom-[var(--tab-bar-offset,0px)] z-20 -mt-px bg-sidebar">
          {selectionBar && (
            <div className="border-t border-sidebar-border">{selectionBar}</div>
          )}
          {footer}
        </div>
      )}
    </div>
  );
};
