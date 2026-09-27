import type {
  MentionNotification,
  NotificationWithServers,
} from "@/store/notifications.store";
import type { FC } from "react";

type SingleNotificationMessageProps = {
  notification: MentionNotification | NotificationWithServers;
};

export const SingleNotificationMessage: FC<SingleNotificationMessageProps> = ({
  notification,
}) => {
  return (
    <p className="ll:m-0 ll:text-xs ll:leading-4 ll:break-words ll:text-white/95">
      {notification.message}
    </p>
  );
};
