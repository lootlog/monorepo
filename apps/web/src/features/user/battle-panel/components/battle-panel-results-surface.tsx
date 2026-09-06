import { useTranslation } from "react-i18next";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import type { ReactNode } from "react";
import {
  BattlePanelFilterChipList,
  type BattlePanelFilterChip,
} from "./battle-panel-filter-chip-list";

type BattlePanelResultsSurfaceProps = {
  title?: string;
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
  title,
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
  const { t } = useTranslation();
  const shouldShowChips =
    chips.length > 0 && clearFiltersLabel !== undefined && onClearFilters;

  return (
    <SectionCard className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
      <SectionCardHeader
        title={title ?? t("battlePanel.navigation.battles")}
        actions={
          <>
            {toolbar}
            {toolbarEnd}
          </>
        }
        className="shrink-0"
      />
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
    </SectionCard>
  );
};
