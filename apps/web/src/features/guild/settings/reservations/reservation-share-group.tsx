import { ListGroupHeading } from "@/components/common/list-group-heading";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";
import { ReservationShareTileSkeleton } from "./reservation-share-tile-skeleton";

/** A group of partner or invitation tiles, or a line saying it is empty. */
export const ReservationShareGroup = ({
  id,
  title,
  count,
  isPending,
  emptyLabel,
  children,
}: {
  id: string;
  title: string;
  count: number | undefined;
  isPending: boolean;
  emptyLabel: string;
  children: ReactNode;
}) => (
  <section aria-labelledby={id} aria-busy={isPending}>
    <ListGroupHeading id={id} count={count}>
      {title}
    </ListGroupHeading>
    {isPending ? (
      <div aria-hidden="true">
        <ReservationShareTileSkeleton />
      </div>
    ) : count ? (
      <ul>{children}</ul>
    ) : (
      <p
        data-list-tile
        className={cn(
          LIST_TILE_RULE_CLASS,
          LIST_TILE_INSET_CLASS,
          "flex min-h-14 items-center py-2 text-sm text-muted-foreground",
        )}
      >
        {emptyLabel}
      </p>
    )}
  </section>
);
