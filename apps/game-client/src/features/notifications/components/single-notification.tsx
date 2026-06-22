import { CharacterTile } from "@/components/character-tile";
import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationMuteMenu } from "@/features/notifications/components/notification-mute-menu";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useMemberInvalidation } from "@/hooks/api/use-member-invalidation";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { useMessagingControllerVolunteer } from "@/lib/api/generated/main/messaging/messaging";
import {
  buildCurrentCharacterPayload,
  mapGuildMembersByUserId,
} from "@/lib/api/generated-helpers";
import { Game } from "@/lib/game";
import { cn } from "@/lib/utils";
import {
  type MentionNotification,
  type PartyGatheringNotification,
  type NotificationWithServers,
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import {
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { format } from "date-fns";
import { LoaderCircle, Swords, XIcon } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef } from "react";
import { SingleNotificationMessage } from "@/features/notifications/components/single-notification-message";
import { SingleNotificationNpc } from "@/features/notifications/components/single-notification-npc";
import { SingleNotificationPartyGathering } from "@/features/notifications/components/single-notification-party-gathering";
import { useTranslation } from "react-i18next";
import {
  getNotificationSettingsKey,
  isNotificationSettingsKey,
} from "@/features/notifications/utils/get-notification-settings-key";

const AUTO_HIDE_RING_PATH =
  "M 50 0 H 2 A 2 2 0 0 0 0 2 V 38 A 2 2 0 0 0 2 40 H 98 A 2 2 0 0 0 100 38 V 2 A 2 2 0 0 0 98 0 H 50";
const AUTO_HIDE_BASE_STROKE_WIDTH = 1.5;
const AUTO_HIDE_PROGRESS_STROKE_WIDTH = 3;
const DEFAULT_BORDER_STROKE_WIDTH = 2;
const AUTO_HIDE_BASE_STROKE_OPACITY = 0.45;
const AUTO_HIDE_PROGRESS_STROKE_OPACITY = 0.95;

type SingleNotificationProps = {
  guildNamesById: Record<string, string>;
  notification: StoredNotification;
  showCloseButton?: boolean;
};

const isPartyGatheringNotification = (
  notification: StoredNotification,
): notification is StoredNotification & PartyGatheringNotification => {
  return "type" in notification && notification.type === "party-gathering";
};

const isMentionNotification = (
  notification: StoredNotification,
): notification is StoredNotification & MentionNotification => {
  return "type" in notification && notification.type === "chat-mention";
};

const isRegularNotification = (
  notification: StoredNotification,
): notification is StoredNotification & NotificationWithServers => {
  return (
    !isPartyGatheringNotification(notification) &&
    !isMentionNotification(notification)
  );
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

  if (isRegularNotification(notification) && notification.npc) {
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

  if (isRegularNotification(notification) && notification.npc) {
    return <SingleNotificationNpc notification={notification} />;
  }

  return <SingleNotificationMessage notification={notification} />;
};

export const SingleNotification: FC<SingleNotificationProps> = ({
  guildNamesById,
  notification,
  showCloseButton = false,
}) => {
  const { t } = useTranslation("notifications");
  const removeNotification = useNotificationsStore(
    (state) => state.removeNotification,
  );
  const autoHideState = useNotificationsStore(
    (state) => state.notificationAutoHideByListKey[notification.listKey],
  );
  const setNotificationAutoHide = useNotificationsStore(
    (state) => state.setNotificationAutoHide,
  );
  const pauseNotificationAutoHide = useNotificationsStore(
    (state) => state.pauseNotificationAutoHide,
  );
  const resumeNotificationAutoHide = useNotificationsStore(
    (state) => state.resumeNotificationAutoHide,
  );
  const clearNotificationAutoHide = useNotificationsStore(
    (state) => state.clearNotificationAutoHide,
  );
  const clearNotifications = useNotificationsStore(
    (state) => state.clearNotifications,
  );
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { settings } = useCurrentGameAccountNotificationSettings();
  const { data: membersData } = useGuildMembersSummary({
    guildId: notification.guildId,
  });
  const members = mapGuildMembersByUserId(membersData);
  const guildMember = members[notification.discordId];
  const volunteer = useMessagingControllerVolunteer();
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
  const regularNotification =
    !isPartyGathering && !isMentionNotification(notification)
      ? notification
      : null;

  const key = getNotificationSettingsKey(notification);
  const categorySettings = isNotificationSettingsKey(key)
    ? settings[key]
    : undefined;
  const autoHideTimeout = categorySettings?.autoHideTimeout ?? 0;
  const autoHideDurationMs = autoHideTimeout > 0 ? autoHideTimeout * 1000 : 0;

  const serverNames = notification.servers
    .map((server) => guildNamesById[server] ?? "")
    .filter(Boolean);
  const time = format(new Date(notification.createdAt), "HH:mm");
  const background = getBackgroundColor(key, categorySettings?.highlight);
  const borderColor = getBorderColor(key, categorySettings?.highlight);
  const hasAutoHideRing = autoHideDurationMs > 0;
  const showAutoHideRing = hasAutoHideRing && animationEffectsEnabled;
  const metaText = `${time}@${serverNames.join(", ")}${notification.world ? ` - ${notification.world}` : ""}`;
  const senderName = guildMember?.name ?? t("states.unknownSender");

  const heroLvl = Game.hero.lvl;
  const minLvl = isPartyGathering ? (notification.minLvl ?? 1) : 1;
  const maxLvl = isPartyGathering ? (notification.maxLvl ?? 500) : 500;
  const meetsLevelReq = heroLvl >= minLvl && heroLvl <= maxLvl;

  const handleRemoveNotification = () =>
    removeNotification(notification.notificationId);

  const handleVolunteer = () => {
    volunteer.mutate({
      pathParams: {
        notificationId: notification.notificationId,
      },
      data: {
        targetDiscordId: notification.discordId,
        world: notification.world,
        character: buildCurrentCharacterPayload(),
      },
    });
    setOpen("notifications", false);
    clearNotifications();
  };

  const showPartyGatheringAction = isPartyGathering;
  const showJoinAction = Boolean(regularNotification?.isGatheringParty);
  let actionLabel: string | null = null;
  const hasAutoHideState = Boolean(autoHideState);
  const autoHideDeadlineMs = autoHideState?.deadlineMs;
  const autoHidePausedRemainingMs = autoHideState?.pausedRemainingMs;

  if (showPartyGatheringAction) {
    actionLabel = t("actions.join");
  }

  useEffect(() => {
    if (autoHideDurationMs <= 0) {
      clearNotificationAutoHide(notification.listKey);
      return;
    }

    setNotificationAutoHide(notification.listKey, autoHideDurationMs);
  }, [
    autoHideDurationMs,
    clearNotificationAutoHide,
    notification.listKey,
    notification.receivedAtMs,
    setNotificationAutoHide,
  ]);

  useEffect(() => {
    const path = autoHidePathRef.current;
    const svg = path?.ownerSVGElement;
    if (!animationEffectsEnabled || !path || !svg || autoHideDurationMs <= 0) {
      return;
    }

    const { width, height } = svg.getBoundingClientRect();
    const totalLength = 2 * (width + height);
    const deadlineMs = autoHideDeadlineMs ?? Date.now() + autoHideDurationMs;
    const remainingMs =
      autoHidePausedRemainingMs ?? Math.max(0, deadlineMs - Date.now());
    const clampedRemainingMs = Math.min(autoHideDurationMs, remainingMs);
    const elapsedMs = Math.max(0, autoHideDurationMs - clampedRemainingMs);
    const initialOffset = (elapsedMs / autoHideDurationMs) * totalLength;
    const dashGapLength = totalLength * 2;

    path.style.strokeDasharray = `${totalLength} ${dashGapLength}`;
    path.style.strokeDashoffset = String(initialOffset);

    if (clampedRemainingMs <= 0) {
      path.style.strokeDasharray = `0 ${dashGapLength}`;
      path.style.strokeDashoffset = String(totalLength);
      return () => {
        path.style.strokeDasharray = "";
        path.style.strokeDashoffset = "";
      };
    }

    if (hasAutoHideState && autoHidePausedRemainingMs !== null) {
      return () => {
        path.style.strokeDasharray = "";
        path.style.strokeDashoffset = "";
      };
    }

    const animation = path.animate(
      [
        { strokeDashoffset: String(initialOffset) },
        { strokeDashoffset: String(totalLength) },
      ],
      {
        duration: clampedRemainingMs,
        easing: "linear",
        fill: "forwards",
      },
    );
    animation.onfinish = () => {
      path.style.strokeDasharray = `0 ${dashGapLength}`;
      path.style.strokeDashoffset = String(totalLength);
    };

    return () => {
      animation.onfinish = null;
      animation.cancel();
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
    };
  }, [
    animationEffectsEnabled,
    autoHideDurationMs,
    autoHideDeadlineMs,
    autoHidePausedRemainingMs,
    hasAutoHideState,
  ]);

  const handleMuteMenuOpenChange = (open: boolean) => {
    if (open) {
      pauseNotificationAutoHide(notification.listKey);
      return;
    }

    resumeNotificationAutoHide(notification.listKey);
  };

  return (
    <div className="ll:w-full">
      <div
        className={cn(
          "ll:relative ll:flex ll:items-center ll:gap-2 ll:overflow-hidden ll:px-2 ll:py-2",
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
            d={AUTO_HIDE_RING_PATH}
            fill="none"
            stroke={borderColor}
            strokeWidth={
              showAutoHideRing
                ? AUTO_HIDE_BASE_STROKE_WIDTH
                : DEFAULT_BORDER_STROKE_WIDTH
            }
            strokeLinecap="butt"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={
              showAutoHideRing
                ? AUTO_HIDE_BASE_STROKE_OPACITY
                : AUTO_HIDE_PROGRESS_STROKE_OPACITY
            }
          />
          {showAutoHideRing ? (
            <path
              ref={autoHidePathRef}
              d={AUTO_HIDE_RING_PATH}
              fill="none"
              stroke={borderColor}
              strokeWidth={AUTO_HIDE_PROGRESS_STROKE_WIDTH}
              strokeLinecap="butt"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={AUTO_HIDE_PROGRESS_STROKE_OPACITY}
            />
          ) : null}
        </svg>
        {renderLeadingVisual(notification, avatarUrl)}
        <div className="ll:relative ll:flex ll:min-w-0 ll:flex-1 ll:flex-col">
          <div className="ll:flex ll:items-center ll:gap-1 ll:overflow-hidden ll:leading-none ll:pb-1">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label={t("actions.joinAria")}
                  className="ll:size-7 ll:px-0"
                  onClick={handleVolunteer}
                  disabled={
                    volunteer.isPending || (isPartyGathering && !meetsLevelReq)
                  }
                >
                  {volunteer.isPending ? (
                    <LoaderCircle size={12} className="ll:animate-spin" />
                  ) : (
                    <Swords size={12} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{actionLabel}</TooltipContent>
            </Tooltip>
          ) : null}
          {showJoinAction ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label={t("actions.joinAria")}
                  className="ll:size-7 ll:px-0"
                  onClick={handleVolunteer}
                  disabled={volunteer.isPending}
                >
                  {volunteer.isPending ? (
                    <LoaderCircle size={12} className="ll:animate-spin" />
                  ) : (
                    <Swords size={12} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("actions.joinAria")}
              </TooltipContent>
            </Tooltip>
          ) : null}
          <NotificationMuteMenu
            notification={notification}
            senderName={senderName}
            onOpenChange={handleMuteMenuOpenChange}
            onMuted={handleRemoveNotification}
          />
          {showCloseButton ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  aria-label={t("actions.closeAria")}
                  className="ll:size-7 ll:px-0"
                  onClick={handleRemoveNotification}
                >
                  <XIcon size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("actions.closeAria")}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </div>
  );
};
