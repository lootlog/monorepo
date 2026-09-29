import { MOTION_DURATION_MS, MOTION_EASING } from "@/lib/motion";
import { CharacterTile } from "@/components/character-tile";
import { ListRow } from "@/components/list-row";
import { ListRowArrival } from "@/components/list-row-arrival";
import { NpcTile } from "@/components/npc-tile";
import { IconButton } from "@/components/ui/icon-button";
import { NotificationMuteMenu } from "@/features/notifications/components/notification-mute-menu";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { useGameStore } from "@/store/game.store";
import {
  isMentionNotification,
  type NotificationAutoHideCountdown,
  type NotificationAutoHideState,
  type PartyGatheringNotification,
  type NotificationWithServers,
  type StoredNotification,
} from "@/store/notifications.store";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import {
  getArrivalStrength,
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { format } from "@/utils/local-date";
import { Swords, XIcon } from "lucide-react";
import {
  type FocusEvent,
  memo,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
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

type AutoHideHoldSource = "focus" | "menu" | "pointer";

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
  onPauseAutoHide: (
    listKey: string,
    derivedCountdown?: NotificationAutoHideCountdown,
  ) => void;
  onRemoveNotification: (notificationId: string) => void;
  onResumeAutoHide: (listKey: string) => void;
  onUpdateMutes: (mutes: NotificationMutesPatch) => void;
  showCloseButton?: boolean;
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
      <span className="ll:flex ll:h-10 ll:w-7 ll:shrink-0 ll:items-center ll:justify-center">
        <CharacterTile
          character={notification.character}
          className="ll:shrink-0 ll:scale-75"
        />
      </span>
    );
  }

  if (isRegularNotification(notification) && notification.npc) {
    return <NpcTile npc={notification.npc} />;
  }

  return (
    <span className="ll:flex ll:h-10 ll:w-7 ll:shrink-0 ll:items-center ll:justify-center">
      <img
        src={avatarUrl}
        alt=""
        className="ll:size-6 ll:rounded-full ll:object-cover"
      />
    </span>
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
    arrivalStrength: getArrivalStrength(key),
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
  showCloseButton = false,
  npcTypeColors,
}: SingleNotificationProps) {
  const { t } = useTranslation("notifications");
  const rowRef = useRef<HTMLDivElement>(null);
  const autoHideBarRef = useRef<HTMLSpanElement>(null);
  const autoHideHoldsRef = useRef(new Set<AutoHideHoldSource>());

  const avatarUrl = getDiscordAvatarUrl(
    guildMember?.userId,
    guildMember?.avatar,
  );

  const memberColor = useMemberColor(guildMember);

  const {
    arrivalStrength,
    autoHideDurationMs,
    background,
    borderColor,
    metaText,
  } = resolveNotificationAppearance({
    categorySettings,
    guildNamesById,
    notification,
    npcTypeColors,
  });

  const showAutoHideBar = autoHideDurationMs > 0 && animationEffectsEnabled;
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

  // Drains the bar from what is left of the countdown and fades the row out
  // just before the cleanup sweep removes it, so an expiring notification
  // leaves instead of vanishing. Both are single Web Animations of transform
  // and opacity; a paused countdown holds the bar still and keeps the row.
  useEffect(() => {
    const bar = autoHideBarRef.current;
    const row = rowRef.current;

    if (!animationEffectsEnabled || !bar || !row || autoHideDurationMs <= 0) {
      return;
    }

    const remainingMs =
      autoHidePausedRemainingMs ??
      (autoHideDeadlineMs === null ? 0 : autoHideDeadlineMs - Date.now());

    // The sweep removes the row at the stored deadline, which can lie further
    // out than the category's current duration after the setting was
    // shortened; the bar then starts full, and both animations still end
    // exactly when the row leaves.
    const clampedRemainingMs = Math.max(0, remainingMs);

    const startScale = `scaleX(${Math.min(1, clampedRemainingMs / autoHideDurationMs)})`;
    bar.style.transform = startScale;

    if (clampedRemainingMs <= 0 || autoHidePausedRemainingMs !== null) {
      return () => {
        bar.style.transform = "";
      };
    }

    const drain = bar.animate(
      [{ transform: startScale }, { transform: "scaleX(0)" }],
      {
        duration: clampedRemainingMs,
        easing: getCountdownRingEasing(clampedRemainingMs),
        fill: "forwards",
      },
    );

    const exit = row.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: "translateX(12px)" },
      ],
      {
        delay: Math.max(0, clampedRemainingMs - MOTION_DURATION_MS.medium),
        duration: Math.min(MOTION_DURATION_MS.medium, clampedRemainingMs),
        easing: MOTION_EASING.exit,
        fill: "forwards",
      },
    );

    return () => {
      drain.cancel();
      exit.cancel();
      bar.style.transform = "";
    };
  }, [
    animationEffectsEnabled,
    autoHideDurationMs,
    autoHideDeadlineMs,
    autoHidePausedRemainingMs,
  ]);

  // The countdown holds while the player points at the row, has keyboard
  // focus inside it or has its mute menu open, and runs on once all of them
  // let go.
  const setAutoHideHold = (source: AutoHideHoldSource, held: boolean) => {
    const holds = autoHideHoldsRef.current;
    const wasHeld = holds.size > 0;

    if (held) {
      holds.add(source);
    } else {
      holds.delete(source);
    }

    if (wasHeld === holds.size > 0) return;

    if (holds.size > 0) {
      onPauseAutoHide(
        notification.listKey,
        autoHideDeadlineMs === null
          ? undefined
          : { deadlineMs: autoHideDeadlineMs, durationMs: autoHideDurationMs },
      );

      return;
    }

    onResumeAutoHide(notification.listKey);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setAutoHideHold("focus", false);
  };

  return (
    <div
      ref={rowRef}
      className="ll:w-full"
      onPointerEnter={() => setAutoHideHold("pointer", true)}
      onPointerLeave={() => setAutoHideHold("pointer", false)}
      onFocus={() => setAutoHideHold("focus", true)}
      onBlur={handleBlur}
    >
      <ListRow
        fill={background}
        className="ll:relative ll:min-h-10 ll:gap-1.5 ll:overflow-hidden ll:py-1.5 ll:font-normal"
      >
        {animationEffectsEnabled ? (
          <ListRowArrival
            key={notification.receivedAtMs}
            accent={borderColor}
            strength={arrivalStrength}
          />
        ) : null}
        {renderLeadingVisual(notification, avatarUrl)}
        <div className="ll:relative ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:leading-tight">
          <div className="ll:flex ll:items-baseline ll:gap-1 ll:overflow-hidden">
            <span
              className="ll:shrink-0 ll:text-[11px] ll:font-semibold"
              style={{ color: `#${memberColor}` }}
            >
              {senderName}
            </span>
            <span className="ll:min-w-0 ll:truncate ll:text-[10px] ll:text-gray-300">
              {metaText}
            </span>
          </div>
          {renderNotificationContent({ notification, meetsLevelReq })}
        </div>
        <div className="ll:relative ll:flex ll:shrink-0 ll:items-center">
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
            onOpenChange={(open) => setAutoHideHold("menu", open)}
            onMuted={handleRemoveNotification}
          />
          {showCloseButton ? (
            <IconButton
              variant="quiet-destructive"
              label={t("actions.closeAria")}
              onClick={handleRemoveNotification}
            >
              <XIcon aria-hidden />
            </IconButton>
          ) : null}
        </div>
        {showAutoHideBar ? (
          <span
            aria-hidden="true"
            className="ll:pointer-events-none ll:absolute ll:inset-x-0 ll:bottom-0 ll:h-0.5 ll:bg-white/10"
          >
            <span
              ref={autoHideBarRef}
              className="ll:block ll:h-full ll:origin-left"
              style={{ background: borderColor }}
            />
          </span>
        ) : null}
      </ListRow>
    </div>
  );
});
