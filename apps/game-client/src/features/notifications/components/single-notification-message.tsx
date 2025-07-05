import { GuildMember } from "@/hooks/api/use-guild-members";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { NotificationWithServers } from "@/store/notifications.store";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import { FC } from "react";

export type SingleNotificationMessageProps = {
  notification: NotificationWithServers;
  time?: string;
  member?: GuildMember;
  serverNames?: string[];
};

export const SingleNotificationMessage: FC<SingleNotificationMessageProps> = ({
  notification,
  member,
  time,
  serverNames = [],
}) => {
  const avatarUrl = getDiscordAvatarUrl(member?.userId, member?.avatar);
  const color = useMemberColor(member);

  return (
    <span className="ll-w-full ll-flex ll-gap-2">
      <span className="ll-flex ll-flex-col ll-gap-4">
        <img
          src={avatarUrl}
          className="ll-w-8 ll-h-8 ll-rounded-full"
          alt="Avatar"
        />
      </span>
      <span className="ll-flex ll-flex-col ll-justify-center ll-gap-2">
        <span className="ll-flex ll-flex-col ll-gap-1">
          <span>
            <span className="ll-font-semibold" style={{ color: `#${color}` }}>
              {member?.name}
            </span>
            <span className="ll-text-[11px] ll-text-gray-300">
              {" "}
              {time}@{serverNames.join(", ")}
            </span>
          </span>
          <span className="ll-text-xs">{notification.message}</span>
        </span>
      </span>
    </span>
  );
};
