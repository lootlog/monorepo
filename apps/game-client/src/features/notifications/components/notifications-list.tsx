import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleNotification } from "@/features/notifications/components/single-notification";
import { getGuildNamesById, useGuilds } from "@/hooks/api/use-guilds";
import type {
  NotificationWithServers,
  PartyGatheringNotification,
} from "@/store/notifications.store";
import type { FC } from "react";

type NotificationsListProps = {
  notifications?: (NotificationWithServers | PartyGatheringNotification)[];
  now?: number;
};

export const NotificationsList: FC<NotificationsListProps> = ({
  notifications,
  now,
}) => {
  const { data: guilds } = useGuilds();
  const guildNamesById = getGuildNamesById(guilds);

  return (
    <ScrollArea
      className="ll:p-0 ll:flex ll:flex-col ll:gap-4 ll:w-full ll:box-border ll:pl-0 ll:max-h-64"
      type="auto"
    >
      {notifications?.map((notification, i) => {
        return (
          <SingleNotification
            key={notification.notificationId}
            now={now}
            notification={notification}
            index={i}
            guildNamesById={guildNamesById}
            showCloseButton={notifications.length > 1}
          />
        );
      })}
    </ScrollArea>
  );
};
