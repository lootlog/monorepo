import { type FC, Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import {
  type PartyGatheringNotification,
  type NotificationWithServers,
  useNotificationsStore,
} from "@/store/notifications.store";
import { Separator } from "@radix-ui/react-select";
import { getNpcTypeByWt } from "@lootlog/types";
import { format } from "date-fns";
import { SingleNotificationNpc } from "@/features/notifications/components/single-notification-npc";
import { SingleNotificationMessage } from "@/features/notifications/components/single-notification-message";
import { SingleNotificationPartyGathering } from "@/features/notifications/components/single-notification-party-gathering";
import {
  getBackgroundColor,
  getGradient,
} from "@/utils/notifications-and-detector/background";
import { Progress } from "@/components/ui/progress";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { useMemberInvalidation } from "@/hooks/api/use-member-invalidation";
import { useGuilds } from "@/hooks/api/use-guilds";
import { NpcType } from "@/hooks/api/use-npcs";
import { Game } from "@/lib/game";

export type SingleNotificationProps = {
  notification: NotificationWithServers | PartyGatheringNotification;
  index: number;
  showCloseButton?: boolean;
  now?: number;
};

const isPartyGatheringNotification = (
  notification: NotificationWithServers | PartyGatheringNotification,
): notification is PartyGatheringNotification => {
  return "type" in notification && notification.type === "party-gathering";
};

export const SingleNotification: FC<SingleNotificationProps> = ({
  notification,
  index,
  showCloseButton = false,
  now,
}) => {
  const { removeNotification, settings } = useNotificationsStore();
  const characterId = String(Game.hero.id);
  const { data: members } = useGuildMembers(notification.guildId);
  const { data: guilds } = useGuilds();
  const guildMember = members?.[notification.discordId];
  useMemberInvalidation(
    notification.guildId,
    !guildMember ? notification.discordId : undefined,
  );

  const isPartyGathering = isPartyGatheringNotification(notification);

  const npcType =
    !isPartyGathering && notification.npc
      ? getNpcTypeByWt(NpcType, notification.npc.wt!)
      : undefined;

  const key = (
    isPartyGathering ? "party-gathering" : (npcType ?? "message")
  ) as keyof (typeof settings)[string];

  const settingsByNpcType = characterId
    ? settings[characterId]?.[key]
    : undefined;
  const autoHideTimeout = settingsByNpcType?.autoHideTimeout ?? 0;

  const createdAtMs = useMemo(
    () => new Date(notification.createdAt).getTime(),
    [notification.createdAt],
  );
  const secondsLeft = useMemo(() => {
    if (!autoHideTimeout || autoHideTimeout <= 0) return 0;
    const endAt = createdAtMs + autoHideTimeout * 1000;
    const diffMs = endAt - (now ?? Date.now());
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 1000);
  }, [autoHideTimeout, createdAtMs, now]);

  const serverNames = useMemo(
    () =>
      notification.servers
        .map((server) => guilds?.find((g) => g.id === server)?.name ?? "")
        .filter(Boolean),
    [notification.servers, guilds],
  );

  const handleRemoveNotification = () =>
    removeNotification(notification.notificationId);

  const time = format(new Date(notification.createdAt), "HH:mm");
  const color = getBackgroundColor(key, true);

  const secondsLeftPercentage =
    autoHideTimeout > 0 && secondsLeft > 0
      ? (secondsLeft / autoHideTimeout) * 100
      : 0;

  return (
    <Fragment key={notification.notificationId}>
      <span
        className={cn("ll:flex ll:gap-4 ll:px-2 ll:py-2")}
        style={{
          background:
            index === 0
              ? getGradient(key, settingsByNpcType?.highlight)
              : getBackgroundColor(key, settingsByNpcType?.highlight),
        }}
      >
        {isPartyGathering && (
          <SingleNotificationPartyGathering
            notification={notification}
            member={guildMember}
            serverNames={serverNames}
            time={time}
          />
        )}
        {!isPartyGathering && notification.npc && (
          <SingleNotificationNpc
            serverNames={serverNames}
            member={guildMember}
            notification={notification}
            time={time}
          />
        )}
        {!isPartyGathering && notification.message && (
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
              "ll-custom-cursor-pointer ll:text-gray-300 ll:hover:text-gray-100 ll:transition-colors",
            )}
            size="16"
            onClick={handleRemoveNotification}
          />
        )}
      </span>
      <span className="ll:flex ll:flex-col ll:justify-center" />
      {autoHideTimeout > 0 && secondsLeft > 0 && (
        <>
          <Separator className="ll:bg-black/70 ll:h-px" />
          <Progress value={secondsLeftPercentage} indicatorColor={color} />
          <Separator className="ll:bg-black/70 ll:h-px" />
        </>
      )}
    </Fragment>
  );
};
