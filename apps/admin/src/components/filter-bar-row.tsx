import { FilterBarContext } from "@lootlog/ui/components/filter-bar-context";
import type { ReactNode } from "react";
import { text } from "@/lib/messages";

export function FilterBarRow({
  search,
  children,
}: {
  search: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={text.filtersLabel}
      className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 border-b border-sidebar-border px-3 py-2 sm:px-4"
    >
      <FilterBarContext value>
        {search}
        {children ? (
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
            {children}
          </div>
        ) : null}
      </FilterBarContext>
    </div>
  );
}
