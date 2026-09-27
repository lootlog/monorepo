import type { Notification } from "@/features/notifications/hooks/use-notifications";
import type { PartyGatheringCharacterBase } from "@/types/party-gathering";
import { create } from "zustand";

export type NotificationWithServers = Notification & {
  servers: string[];
};

export type MentionNotification = {
  type: "chat-mention";
  sourceNpc?: { type: string; lvl: number } | null;
  notificationId: string;
  discordId: string;
  guildId: string;
  world: string;
  createdAt: string;
  message: string;
  servers: string[];
};

export type PartyGatheringNotification = {
  notificationId: string;
  guildId: string;
  discordId: string;
  world: string;
  createdAt: string;
  character: PartyGatheringCharacterBase;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  servers: string[];
  type: "party-gathering";
};

export type StoredNotification = (
  | NotificationWithServers
  | MentionNotification
  | PartyGatheringNotification
) & {
  listKey: string;
  receivedAtMs: number;
  /** Distinct notification ids grouped into this row, first report first. */
  reportIds: string[];
};

export type NotificationAutoHideState = {
  deadlineMs: number | null;
  pausedRemainingMs: number | null;
  durationMs: number;
};

/**
 * A countdown the row derived itself: a notification presented before its
 * category settings loaded has no stored auto-hide state, yet the cleanup
 * sweep still expires it from its arrival time.
 */
export type NotificationAutoHideCountdown = {
  deadlineMs: number;
  durationMs: number;
};

type PresentableNotification =
  | NotificationWithServers
  | MentionNotification
  | PartyGatheringNotification;

export type NotificationPresentation = {
  notification: PresentableNotification;
  autoHideDurationMs?: number;
};

const MAX_NOTIFICATIONS = 50;

interface NotificationsState {
  notifications: StoredNotification[];
  notificationAutoHideByListKey: Record<string, NotificationAutoHideState>;
  latestNotificationAnimationCycle: number;
  latestPresentationStartedEmpty: boolean;
  /** Returns the presentations that opened a new row rather than joining one. */
  presentNotifications: (
    presentations: readonly NotificationPresentation[],
  ) => ReadonlySet<NotificationPresentation>;
  clearNotifications: () => void;
  removeNotifications: (ids: readonly string[]) => void;
  removeNotification: (id: string) => void;
  removeNotificationByNpcId: (npcId: number, world?: string) => void;
  removeNotificationsByNpcIds: (
    npcIds: readonly number[],
    world?: string,
  ) => void;
  setNotificationAutoHide: (listKey: string, durationMs: number) => void;
  pauseNotificationAutoHide: (
    listKey: string,
    derivedCountdown?: NotificationAutoHideCountdown,
  ) => void;
  resumeNotificationAutoHide: (listKey: string) => void;
  clearNotificationAutoHide: (listKey: string) => void;
}

const isPartyGatheringNotification = (
  notification: PresentableNotification | StoredNotification,
) => "type" in notification && notification.type === "party-gathering";

const getMergedServers = (
  currentNotification: StoredNotification,
  nextNotification: PresentableNotification,
) => [
  ...new Set([...currentNotification.servers, ...nextNotification.servers]),
];

/**
 * Players with automatic sending report the same NPC every few seconds, so
 * reports of one NPC on one world share a row while it is listed: the first
 * report keeps its sender and data, later ones only raise the count. Party
 * gathering reports keep their own row because joining targets their id.
 */
const getNpcGroupKey = (
  notification: PresentableNotification | StoredNotification,
) => {
  if (
    !("npc" in notification) ||
    !notification.npc ||
    notification.message ||
    notification.isGatheringParty
  ) {
    return undefined;
  }

  return `${notification.npc.id}:${notification.world}`;
};

