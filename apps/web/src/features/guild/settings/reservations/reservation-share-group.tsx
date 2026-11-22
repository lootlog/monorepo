import { ListGroupHeading } from "@/components/common/list-group-heading";
import { ListTileEmpty } from "@/components/common/list-tile-empty";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ReservationShareTileSkeleton } from "./reservation-share-tile-skeleton";

export const ReservationShareGroup = ({
  id,
  title,
  count,
  isPending,
  emptyLabel,
  emptyIcon,
  children,
}: {
  id: string;
  title: string;
  count: number | undefined;
  isPending: boolean;
  emptyLabel: string;
  emptyIcon: LucideIcon;
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
      <ListTileEmpty icon={emptyIcon}>{emptyLabel}</ListTileEmpty>
    )}
  </section>
);
