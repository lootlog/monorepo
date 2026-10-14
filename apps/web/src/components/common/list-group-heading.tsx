import { cn } from "cn";
import type { ReactNode } from "react";
import { LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS } from "./list-tile";

type ListGroupHeadingProps = {
  /** Lets the group's `section` name itself with `aria-labelledby`. */
  id: string;
  children: ReactNode;
  /** How many tiles the group holds, or how much of a limit they use. */
  count?: ReactNode;
  /** A control at the heading's end, such as a link to the full list. */
  trailing?: ReactNode;
};

/** The heading above a group of tiles in a tiled list. */
export const ListGroupHeading = ({
  id,
  children,
  count,
  trailing,
}: ListGroupHeadingProps) => (
  <div className={cn(LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS)}>
    <h2 id={id} className="flex min-w-0 items-center gap-2">
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 text-[11px] leading-4 font-medium tabular-nums">
          {count}
        </span>
      )}
    </h2>
    {trailing && (
      <div className="ml-auto flex shrink-0 items-center">{trailing}</div>
    )}
  </div>
);
