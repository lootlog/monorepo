import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";

export const DETAIL_BAR_TOOLBAR_CELL_CLASS =
  "@max-[36rem]/detail-bar:h-14 @max-[36rem]/detail-bar:w-auto @max-[36rem]/detail-bar:flex-auto @max-[36rem]/detail-bar:flex-col @max-[36rem]/detail-bar:gap-1 @max-[36rem]/detail-bar:px-1 @max-[36rem]/detail-bar:text-xs";

type DetailBarProps = {
  meta: ReactNode;
  actions?: ReactNode;
};

export const DetailBar = ({ meta, actions }: DetailBarProps) => (
  <div
    data-list-tile
    className={cn(
      "@container/detail-bar relative flex flex-wrap gap-x-4 gap-y-px overflow-clip",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    <div className="flex min-h-12 min-w-0 flex-auto flex-wrap items-center gap-x-4 gap-y-1 py-2">
      {meta}
    </div>
    {actions && (
      <div className="relative flex max-w-full items-center gap-2 py-2 @max-[36rem]/detail-bar:w-full @max-[36rem]/detail-bar:gap-1 before:pointer-events-none before:absolute before:-top-px before:left-[-100vw] before:h-px before:w-[200vw] before:bg-border">
        {actions}
      </div>
    )}
  </div>
);
