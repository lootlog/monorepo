import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";

type SettingsDetailBarProps = {
  /** `MetaItem`s and other details about the page's subject. */
  meta: ReactNode;
  /** Controls at the row's end. */
  actions?: ReactNode;
};

/** The row of details that opens a role, monster or member page. */
export const SettingsDetailBar = ({
  meta,
  actions,
}: SettingsDetailBarProps) => (
  <div
    data-list-tile
    className={cn(
      "flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 py-2",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    <div className="flex min-h-8 min-w-0 flex-auto flex-wrap items-center gap-x-4 gap-y-1">
      {meta}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
      </div>
    )}
  </div>
);
