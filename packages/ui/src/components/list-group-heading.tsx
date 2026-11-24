import { cn } from "cn";
import type { ReactNode } from "react";
import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@lootlog/ui/lib/list-tile";

type ListGroupHeadingProps = {
  id: string;
  children: ReactNode;
  count?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export const ListGroupHeading = ({
  id,
  children,
  count,
  trailing,
  className,
}: ListGroupHeadingProps) => (
  <div
    className={cn(LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS, className)}
  >
    <h2 id={id} className="flex min-w-0 items-center gap-2">
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 text-2xs leading-4 font-medium tabular-nums">
          {count}
        </span>
      )}
    </h2>
    {trailing && (
      <div className="ml-auto flex shrink-0 items-center">{trailing}</div>
    )}
  </div>
);
