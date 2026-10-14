import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { NotificationTileSkeleton } from "./notification-tile-skeleton";
import {
  NOTIFICATIONS_COLUMNS_CLASS,
  NOTIFICATIONS_MAIN_CLASS,
  NOTIFICATIONS_RAIL_CLASS,
} from "./notifications-layout";

const heading = (
  <div className={cn(LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS)}>
    <Skeleton className="h-3 w-20" />
  </div>
);

/** Mirrors the notification sections: rules and channels beside the queue and history. */
export const NotificationSettingsSkeleton = () => (
  <div aria-hidden="true" className={NOTIFICATIONS_COLUMNS_CLASS}>
    <div className={NOTIFICATIONS_MAIN_CLASS}>
      {heading}
      {Array.from({ length: 4 }, (_, index) => (
        <NotificationTileSkeleton key={index} withIcon actions={3} />
      ))}
      {heading}
      {Array.from({ length: 2 }, (_, index) => (
        <NotificationTileSkeleton key={index} withIcon actions={1} />
      ))}
    </div>
    <div className={NOTIFICATIONS_RAIL_CLASS}>
      {heading}
      <NotificationTileSkeleton actions={1} />
      {heading}
      {Array.from({ length: 3 }, (_, index) => (
        <NotificationTileSkeleton key={index} />
      ))}
    </div>
  </div>
);
