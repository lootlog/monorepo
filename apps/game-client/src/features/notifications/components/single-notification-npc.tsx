import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import { useVolunteer } from "@/hooks/api/use-volunteer";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import {
  useNotificationsStore,
  type NotificationWithServers,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import type { FC } from "react";

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
  const volunteer = useVolunteer();
  const { clearNotifications } = useNotificationsStore();
  const { setOpen } = useWindowsStore();

  const handleClick = () => {
    volunteer.mutate({
      notificationId: notification.notificationId,
      targetDiscordId: notification.discordId,
      world: notification.world,
    });
    setOpen("notifications", false);
    clearNotifications();
  };

  if (!notification.npc) return null;

  return (
    <div className="ll:flex ll:w-full ll:flex-col ll:gap-1">
      <div className="ll:flex ll:items-center ll:gap-2">
        <img
          src={avatarUrl}
          alt="Avatar"
          className="ll:h-7 ll:w-7 ll:rounded-full"
        />
        <span className="ll:font-semibold" style={{ color: `#${color}` }}>
          {member?.name}
        </span>
        <span className="ll:text-[11px] ll:text-gray-300">
          {time}@{serverNames.join(", ")} - {notification.world}
        </span>
      </div>

      <div className="ll:flex ll:gap-4 ll:py-1 ll:px-2">
        <NpcTile
          npc={notification.npc}
          className="ll:max-h-10"
          containerClassName="ll:w-6"
        />
        <div className="ll:flex ll:flex-col">
          <span>
            <span className="ll:text-[12px] ll:font-semibold">
              {notification.npc.name}{" "}
            </span>
            <span className="ll:text-[11px]">
              ({notification.npc.lvl}
              {notification.npc.prof})
            </span>
          </span>
          <span className="ll:mb-1 ll:text-[11px]">
            {notification.npc.location} ({notification.npc.x},{" "}
            {notification.npc.y})
          </span>
        </div>
        {notification.isGatheringParty && (
          <div className="ll:flex ll:items-center ll:justify-center ll:ml-auto ll:mr-4">
            <Button onClick={handleClick}>Idę</Button>
          </div>
        )}
      </div>
    </div>
  );
};