const upsertNotificationBatch = (
  currentNotifications: readonly StoredNotification[],
  presentations: readonly NotificationPresentation[],
  onStoredNotification: (
    presentation: NotificationPresentation,
    storedNotification: StoredNotification,
    receivedAtMs: number,
  ) => void,
) => {
  // Oldest first, so a later index always wins for a shared lookup key.
  const rows = [...currentNotifications].reverse();
  const rowIndexByReportId = new Map<string, number>();
  const rowIndexByNpcGroupKey = new Map<string, number>();
  const addedPresentations = new Set<NotificationPresentation>();

  const indexRow = (row: StoredNotification, rowIndex: number) => {
    for (const reportId of row.reportIds) {
      rowIndexByReportId.set(reportId, rowIndex);
    }

    const npcGroupKey = getNpcGroupKey(row);

    if (npcGroupKey !== undefined) {
      rowIndexByNpcGroupKey.set(npcGroupKey, rowIndex);
    }
  };

  rows.forEach(indexRow);

  for (const presentation of presentations) {
    const { notification } = presentation;
    const receivedAtMs = Date.now();
    const reportRowIndex = rowIndexByReportId.get(notification.notificationId);
    const npcGroupKey = getNpcGroupKey(notification);

    const rowIndex =
      reportRowIndex ??
      (npcGroupKey === undefined
        ? undefined
        : rowIndexByNpcGroupKey.get(npcGroupKey));

    const existingNotification =
      rowIndex === undefined ? undefined : rows[rowIndex];

    if (rowIndex === undefined || !existingNotification) {
      const storedNotification: StoredNotification = {
        ...notification,
        listKey: notification.notificationId,
        receivedAtMs,
        reportIds: [notification.notificationId],
      };

      rows.push(storedNotification);
      indexRow(storedNotification, rows.length - 1);
      addedPresentations.add(presentation);
      onStoredNotification(presentation, storedNotification, receivedAtMs);
      continue;
    }

    // A redelivered first report may carry updated content; any other match
    // is a later report of a grouped NPC, which must not replace the sender.
    const storedNotification: StoredNotification = {
      ...(existingNotification.notificationId === notification.notificationId
        ? { ...existingNotification, ...notification }
        : existingNotification),
      listKey: existingNotification.listKey,
      receivedAtMs,
      reportIds:
        reportRowIndex === undefined
          ? [...existingNotification.reportIds, notification.notificationId]
          : existingNotification.reportIds,
      servers: getMergedServers(existingNotification, notification),
    };

    rows[rowIndex] = storedNotification;
    indexRow(storedNotification, rowIndex);
    onStoredNotification(presentation, storedNotification, receivedAtMs);
  }

  return {
    addedPresentations,
    notifications: rows.reverse(),
  };
};

