import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleNotification } from "@/features/notifications/components/single-notification";
import { useNotificationGuildMembers } from "@/features/notifications/hooks/use-notification-guild-members";
import {
  getNotificationSettingsKey,
  isNotificationSettingsKey,
} from "@/features/notifications/utils/get-notification-settings-key";
import { useUpdateUserPreferences } from "@/hooks/api/use-user-preferences";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import {
  buildCurrentCharacterPayload,
  getGuildNamesById,
} from "@/lib/api/generated-helpers";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
import { usePartyReadyRoomControllerApply } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import type {
  NotificationMutesPatch,
  NotificationsSettings,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { type FC, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

type NotificationsListProps = {
  notifications?: StoredNotification[];
  settings?: Partial<NotificationsSettings>;
};

const EMPTY_NOTIFICATIONS: StoredNotification[] = [];
const EMPTY_NOTIFICATION_SETTINGS: Partial<NotificationsSettings> = {};
const INITIAL_BULK_RENDER_COUNT = 2;
const MANUAL_EXIT_ANIMATION_DURATION_MS = 150;

export const NotificationsList: FC<NotificationsListProps> = ({
  notifications,
  settings = EMPTY_NOTIFICATION_SETTINGS,
}) => {
  const visibleNotifications = notifications ?? EMPTY_NOTIFICATIONS;
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });
  const guildNamesById = getGuildNamesById(guilds);
  const notificationsCount = visibleNotifications.length;
  const [fullyRenderedAnimationCycle, setFullyRenderedAnimationCycle] =
    useState(-1);
  const [manuallyLeavingNotificationIds, setManuallyLeavingNotificationIds] =
    useState<ReadonlySet<string>>(() => new Set());
  const manualRemovalTimeoutsRef = useRef(new Map<string, number>());
  const membersByGuildId = useNotificationGuildMembers(visibleNotifications);
  const { isReady: isMutesReady, mutes } = useCurrentUserNotificationMutes();
  const updateUserPreferences = useUpdateUserPreferences();
  const applyToReadyRoom = usePartyReadyRoomControllerApply();
  const mergeReadyRoomProjection = usePartyFinderStore(
    (state) => state.mergeProjection,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const {
    clearNotifications,
    latestNotificationAnimationCycle,
    latestPresentationStartedEmpty,
    notificationAutoHideByListKey,
    pauseNotificationAutoHide,
    removeNotification,
    resumeNotificationAutoHide,
  } = useNotificationsStore(
    useShallow((state) => ({
      clearNotifications: state.clearNotifications,
      latestNotificationAnimationCycle: state.latestNotificationAnimationCycle,
      latestPresentationStartedEmpty: state.latestPresentationStartedEmpty,
      notificationAutoHideByListKey: state.notificationAutoHideByListKey,
      pauseNotificationAutoHide: state.pauseNotificationAutoHide,
      removeNotification: state.removeNotification,
      resumeNotificationAutoHide: state.resumeNotificationAutoHide,
    })),
  );
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const shouldStageBulkRender =
    notificationsCount > INITIAL_BULK_RENDER_COUNT &&
    latestPresentationStartedEmpty &&
    fullyRenderedAnimationCycle !== latestNotificationAnimationCycle;
  const renderedNotifications = shouldStageBulkRender
    ? visibleNotifications.slice(0, INITIAL_BULK_RENDER_COUNT)
    : visibleNotifications;

  useEffect(() => {
    if (latestNotificationAnimationCycle === 0) return;
    scrollViewportRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [latestNotificationAnimationCycle]);

  useEffect(() => {
    if (!shouldStageBulkRender) {
      return;
    }

    let timeoutId: number | null = null;
    const animationFrameId = requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        setFullyRenderedAnimationCycle(latestNotificationAnimationCycle);
      }, 0);
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [latestNotificationAnimationCycle, shouldStageBulkRender]);

  useEffect(
    () => () => {
      for (const [
        notificationId,
        timeoutId,
      ] of manualRemovalTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
        removeNotification(notificationId);
      }
      manualRemovalTimeoutsRef.current.clear();
    },
    [removeNotification],
  );

  const handleUpdateMutes = (mutesPatch: NotificationMutesPatch) => {
    updateUserPreferences.mutate({ mutes: mutesPatch });
  };

  const handleJoinReadyRoom = (notification: StoredNotification) => {
    applyToReadyRoom.mutate(
      {
        pathParams: {
          notificationId: notification.notificationId,
        },
        data: {
          world: notification.world,
          character: buildCurrentCharacterPayload(),
        },
      },
      {
        onSuccess: (projection) => {
          mergeReadyRoomProjection(
            projection as unknown as PartyReadyRoomProjection,
          );
          setOpen("notifications", false);
          setOpen("party-finder", true);
          clearNotifications();
        },
      },
    );
  };

  const handleRemoveNotification = (notificationId: string) => {
    if (!animationEffectsEnabled) {
      removeNotification(notificationId);
      return;
    }
    if (manualRemovalTimeoutsRef.current.has(notificationId)) return;

    setManuallyLeavingNotificationIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(notificationId);
      return nextIds;
    });
    const timeoutId = window.setTimeout(() => {
      manualRemovalTimeoutsRef.current.delete(notificationId);
      removeNotification(notificationId);
      setManuallyLeavingNotificationIds((currentIds) => {
        if (!currentIds.has(notificationId)) return currentIds;
        const nextIds = new Set(currentIds);
        nextIds.delete(notificationId);
        return nextIds;
      });
    }, MANUAL_EXIT_ANIMATION_DURATION_MS);
    manualRemovalTimeoutsRef.current.set(notificationId, timeoutId);
  };

  const getNotificationRow = (notification: StoredNotification) => {
    const settingsKey = getNotificationSettingsKey(notification);
    const categorySettings = isNotificationSettingsKey(settingsKey)
      ? settings[settingsKey]
      : undefined;

    return (
      <SingleNotification
        notification={notification}
        guildNamesById={guildNamesById}
        guildMember={
          membersByGuildId[notification.guildId]?.[notification.discordId]
        }
        autoHideState={notificationAutoHideByListKey[notification.listKey]}
        categorySettings={categorySettings}
        animationEffectsEnabled={animationEffectsEnabled}
        isJoiningReadyRoom={applyToReadyRoom.isPending}
        isMutesReady={isMutesReady}
        isMutePending={updateUserPreferences.isPending}
        mutes={mutes}
        onJoinReadyRoom={handleJoinReadyRoom}
        onPauseAutoHide={pauseNotificationAutoHide}
        onRemoveNotification={handleRemoveNotification}
        onResumeAutoHide={resumeNotificationAutoHide}
        onUpdateMutes={handleUpdateMutes}
        showCloseButton={notificationsCount > 1}
      />
    );
  };

  return (
    <ScrollArea
      ref={scrollViewportRef}
      className="ll:h-full ll:max-h-[inherit] ll:w-full ll:box-border"
    >
      <div className="ll:flex ll:w-full ll:flex-col ll:gap-1 ll:pt-1">
        {renderedNotifications.map((notification) => {
          let animationClassName = "ll:w-full";
          if (animationEffectsEnabled) {
            animationClassName = manuallyLeavingNotificationIds.has(
              notification.notificationId,
            )
              ? "ll:pointer-events-none ll:w-full ll:animate-out ll:fade-out-0 ll:slide-out-to-top-2 ll:duration-150"
              : "ll:w-full ll:animate-in ll:fade-in-0 ll:slide-in-from-top-2 ll:duration-150";
          }

          return (
            <div
              key={notification.listKey}
              data-lootlog-notification-id={notification.notificationId}
              className={animationClassName}
            >
              {getNotificationRow(notification)}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
