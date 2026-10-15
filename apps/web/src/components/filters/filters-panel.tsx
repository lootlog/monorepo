import { FilterCount } from "@/components/common/filter-count";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { SlidersHorizontal } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FiltersPanelProps = {
  title: string;
  activeFilterCount: number;
  /** Clears every filter from the header while any is active. */
  onClear?: () => void;
  children: ReactNode;
  titleAs: ComponentType<{ className?: string; children: ReactNode }>;
  hasCloseButton: boolean;
};

/** The header and scrolling fields of a `FiltersOverlay`. */
export const FiltersPanel = ({
  title,
  activeFilterCount,
  onClear,
  children,
  titleAs: Title,
  hasCloseButton,
}: FiltersPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className={cn(
          "flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border pl-4",
          hasCloseButton ? "pr-12" : "pr-2",
        )}
      >
        {/* The icon that opens the panel, in the accent, tells the title from the fields' labels. */}
        <SlidersHorizontal
          aria-hidden="true"
          className="size-4 shrink-0 text-primary"
        />
        <Title className="text-sm font-semibold">{title}</Title>
        <FilterCount count={activeFilterCount} />
        {onClear && activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={onClear}
          >
            {t("common.clear")}
          </Button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">{children}</div>
      </ScrollArea>
    </div>
  );
};