export const useNotificationsStore = create<NotificationsState>()(
  (set, get) => ({
    notifications: [],
    notificationAutoHideByListKey: {},
    latestNotificationAnimationCycle: 0,
    latestPresentationStartedEmpty: false,
    presentNotifications: (presentations) => {
      let addedPresentations: ReadonlySet<NotificationPresentation> = new Set();

      set((state) => {
        if (presentations.length === 0) {
          return state;
        }

        let notificationAutoHideByListKey = state.notificationAutoHideByListKey;
        let hasAutoHideChanges = false;

        const getWritableAutoHideState = () => {
          if (!hasAutoHideChanges) {
            notificationAutoHideByListKey = {
              ...notificationAutoHideByListKey,
            };
            hasAutoHideChanges = true;
          }

          return notificationAutoHideByListKey;
        };

        const batch = upsertNotificationBatch(
          state.notifications,
          presentations,
          ({ autoHideDurationMs }, storedNotification, receivedAtMs) => {
            if (autoHideDurationMs === undefined) {
              return;
            }

            const writableAutoHideState = getWritableAutoHideState();
            const { listKey } = storedNotification;

            if (autoHideDurationMs <= 0) {
              delete writableAutoHideState[listKey];

              return;
            }

            const isPaused =
              (writableAutoHideState[listKey]?.pausedRemainingMs ?? null) !==
              null;

            // A report joining a row whose countdown the player paused (an
            // open mute menu) refills it without resuming it.
            writableAutoHideState[listKey] = isPaused
              ? {
                  deadlineMs: null,
                  pausedRemainingMs: autoHideDurationMs,
                  durationMs: autoHideDurationMs,
                }
              : {
                  deadlineMs: receivedAtMs + autoHideDurationMs,
                  pausedRemainingMs: null,
                  durationMs: autoHideDurationMs,
                };
          },
        );

        addedPresentations = batch.addedPresentations;
        let { notifications } = batch;

        const evictedNotifications = notifications.slice(MAX_NOTIFICATIONS);
        notifications = notifications.slice(0, MAX_NOTIFICATIONS);

        if (evictedNotifications.length > 0) {
          const writableAutoHideState = getWritableAutoHideState();
          evictedNotifications.forEach((notification) => {
            delete writableAutoHideState[notification.listKey];
          });
        }

        // Only a new row replays the entry animation and scrolls to the top; a
        // report joining a listed row updates it in place.
        if (addedPresentations.size === 0) {
          return { notifications, notificationAutoHideByListKey };
        }

        return {
          notifications,
          notificationAutoHideByListKey,
          latestNotificationAnimationCycle:
            state.latestNotificationAnimationCycle + 1,
          latestPresentationStartedEmpty: state.notifications.length === 0,
        };
      });

      return addedPresentations;
    },
    clearNotifications: () =>
      set((state) => {
        if (
          state.notifications.length === 0 &&
          Object.keys(state.notificationAutoHideByListKey).length === 0
        ) {
          return state;
        }

        return {
          notifications: [],
          notificationAutoHideByListKey: {},
        };
      }),
    removeNotifications: (ids) =>
      set((state) => {
        if (ids.length === 0) {
          return state;
        }

        const idSet = new Set(ids);

        const notificationsToRemove = state.notifications.filter(
          (notification) => idSet.has(notification.notificationId),
        );

        if (notificationsToRemove.length === 0) {
          return state;
        }

        const notificationAutoHideByListKey = {
          ...state.notificationAutoHideByListKey,
        };

        notificationsToRemove.forEach((notification) => {
          delete notificationAutoHideByListKey[notification.listKey];
        });

        return {
          notifications: state.notifications.filter(
            (notification) => !idSet.has(notification.notificationId),
          ),
          notificationAutoHideByListKey,
        };
      }),
    removeNotification: (id) => get().removeNotifications([id]),
    removeNotificationsByNpcIds: (npcIds, world) =>
      set((state) => {
        if (npcIds.length === 0) {
          return state;
        }

        const npcIdSet = new Set(npcIds);
        let notificationAutoHideByListKey = state.notificationAutoHideByListKey;
        let removedAnyNotification = false;

        const notifications = state.notifications.filter((notification) => {
          if (isPartyGatheringNotification(notification)) {
            return true;
          }

          const npc = "npc" in notification ? notification.npc : undefined;

          const shouldRemove =
            npc?.id !== undefined &&
            npcIdSet.has(npc.id) &&
            (world ? notification.world === world : true);

          if (shouldRemove) {
            if (!removedAnyNotification) {
              notificationAutoHideByListKey = {
                ...state.notificationAutoHideByListKey,
              };
            }

            removedAnyNotification = true;
            delete notificationAutoHideByListKey[notification.listKey];

            return false;
          }

          return true;
        });

        if (!removedAnyNotification) {
          return state;
        }

        return {
          notifications,
          notificationAutoHideByListKey,
        };
      }),
    removeNotificationByNpcId: (npcId, world) =>
      get().removeNotificationsByNpcIds([npcId], world),
    setNotificationAutoHide: (listKey, durationMs) =>
      set((state) => {
        if (durationMs <= 0) {
          if (!(listKey in state.notificationAutoHideByListKey)) {
            return state;
          }

          const notificationAutoHideByListKey = {
            ...state.notificationAutoHideByListKey,
          };

          delete notificationAutoHideByListKey[listKey];

          return { notificationAutoHideByListKey };
        }

        return {
          notificationAutoHideByListKey: {
            ...state.notificationAutoHideByListKey,
            [listKey]: {
              deadlineMs: Date.now() + durationMs,
              pausedRemainingMs: null,
              durationMs,
            },
          },
        };
      }),
    pauseNotificationAutoHide: (listKey, derivedCountdown) =>
      set((state) => {
        const currentState =
          state.notificationAutoHideByListKey[listKey] ??
          (derivedCountdown && {
            ...derivedCountdown,
            pausedRemainingMs: null,
          });

        if (!currentState || currentState.deadlineMs === null) {
          return state;
        }

        return {
          notificationAutoHideByListKey: {
            ...state.notificationAutoHideByListKey,
            [listKey]: {
              ...currentState,
              deadlineMs: null,
              pausedRemainingMs: Math.max(
                0,
                currentState.deadlineMs - Date.now(),
              ),
            },
          },
        };
      }),
    resumeNotificationAutoHide: (listKey) =>
      set((state) => {
        const currentState = state.notificationAutoHideByListKey[listKey];

        if (!currentState || currentState.pausedRemainingMs === null) {
          return state;
        }

        return {
          notificationAutoHideByListKey: {
            ...state.notificationAutoHideByListKey,
            [listKey]: {
              ...currentState,
              deadlineMs: Date.now() + currentState.pausedRemainingMs,
              pausedRemainingMs: null,
            },
          },
        };
      }),
    clearNotificationAutoHide: (listKey) =>
      set((state) => {
        if (!(listKey in state.notificationAutoHideByListKey)) {
          return state;
        }

        const notificationAutoHideByListKey = {
          ...state.notificationAutoHideByListKey,
        };

        delete notificationAutoHideByListKey[listKey];

        return { notificationAutoHideByListKey };
      }),
  }),
);

export const isMentionNotification = (
  notification: StoredNotification,
): notification is StoredNotification & MentionNotification =>
  "type" in notification && notification.type === "chat-mention";
