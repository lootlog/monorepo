import type { NotificationWithServers } from "@/store/notifications.store";
import type { FC } from "react";

type SingleNotificationMessageProps = {
  notification: NotificationWithServers;
};

export const SingleNotificationMessage: FC<SingleNotificationMessageProps> = ({
  notification,
}) => {
  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:justify-center">
      <p className="ll:text-[12px] ll:leading-[1.1rem] ll:text-white/95">
        {notification.message}
      </p>
    </div>
  );
};
