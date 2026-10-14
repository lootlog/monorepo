import { ListGroupHeading } from "@/components/common/list-group-heading";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";

type NotificationsSectionProps = {
  id: string;
  title: string;
  count?: ReactNode;
  trailing?: ReactNode;
  /** A line between the heading and the tiles, such as a warning. */
  notice?: ReactNode;
  /** Shown as the group's only row when it has no tiles. */
  emptyLabel?: string;
  children?: ReactNode;
};

/** A group of notification tiles under its heading. */
export const NotificationsSection = ({
  id,
  title,
  count,
  trailing,
  notice,
  emptyLabel,
  children,
}: NotificationsSectionProps) => (
  <section aria-labelledby={id}>
    <ListGroupHeading id={id} count={count} trailing={trailing}>
      {title}
    </ListGroupHeading>
    {notice}
    {emptyLabel ? (
      <p
        data-list-tile
        className={cn(
          LIST_TILE_RULE_CLASS,
          LIST_TILE_INSET_CLASS,
          "py-4 text-sm text-muted-foreground",
        )}
      >
        {emptyLabel}
      </p>
    ) : (
      children
    )}
  </section>
);
