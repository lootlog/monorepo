import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";

/**
 * An action's look in the narrow bar's toolbar: its icon over a short label,
 * as wide as the label plus its share of the spare width. Hide a long label there with `@max-[36rem]/detail-bar:hidden`.
 */
export const DETAIL_BAR_TOOLBAR_CELL_CLASS =
  "@max-[36rem]/detail-bar:h-14 @max-[36rem]/detail-bar:w-auto @max-[36rem]/detail-bar:flex-auto @max-[36rem]/detail-bar:flex-col @max-[36rem]/detail-bar:gap-1 @max-[36rem]/detail-bar:px-1 @max-[36rem]/detail-bar:text-xs";

type DetailBarProps = {
  /** `MetaItem`s and other details about the page's subject. */
  meta: ReactNode;
  /** Controls at the row's end. */
  actions?: ReactNode;
};

/**
 * The row of details that opens a `DetailPage`. When the actions wrap under
 * the details, a rule runs across the bar between them. The rule hangs a
 * pixel above the actions, so on the details' row it falls outside the bar
 * and is clipped. The actions keep to one row; on a bar narrower than 36rem
 * they become a toolbar across it, one cell per action sharing the spare
 * width (`DETAIL_BAR_TOOLBAR_CELL_CLASS`).
 */
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
