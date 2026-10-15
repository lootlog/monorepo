import { Button } from "@lootlog/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { useTranslation } from "react-i18next";
import { FilterCount } from "@/components/common/filter-count";

type LootFilterSectionProps = {
  icon: LucideIcon;
  title: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
  /** Lets the rail scroll the panel to this section and focus its title. */
  triggerRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

/** One collapsible group of the filters panel, separated by a rule. */
export const LootFilterSection = ({
  icon: Icon,
  title,
  count,
  open,
  onOpenChange,
  onClear,
  triggerRef,
  children,
}: LootFilterSectionProps) => {
  const { t } = useTranslation();

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      render={<section aria-label={title} />}
      className="border-b border-sidebar-border"
    >
      <div className="flex h-11 items-center gap-1 pr-2 pl-4">
        <CollapsibleTrigger
          ref={triggerRef}
          className="group/section flex h-full min-w-0 flex-1 cursor-pointer scroll-mt-2 items-center gap-2 rounded-md text-left text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
          {title}
          <FilterCount count={count} />
          <ChevronDown
            aria-hidden="true"
            className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/section:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        {count > 0 && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            aria-label={t("loots.filtersPanel.clearSection", {
              section: title,
            })}
            onClick={onClear}
          >
            {t("loots.filtersPanel.clear")}
          </Button>
        )}
      </div>
      <CollapsibleContent className="space-y-4 px-4 pt-1 pb-5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
