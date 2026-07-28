import { Card } from "@lootlog/ui/components/card";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import type { ReactNode } from "react";
import {
  BattlePanelFilterChipList,
  type BattlePanelFilterChip,
} from "./battle-panel-filter-chip-list";

type BattlePanelResultsSurfaceProps = {
  chips?: BattlePanelFilterChip[];
  children: ReactNode;
  clearFiltersLabel?: string;
  footer?: ReactNode;
  onClearFilters?: () => void;
  selectionBar?: ReactNode;
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
  withHorizontalScroll?: boolean;
};

export const BattlePanelResultsSurface = ({
  chips = [],
  children,
  clearFiltersLabel,
  footer,
  onClearFilters,
  selectionBar,
  toolbar,
  toolbarEnd,
  withHorizontalScroll = true,
}: BattlePanelResultsSurfaceProps) => {
  const shouldShowChips =
    chips.length > 0 && clearFiltersLabel !== undefined && onClearFilters;

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
      {(toolbar || toolbarEnd) && (
        <div className="grid shrink-0 gap-2 border-b border-border bg-background/80 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">{toolbar}</div>
          {toolbarEnd && (
            <div className="flex min-h-8 flex-wrap items-center justify-end gap-2">
              {toolbarEnd}
            </div>
          )}
        </div>
      )}
      {shouldShowChips && (
        <BattlePanelFilterChipList
          chips={chips}
          clearLabel={clearFiltersLabel}
          onClear={onClearFilters}
        />
      )}
      <ScrollArea className="relative min-h-0 flex-1">
        <div className={cn(!withHorizontalScroll && "min-w-0")}>{children}</div>
        {withHorizontalScroll && <ScrollBar orientation="horizontal" />}
      </ScrollArea>
      {selectionBar && (
        <div className="shrink-0 border-t border-border bg-background/95">
          {selectionBar}
        </div>
      )}
      {footer}
    </Card>
  );
};
