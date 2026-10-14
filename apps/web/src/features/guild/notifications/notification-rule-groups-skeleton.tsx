import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { NOTIFICATION_GROUP_HEADING_CLASS } from "./components/notification-rule-groups";
import { NotificationRuleRowSkeleton } from "./notification-rule-row-skeleton";

const GROUP_SIZES = [3, 4];

/** Stands in for `NotificationRuleGroups`: banded headings above rule rows. */
export const NotificationRuleGroupsSkeleton = () => (
  <div aria-hidden="true">
    {GROUP_SIZES.map((size, groupIndex) => (
      <div key={groupIndex}>
        <div
          className={cn(
            LIST_GROUP_HEADING_CLASS,
            LIST_TILE_INSET_CLASS,
            NOTIFICATION_GROUP_HEADING_CLASS,
          )}
        >
          <Skeleton className="h-3.5 w-44" />
        </div>
        {Array.from({ length: size }, (_, index) => (
          <NotificationRuleRowSkeleton key={index} />
        ))}
      </div>
    ))}
  </div>
);
