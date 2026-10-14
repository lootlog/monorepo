import { ListGroupHeading } from "@/components/common/list-group-heading";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";
import { NOTIFICATION_GROUP_HEADING_CLASS } from "./notification-rule-groups";

type NotificationFormSectionProps = {
  id: string;
  title: string;
  description?: string;
  /** Lets wide content, such as the editor beside its preview, use the full width. */
  wide?: boolean;
  children: ReactNode;
};

/** One step of the rule form under a banded heading, as rule groups are shown. */
export const NotificationFormSection = ({
  id,
  title,
  description,
  wide = false,
  children,
}: NotificationFormSectionProps) => (
  <section aria-labelledby={id}>
    {/* The section's name stays pinned while its fields scroll past. */}
    <ListGroupHeading
      id={id}
      className={cn(
        NOTIFICATION_GROUP_HEADING_CLASS,
        "sticky top-(--page-sticky-top) z-10",
      )}
    >
      {title}
    </ListGroupHeading>
    <div className={cn("py-5", LIST_TILE_INSET_CLASS)}>
      <div className={cn("flex flex-col gap-5", !wide && "max-w-3xl")}>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
    </div>
  </section>
);
