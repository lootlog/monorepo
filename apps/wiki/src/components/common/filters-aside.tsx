import type { ReactNode } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { t } from "@/i18n/messages";
import { FiltersHeader } from "./filters-header";

type FiltersAsideProps = {
  /** How many filters narrow the search now. */
  count: number;
  /** The search's filter panel. */
  children: ReactNode;
};

/**
 * A search's filters docked beside its results from tablet width up, under
 * the top bar like the set dock: a rule, not a card.
 */
export function FiltersAside({ count, children }: FiltersAsideProps) {
  return (
    <aside
      aria-label={t("filters.title")}
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem-var(--wiki-dock-height,0rem))] flex-col border-r border-sidebar-border md:-ml-6 md:flex"
    >
      <FiltersHeader count={count} />
      <ScrollArea orientation="vertical" className="min-h-0 flex-1">
        <div className="px-3">{children}</div>
      </ScrollArea>
    </aside>
  );
}
