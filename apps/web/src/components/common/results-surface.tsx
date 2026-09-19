import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import type { ReactNode, Ref } from "react";
import { FilterChipList, type FilterChip } from "./filter-chip-list";

type ResultsSurfaceProps = {
  title?: string;
  chips?: FilterChip[];
  children: ReactNode;
  clearFiltersLabel?: string;
  footer?: ReactNode;
  onClearFilters?: () => void;
  /** The scroll viewport, for callers that virtualize their rows. */
  scrollRef?: Ref<HTMLDivElement>;
  selectionBar?: ReactNode;
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
  /** Names the filter group when the toolbar replaces the titled header. */
  toolbarLabel?: string;
  withHorizontalScroll?: boolean;
};

const EMPTY_CHIPS: NonNullable<ResultsSurfaceProps["chips"]> = [];

export const ResultsSurface = ({
  title,
  chips = EMPTY_CHIPS,
  children,
  clearFiltersLabel,
  footer,
  onClearFilters,
  scrollRef,
  selectionBar,
  toolbar,
  toolbarEnd,
  toolbarLabel,
  withHorizontalScroll = true,
}: ResultsSurfaceProps) => {
  const shouldShowChips =
    chips.length > 0 && clearFiltersLabel !== undefined && onClearFilters;

  return (
    <SectionCard className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
      {title ? (
        <SectionCardHeader
          title={title}
          actions={
            <>
              {toolbar}
              {toolbarEnd}
            </>
          }
          className="shrink-0"
        />
      ) : (
        (toolbar || toolbarEnd) && (
          <TableFilterToolbar role="group" aria-label={toolbarLabel}>
            {toolbar && <div className="min-w-0 flex-1">{toolbar}</div>}
            {toolbarEnd}
          </TableFilterToolbar>
        )
      )}
      {shouldShowChips && (
        <FilterChipList
          chips={chips}
          clearLabel={clearFiltersLabel}
          onClear={onClearFilters}
        />
      )}
      <ScrollArea className="relative min-h-0 flex-1" ref={scrollRef}>
        <div className={cn(!withHorizontalScroll && "min-w-0")}>{children}</div>
        {withHorizontalScroll && <ScrollBar orientation="horizontal" />}
      </ScrollArea>
      {selectionBar && (
        <div className="shrink-0 border-t border-border bg-background/95">
          {selectionBar}
        </div>
      )}
      {footer}
    </SectionCard>
  );
};
