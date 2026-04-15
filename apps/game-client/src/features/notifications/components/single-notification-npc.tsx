import type { FC } from "react";
import type { NotificationWithServers } from "@/store/notifications.store";

type SingleNotificationNpcProps = {
  notification: NotificationWithServers;
};

export const SingleNotificationNpc: FC<SingleNotificationNpcProps> = ({
  notification,
}) => {
  if (!notification.npc) return null;

  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col">
      <div className="ll:flex ll:gap-1 ll:overflow-hidden ll:text-xs">
        <span className="ll:min-w-0 ll:truncate ll:font-semibold">
          {notification.npc.name}
        </span>
        <span className="ll:shrink-0">
          ({notification.npc.lvl}
          {notification.npc.prof})
        </span>
      </div>
      <div className="ll:flex ll:gap-1 ll:overflow-hidden ll:text-[11px] ll:text-gray-400">
        <span className="ll:min-w-0 ll:truncate">
          {notification.npc.location}
        </span>
        <span className="ll:shrink-0">
          ({notification.npc.x}, {notification.npc.y})
        </span>
        {notification.isGatheringParty && (
          <span className="ll:shrink-0 ll:font-semibold ll:text-purple-300">
            Zbiera grupę
          </span>
        )}
      </div>
    </div>
  );
};
