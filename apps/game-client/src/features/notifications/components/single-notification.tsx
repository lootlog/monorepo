import { FC, Fragment, useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import {
  NotificationWithServers,
  useNotificationsStore,
} from "@/store/notifications.store";
import { Separator } from "@radix-ui/react-select";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { useGlobalStore } from "@/store/global.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { useGuilds } from "@/hooks/api/use-guilds";
import { format } from "date-fns";
import { SingleNotificationNpc } from "@/features/notifications/components/single-notification-npc";
import { SingleNotificationMessage } from "@/features/notifications/components/single-notification-message";
import {
  getBackgroundColor,
  getGradient,
} from "@/utils/notifications-and-detector/background";
import { Progress } from "@/components/ui/progress";

export type SingleNotificationProps = {
  notification: NotificationWithServers;
  index: number;
  showCloseButton?: boolean;
};

export const SingleNotification: FC<SingleNotificationProps> = ({
  notification,
  index,
  showCloseButton = false,
}) => {
  const { removeNotification, settings } = useNotificationsStore();
  const { characterId } = useGlobalStore((s) => s.gameState);
  const { data: members } = useGuildMembers(notification.guildId);
  const { data: guilds } = useGuilds();
  const guildMember = members?.[notification.discordId];

  const npcType = notification.npc
    ? getNpcTypeByWt(notification.npc.wt!)
    : undefined;

  const key = (
    npcType ? npcType : "message"
  ) as keyof (typeof settings)[string];

  const settingsByNpcType = characterId
    ? settings[characterId]?.[key]
    : undefined;
  const autoHideTimeout = settingsByNpcType?.autoHideTimeout || 0;

  const [secondsLeft, setSecondsLeft] = useState(autoHideTimeout);

  useEffect(() => {
    if (!autoHideTimeout || autoHideTimeout <= 0) return;
    console.log("ritern", autoHideTimeout);
    setSecondsLeft(autoHideTimeout);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          removeNotification(notification.notificationId);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoHideTimeout, notification.notificationId]);

  const serverNames = useMemo(
    () =>
      notification.servers
        .map((server) => guilds?.find((g) => g.id === server)?.name || "")
        .filter(Boolean),
    [notification.servers, guilds]
  );

  const handleRemoveNotification = () =>
    removeNotification(notification.notificationId);

  const time = format(new Date(notification.createdAt), "HH:mm");
  const color = getBackgroundColor(key, true);

  const secondsLeftPercentage =
    autoHideTimeout > 0 ? (secondsLeft / autoHideTimeout) * 100 : 0;

  console.log(autoHideTimeout);

  return (
    <Fragment key={notification.notificationId}>
      <span
        className={cn("ll-flex ll-gap-4 ll-px-2 ll-py-2")}
        style={{
          background:
            index === 0
              ? getGradient(key, settingsByNpcType?.highlight)
              : getBackgroundColor(key, settingsByNpcType?.highlight),
        }}
      >
        {notification.npc && (
          <SingleNotificationNpc
            serverNames={serverNames}
            member={guildMember}
            notification={notification}
            time={time}
          />
        )}
        {notification.message && (
          <SingleNotificationMessage
            notification={notification}
            member={guildMember}
            serverNames={serverNames}
            time={time}
          />
        )}
        {showCloseButton && (
          <XIcon
            className={cn(
              "ll-custom-cursor-pointer ll-text-gray-300 hover:ll-text-gray-100 ll-transition-colors"
            )}
            size="16"
            onClick={handleRemoveNotification}
          />
        )}
      </span>
      <span className="ll-flex ll-flex-col ll-justify-center"></span>
      {autoHideTimeout > 0 && (
        <>
          <Separator className="ll-bg-black/70 ll-h-[1px]" />
          <Progress value={secondsLeftPercentage} indicatorColor={color} />
          <Separator className="ll-bg-black/70 ll-h-[1px]" />
        </>
      )}
    </Fragment>
  );
};
