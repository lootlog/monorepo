import { NpcTile } from "@/components/npc-tile";
import { GuildMember } from "@/hooks/api/use-guild-members";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { NotificationWithServers } from "@/store/notifications.store";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import { FC } from "react";

export type SingleNotificationNpcProps = {
  notification: NotificationWithServers;
  serverNames?: string[];
  member?: GuildMember;
  time?: string;
};

export const SingleNotificationNpc: FC<SingleNotificationNpcProps> = ({
  notification,
  serverNames = [],
  member,
  time,
}) => {
  const avatarUrl = getDiscordAvatarUrl(member?.userId, member?.avatar);
  const color = useMemberColor(member);

  if (!notification.npc) return null;

  return (
    <span className="ll-w-full ll-flex ll-gap-2">
      <img
        src={avatarUrl}
        className="ll-w-8 ll-h-8 ll-rounded-full"
        alt="Avatar"
      />
      <span className="ll-flex ll-flex-col ll-justify-center ll-gap-2">
        <span className="ll-flex ll-flex-col ll-gap-1">
          <span>
            <span className="ll-font-semibold" style={{ color: `#${color}` }}>
              {member?.name}
            </span>
            <span className="ll-text-[11px] ll-text-gray-300">
              {" "}
              {time}@{serverNames.join(", ")} - {notification.world}
            </span>
          </span>
          <span className="ll-flex ll-gap-4 ll-py-1">
            <NpcTile
              npc={notification.npc}
              className="ll-max-h-12"
              containerClassName="ll-w-6"
            />
            <span className="ll-flex ll-flex-col">
              <span>
                <span className="ll-font-semibold ll-text-xs">
                  {notification.npc.name}{" "}
                </span>
                <span>
                  ({notification.npc.lvl}
                  {notification.npc.prof})
                </span>
              </span>
              <span className="ll-mb-2 ll-text-xs">
                {notification.npc.location} ({notification.npc.x},{" "}
                {notification.npc.y})
              </span>
            </span>
          </span>
        </span>
      </span>
    </span>
  );
};
