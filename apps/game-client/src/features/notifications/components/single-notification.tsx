import { CharacterTile } from "@/components/character-tile";
import { NpcTile } from "@/components/npc-tile";
import { IconButton } from "@/components/ui/icon-button";
import { NotificationMuteMenu } from "@/features/notifications/components/notification-mute-menu";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { useGameStore } from "@/store/game.store";
import { cn } from "cn";
import {
  isMentionNotification,
  type NotificationAutoHideState,
  type PartyGatheringNotification,
  type NotificationWithServers,
  type StoredNotification,
} from "@/store/notifications.store";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import {
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { format } from "@/utils/local-date";
import { Swords, XIcon } from "lucide-react";
import { memo, type ReactNode, useEffect, useRef } from "react";
import { SingleNotificationMessage } from "@/features/notifications/components/single-notification-message";
import { SingleNotificationNpc } from "@/features/notifications/components/single-notification-npc";
import { SingleNotificationPartyGathering } from "@/features/notifications/components/single-notification-party-gathering";
import { useTranslation } from "react-i18next";
import { getNotificationSettingsKey } from "@/features/notifications/utils/get-notification-settings-key";
import { getNotificationAutoHideDeadlineMs } from "@/features/notifications/notification-auto-hide";
import { getCountdownRingEasing } from "@/lib/countdown-ring-easing";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";
import type {
  NotificationMutes,
  NotificationMutesPatch,
} from "@lootlog/schema/user-preferences";
import type { NotificationSettings } from "@lootlog/schema/account-preferences";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";

const AUTO_HIDE_RING_PATH =
  "M 50 0 H 2 A 2 2 0 0 0 0 2 V 38 A 2 2 0 0 0 2 40 H 98 A 2 2 0 0 0 100 38 V 2 A 2 2 0 0 0 98 0 H 50";

const AUTO_HIDE_BASE_STROKE_WIDTH = 1.5;

const AUTO_HIDE_PROGRESS_STROKE_WIDTH = 3;

const DEFAULT_BORDER_STROKE_WIDTH = 2;

const AUTO_HIDE_BASE_STROKE_OPACITY = 0.45;

const AUTO_HIDE_PROGRESS_STROKE_OPACITY = 0.95;

type SingleNotificationProps = {
  guildNamesById: Record<string, string>;
  guildMember?: MemberSummaryResponseDtoOutput;
  notification: StoredNotification;
  autoHideState?: NotificationAutoHideState;
  categorySettings?: NotificationSettings;
  animationEffectsEnabled: boolean;
  isJoiningReadyRoom: boolean;
  isMutesReady: boolean;
  isMutePending: boolean;
  mutes: NotificationMutes;
  onJoinReadyRoom: (notification: StoredNotification) => void;
  onPauseAutoHide: (listKey: string) => void;
  onRemoveNotification: (notificationId: string) => void;
  onResumeAutoHide: (listKey: string) => void;
  onUpdateMutes: (mutes: NotificationMutesPatch) => void;
  npcTypeColors?: NpcTypeColors;
};

const isPartyGatheringNotification = (
  notification: StoredNotification,
): notification is StoredNotification & PartyGatheringNotification => {
  return "type" in notification && notification.type === "party-gathering";
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
          character={notification.character}
          className="ll:scale-75 ll:origin-center"
        />
      </div>
    );
  }

  if (isRegularNotification(notification) && notification.npc) {
    return <NpcTile npc={notification.npc} />;
  }

  return (
    <div className="ll:flex ll:h-8 ll:w-8 ll:shrink-0 ll:items-center ll:justify-center">
      <img
        src={avatarUrl}
        alt=""
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

const resolveNotificationAppearance = ({
  categorySettings,
  guildNamesById,
  notification,
  npcTypeColors,
}: Pick<
  SingleNotificationProps,
  "categorySettings" | "guildNamesById" | "notification" | "npcTypeColors"
>) => {
  const key = getNotificationSettingsKey(notification);
  const autoHideTimeout = categorySettings?.autoHideTimeout ?? 0;
  const autoHideDurationMs = autoHideTimeout > 0 ? autoHideTimeout * 1000 : 0;

  const serverNames = notification.servers.flatMap((server) => {
    const name = guildNamesById[server];

    return name ? [name] : [];
  });

  const time = format(new Date(notification.createdAt), "HH:mm");
  const highlight = categorySettings?.highlight;

  return {
    autoHideDurationMs,
    background: getBackgroundColor(key, highlight, npcTypeColors),
    borderColor: getBorderColor(key, highlight, npcTypeColors),
    metaText: [time, serverNames.join(", "), notification.world]
      .filter(Boolean)
      .join(" · "),
  };
};

const resolveNotificationActionState = (
  notification: StoredNotification,
  heroLevel: number,
) => {
  const isPartyGathering = isPartyGatheringNotification(notification);

  const regularNotification =
    !isPartyGathering && !isMentionNotification(notification)
      ? notification
      : null;

  const minLevel = isPartyGathering ? (notification.minLvl ?? 1) : 1;
  const maxLevel = isPartyGathering ? (notification.maxLvl ?? 500) : 500;

  return {
    isPartyGathering,
    meetsLevelReq: heroLevel >= minLevel && heroLevel <= maxLevel,
    showJoinAction:
      isPartyGathering || Boolean(regularNotification?.isGatheringParty),
  };
};

/**
 * Memoized on purpose: the window renders up to 50 rows, each with several
 * Base UI tooltip roots, and every incoming notification re-rendered all of
 * them (measured: 41-45 row renders per presentation before, 1 after). Every
 * prop the list passes must therefore stay referentially stable across
 * unrelated updates.
 */
export const SingleNotification = memo(function SingleNotification({
  animationEffectsEnabled,
  autoHideState,
  categorySettings,
  guildMember,
  guildNamesById,
  isJoiningReadyRoom,
  isMutesReady,
  isMutePending,
  mutes,
  notification,
  onJoinReadyRoom,
  onPauseAutoHide,
  onRemoveNotification,
  onResumeAutoHide,
  onUpdateMutes,
  npcTypeColors,
}: SingleNotificationProps) {
  const { t } = useTranslation("notifications");
  const autoHidePathRef = useRef<SVGPathElement>(null);

  const avatarUrl = getDiscordAvatarUrl(
    guildMember?.userId,
    guildMember?.avatar,
  );

  const memberColor = useMemberColor(guildMember);

  const { autoHideDurationMs, background, borderColor, metaText } =
    resolveNotificationAppearance({
      categorySettings,
      guildNamesById,
      notification,
      npcTypeColors,
    });

  const hasAutoHideRing = autoHideDurationMs > 0;
  const showAutoHideRing = hasAutoHideRing && animationEffectsEnabled;
  const senderName = guildMember?.name ?? t("states.unknownSender");

  const heroLvl = useGameStore((state) => state.game?.hero.level ?? 0);

  const { isPartyGathering, meetsLevelReq, showJoinAction } =
    resolveNotificationActionState(notification, heroLvl);

  const handleRemoveNotification = () =>
    onRemoveNotification(notification.notificationId);

  const handleJoinReadyRoom = () => {
    onJoinReadyRoom(notification);
  };

  const autoHidePausedRemainingMs = autoHideState?.pausedRemainingMs ?? null;

  const autoHideDeadlineMs = getNotificationAutoHideDeadlineMs({
    autoHideState,
    durationMs: autoHideDurationMs,
    receivedAtMs: notification.receivedAtMs,
  });

  useEffect(() => {
    const path = autoHidePathRef.current;
    const host = path?.ownerSVGElement?.parentElement;

    if (!animationEffectsEnabled || !path || !host || autoHideDurationMs <= 0) {
      return;
    }

    // The window plays its entry animation with `scale(0.94)`, and a client
    // rect reports that painted box: the dash length has to come from the
    // untransformed layout box or the ring closes before the countdown ends.
    // A row that is not laid out yet measures zero, and a zero dash array
    // paints a solid ring that never moves, so leave the plain border instead.
    const totalLength = 2 * (host.offsetWidth + host.offsetHeight);

    if (totalLength <= 0) {
      return;
    }

    const remainingMs =
      autoHidePausedRemainingMs ??
      (autoHideDeadlineMs === null ? 0 : autoHideDeadlineMs - Date.now());

    const clampedRemainingMs = Math.min(
      autoHideDurationMs,
      Math.max(0, remainingMs),
    );

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

    if (autoHidePausedRemainingMs !== null) {
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
        easing: getCountdownRingEasing(clampedRemainingMs),
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
  ]);

  const handleMuteMenuOpenChange = (open: boolean) => {
    if (open) {
      onPauseAutoHide(notification.listKey);

      return;
    }

    onResumeAutoHide(notification.listKey);
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
          {showJoinAction ? (
            <IconButton
              label={t("actions.joinAria")}
              onClick={handleJoinReadyRoom}
              loading={isJoiningReadyRoom}
              disabled={isPartyGathering && !meetsLevelReq}
            >
              <Swords aria-hidden />
            </IconButton>
          ) : null}
          <NotificationMuteMenu
            notification={notification}
            senderName={senderName}
            isReady={isMutesReady}
            isPending={isMutePending}
            mutes={mutes}
            onUpdateMutes={onUpdateMutes}
            onOpenChange={handleMuteMenuOpenChange}
            onMuted={handleRemoveNotification}
          />
          <IconButton
            variant="quiet-destructive"
            label={t("actions.closeAria")}
            onClick={handleRemoveNotification}
          >
            <XIcon aria-hidden />
          </IconButton>
        </div>
      </div>
    </div>
  );
});
