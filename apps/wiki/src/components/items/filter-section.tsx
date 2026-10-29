import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { t } from "@/i18n/messages";

type FilterSectionProps = {
  title: string;
  /** How many of the section's options filter now. */
  count: number;
  onClear: () => void;
  /** Sections that filter open on their own, so a link shows what it set. */
  defaultOpen?: boolean;
  children: ReactNode;
};

/** A titled group of item filters that folds away, with its own reset. */
export function FilterSection({
  title,
  count,
  onClear,
  defaultOpen = false,
  children,
}: FilterSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen || count > 0}
      className="border-b border-border/50 last:border-b-0"
    >
      <div className="flex items-center gap-1 py-1">
        <CollapsibleTrigger className="group/section flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-[rotate] duration-200 ease-out group-data-panel-open/section:rotate-0 motion-reduce:transition-none"
          />
          <span className="min-w-0 truncate">{title}</span>
          {count > 0 ? (
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground tabular-nums">
              {count}
            </span>
          ) : null}
        </CollapsibleTrigger>
        {count > 0 ? (
          <button
            type="button"
            aria-label={t("filters.clearSection", { section: title })}
            title={t("filters.clearSection", { section: title })}
            onClick={onClear}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        <div className="px-1 pt-1 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
