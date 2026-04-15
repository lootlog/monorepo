import { CharacterTile } from "@/components/character-tile";
import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { useVolunteer } from "@/hooks/api/use-volunteer";
import { useMemberInvalidation } from "@/hooks/api/use-member-invalidation";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { Game } from "@/lib/game";
import { cn } from "@/lib/utils";
import {
  type PartyGatheringNotification,
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import {
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { getNpcTypeByWt } from "@lootlog/types";
import { format } from "date-fns";
import { XIcon } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef } from "react";
import { NpcType } from "@/hooks/api/use-npcs";
import { SingleNotificationMessage } from "@/features/notifications/components/single-notification-message";
import { SingleNotificationNpc } from "@/features/notifications/components/single-notification-npc";
import { SingleNotificationPartyGathering } from "@/features/notifications/components/single-notification-party-gathering";

const AUTO_HIDE_RING_PATH =
  "M 50 0 H 2 A 2 2 0 0 0 0 2 V 38 A 2 2 0 0 0 2 40 H 98 A 2 2 0 0 0 100 38 V 2 A 2 2 0 0 0 98 0 H 50";

type SingleNotificationProps = {
  guildNamesById: Record<string, string>;
  notification: StoredNotification;
  notificationAnimationCycle: number | null;
  showCloseButton?: boolean;
};

const isPartyGatheringNotification = (
  notification: StoredNotification,
): notification is StoredNotification & PartyGatheringNotification => {
  return "type" in notification && notification.type === "party-gathering";
};

const renderLeadingVisual = (
  notification: StoredNotification,
  avatarUrl: string,
) => {
  if (isPartyGatheringNotification(notification)) {
    return (
      <div className="ll:flex ll:h-10 ll:w-8 ll:shrink-0 ll:items-center ll:justify-center ll:overflow-hidden">
        <CharacterTile
          character={{
            ...notification.character,
            id: Number(notification.character.characterId),
          }}
          className="ll:scale-75 ll:origin-center"
        />
      </div>
    );
  }

  if (notification.npc) {
    return (
      <NpcTile
        npc={notification.npc}
        className="ll:w-auto ll:max-w-7 ll:max-h-10 ll:object-contain"
        containerClassName="ll:w-7 ll:h-10 ll:shrink-0"
      />
    );
  }

  return (
    <div className="ll:flex ll:h-8 ll:w-8 ll:shrink-0 ll:items-center ll:justify-center">
      <img
        src={avatarUrl}
        alt="Avatar"
        className="ll:h-8 ll:w-8 ll:rounded-full ll:object-cover"
      />
    </div>
  );
};

const renderNotificationContent = ({
  notification,
  meetsLevelReq,
}: {
  notification: StoredNotification;
  meetsLevelReq: boolean;
}): ReactNode => {
  if (isPartyGatheringNotification(notification)) {
    return (
      <SingleNotificationPartyGathering
        notification={notification}
        meetsLevelReq={meetsLevelReq}
      />
    );
  }

  if (notification.npc) {
    return <SingleNotificationNpc notification={notification} />;
  }

  return <SingleNotificationMessage notification={notification} />;
};

export const SingleNotification: FC<SingleNotificationProps> = ({
  guildNamesById,
  notification,
  _notificationAnimationCycle,
  showCloseButton = false,
}) => {
  const removeNotification = useNotificationsStore(
    (state) => state.removeNotification,
  );
  const clearNotifications = useNotificationsStore(
    (state) => state.clearNotifications,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { settings } = useCurrentGameAccountNotificationSettings();
  const { data: members } = useGuildMembers(notification.guildId);
  const guildMember = members?.[notification.discordId];
  const volunteer = useVolunteer();
  const autoHidePathRef = useRef<SVGPathElement>(null);

  useMemberInvalidation(
    notification.guildId,
    !guildMember ? notification.discordId : undefined,
  );

  const avatarUrl = getDiscordAvatarUrl(
    guildMember?.userId,
    guildMember?.avatar,
  );
  const memberColor = useMemberColor(guildMember);
  const isPartyGathering = isPartyGatheringNotification(notification);
  const regularNotification = isPartyGathering ? null : notification;

  const npcType = regularNotification?.npc
    ? getNpcTypeByWt(NpcType, regularNotification.npc.wt)
    : undefined;

  const key = (
    isPartyGathering ? "party-gathering" : (npcType ?? "message")
  ) as keyof typeof settings;
  const categorySettings = settings[key];
  const autoHideTimeout = categorySettings?.autoHideTimeout ?? 0;
  const autoHideDurationMs = autoHideTimeout > 0 ? autoHideTimeout * 1000 : 0;

  const serverNames = notification.servers
    .map((server) => guildNamesById[server] ?? "")
    .filter(Boolean);
  const time = format(new Date(notification.createdAt), "HH:mm");
  const background = getBackgroundColor(key, categorySettings?.highlight);
  const borderColor = getBorderColor(key, categorySettings?.highlight);
  const metaText = `${time}@${serverNames.join(", ")}${notification.world ? ` - ${notification.world}` : ""}`;
  const senderName = guildMember?.name ?? "Nieznany";

  const heroLvl = Game.hero.lvl;
  const minLvl = isPartyGathering ? (notification.minLvl ?? 1) : 1;
  const maxLvl = isPartyGathering ? (notification.maxLvl ?? 500) : 500;
  const meetsLevelReq = heroLvl >= minLvl && heroLvl <= maxLvl;

  const handleRemoveNotification = () =>
    removeNotification(notification.notificationId);

  const handleVolunteer = () => {
    volunteer.mutate({
      notificationId: notification.notificationId,
      targetDiscordId: notification.discordId,
      world: notification.world,
    });
    setOpen("notifications", false);
    clearNotifications();
  };

  let actionLabel: string | null = null;

  if (isPartyGathering) {
    actionLabel = volunteer.isPending ? "..." : "Dołącz!";
  } else if (regularNotification?.isGatheringParty) {
    actionLabel = volunteer.isPending ? "..." : "Idę";
  }

  useEffect(() => {
    const path = autoHidePathRef.current;
    const svg = path?.ownerSVGElement;
    if (!path || !svg || autoHideDurationMs <= 0) return;

    const { width, height } = svg.getBoundingClientRect();
    const screenLength = String(2 * (width + height));

    path.style.strokeDasharray = screenLength;
    path.style.strokeDashoffset = "0";

    const animation = path.animate(
      [{ strokeDashoffset: "0" }, { strokeDashoffset: screenLength }],
      { duration: autoHideDurationMs, easing: "linear", fill: "forwards" },
    );

    return () => {
      animation.cancel();
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
    };
  }, [notification.receivedAtMs, autoHideDurationMs]);

  return (
    <div className="ll:w-full">
      <div
        className={cn(
          "ll:relative ll:flex ll:items-center ll:gap-2 ll:overflow-hidden ll:px-2 ll:py-1",
          "ll:rounded-sm",
          "ll:transition-[background-color,border-color] ll:duration-300",
        )}
        style={{ background }}
      >
        <svg
          className="ll:pointer-events-none ll:absolute ll:inset-0 ll:h-full ll:w-full"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
        >
          <path
            ref={autoHidePathRef}
            d={AUTO_HIDE_RING_PATH}
            fill="none"
            stroke={borderColor}
            strokeWidth={autoHideDurationMs > 0 ? 3 : 2}
            strokeLinecap="butt"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.95}
          />
        </svg>
        {renderLeadingVisual(notification, avatarUrl)}
        <div className="ll:relative ll:flex ll:min-w-0 ll:flex-1 ll:flex-col">
          <div className="ll:flex ll:items-center ll:gap-1 ll:overflow-hidden ll:leading-none">
            <span
              className="ll:shrink-0 ll:text-[11px] ll:font-semibold"
              style={{ color: `#${memberColor}` }}
            >
              {senderName}
            </span>
            <span className="ll:min-w-0 ll:truncate ll:text-[10px] ll:text-gray-400">
              {metaText}
            </span>
          </div>
          <div className="ll:mt-px">
            {renderNotificationContent({ notification, meetsLevelReq })}
          </div>
        </div>
        <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
          {actionLabel ? (
            <Button
              className="ll:h-7 ll:px-2.5 ll:text-[11px] ll:font-semibold"
              onClick={handleVolunteer}
              disabled={
                volunteer.isPending || (isPartyGathering && !meetsLevelReq)
              }
            >
              {actionLabel}
            </Button>
          ) : null}
          {showCloseButton ? (
            <Button
              aria-label="Zamknij powiadomienie"
              className="ll:size-7 ll:border-gray-400/50 ll:bg-transparent ll:px-0 ll:hover:bg-white/8"
              onClick={handleRemoveNotification}
            >
              <XIcon size={12} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
