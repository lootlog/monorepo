import type { ReactNode } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { t } from "@/i18n/messages";
import { FiltersHeader } from "./filters-header";

type FiltersAsideProps = {
  count: number;
  children: ReactNode;
};

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
