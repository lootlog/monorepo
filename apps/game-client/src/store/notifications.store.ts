import type { Notification } from "@/features/notifications/hooks/use-notifications";
import type { PartyGatheringCharacterBase } from "@/types/party-gathering";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";
import { create } from "zustand";

export type NotificationWithServers = Notification & {
  servers: string[];
};

export type MentionNotification = {
  type: "chat-mention";
  notificationId: string;
  discordId: string;
  guildId: string;
  world: string;
  createdAt: string;
  message: string;
  servers: string[];
};

export type PartyGatheringCharacter = PartyGatheringCharacterBase;

export type PartyGatheringNotification = {
  notificationId: string;
  guildId: string;
  discordId: string;
  world: string;
  createdAt: string;
  character: PartyGatheringCharacter;
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
};

export type NotificationAutoHideState = {
  deadlineMs: number | null;
  pausedRemainingMs: number | null;
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
  presentNotifications: (
    presentations: readonly NotificationPresentation[],
  ) => void;
  clearNotifications: () => void;
  removeNotifications: (ids: readonly string[]) => void;
  removeNotification: (id: string) => void;
  removeNotificationByNpcId: (npcId: number, world?: string) => void;
  removeNotificationsByNpcIds: (
    npcIds: readonly number[],
    world?: string,
  ) => void;
  setNotificationAutoHide: (listKey: string, durationMs: number) => void;
  pauseNotificationAutoHide: (listKey: string) => void;
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

type RecencyIndexNode = {
  key: string;
  newerItemId?: number;
  olderItemId?: number;
};

const createRecencyIndex = () => {
  const newestItemIdByKey = new Map<string, number>();
  const nodeByItemId = new Map<number, RecencyIndexNode>();

  const remove = (itemId: number) => {
    const node = nodeByItemId.get(itemId);
    if (!node) {
      return;
    }

    if (node.olderItemId !== undefined) {
      const olderNode = nodeByItemId.get(node.olderItemId);
      if (olderNode) {
        olderNode.newerItemId = node.newerItemId;
      }
    }

    if (node.newerItemId !== undefined) {
      const newerNode = nodeByItemId.get(node.newerItemId);
      if (newerNode) {
        newerNode.olderItemId = node.olderItemId;
      }
    } else if (node.olderItemId === undefined) {
      newestItemIdByKey.delete(node.key);
    } else {
      newestItemIdByKey.set(node.key, node.olderItemId);
    }

    nodeByItemId.delete(itemId);
  };

  return {
    getNewestItemId: (key: string) => newestItemIdByKey.get(key),
    set: (itemId: number, key?: string) => {
      remove(itemId);
      if (key === undefined) {
        return;
      }

      const olderItemId = newestItemIdByKey.get(key);
      const node: RecencyIndexNode = { key, olderItemId };
      nodeByItemId.set(itemId, node);

      if (olderItemId !== undefined) {
        const olderNode = nodeByItemId.get(olderItemId);
        if (olderNode) {
          olderNode.newerItemId = itemId;
        }
      }

      newestItemIdByKey.set(key, itemId);
    },
  };
};

const getNpcWorldLookupKey = (
  notification: PresentableNotification | StoredNotification,
) => {
  const regularNotification = notification as NotificationWithServers;
  const npcId = regularNotification.npc?.id;
  return JSON.stringify([
    regularNotification.world,
    typeof npcId,
    npcId ?? null,
  ]);
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
  const notificationsByItemId = new Map<number, StoredNotification>();
  const notificationIdIndex = createRecencyIndex();
  const npcWorldIndex = createRecencyIndex();
  let nextItemId = 0;

  for (let index = currentNotifications.length - 1; index >= 0; index -= 1) {
    const notification = currentNotifications[index];
    if (!notification) {
      continue;
    }

    const itemId = nextItemId;
    nextItemId += 1;
    notificationsByItemId.set(itemId, notification);
    notificationIdIndex.set(itemId, notification.notificationId);
    npcWorldIndex.set(
      itemId,
      isPartyGatheringNotification(notification)
        ? undefined
        : getNpcWorldLookupKey(notification),
    );
  }

  for (const presentation of presentations) {
    const { notification } = presentation;
    const receivedAtMs = Date.now();
    let itemId = notificationIdIndex.getNewestItemId(
      notification.notificationId,
    );

    if (
      itemId === undefined &&
      !isPartyGatheringNotification(notification) &&
      !(notification as NotificationWithServers).message
    ) {
      itemId = npcWorldIndex.getNewestItemId(
        getNpcWorldLookupKey(notification),
      );
    }

    const existingNotification =
      itemId === undefined ? undefined : notificationsByItemId.get(itemId);
    let storedNotification: StoredNotification;

    if (existingNotification && itemId !== undefined) {
      storedNotification = {
        ...existingNotification,
        ...notification,
        listKey: existingNotification.listKey,
        receivedAtMs,
        servers: getMergedServers(existingNotification, notification),
      };
      notificationsByItemId.delete(itemId);
    } else {
      itemId = nextItemId;
      nextItemId += 1;
      storedNotification = {
        ...notification,
        listKey: notification.notificationId,
        receivedAtMs,
      };
    }

    notificationsByItemId.set(itemId, storedNotification);
    notificationIdIndex.set(itemId, storedNotification.notificationId);
    npcWorldIndex.set(
      itemId,
      isPartyGatheringNotification(storedNotification)
        ? undefined
        : getNpcWorldLookupKey(storedNotification),
    );
    onStoredNotification(presentation, storedNotification, receivedAtMs);
  }

  return Array.from(notificationsByItemId.values()).reverse();
};

export const useNotificationsStore = create<NotificationsState>()(
  performanceStoreMiddleware(
    "notifications",
    (set, get) => ({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
      latestPresentationStartedEmpty: false,
      presentNotifications: (presentations) =>
        set((state) => {
          if (presentations.length === 0) {
            return state;
          }

          let notificationAutoHideByListKey =
            state.notificationAutoHideByListKey;
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

          let notifications = upsertNotificationBatch(
            state.notifications,
            presentations,
            ({ autoHideDurationMs }, storedNotification, receivedAtMs) => {
              if (autoHideDurationMs === undefined) {
                return;
              }

              const writableAutoHideState = getWritableAutoHideState();

              if (autoHideDurationMs <= 0) {
                delete writableAutoHideState[storedNotification.listKey];
                return;
              }

              writableAutoHideState[storedNotification.listKey] = {
                deadlineMs: receivedAtMs + autoHideDurationMs,
                pausedRemainingMs: null,
                durationMs: autoHideDurationMs,
              };
            },
          );

          const evictedNotifications = notifications.slice(MAX_NOTIFICATIONS);
          notifications = notifications.slice(0, MAX_NOTIFICATIONS);

          if (evictedNotifications.length > 0) {
            const writableAutoHideState = getWritableAutoHideState();
            evictedNotifications.forEach((notification) => {
              delete writableAutoHideState[notification.listKey];
            });
          }

          return {
            notifications,
            notificationAutoHideByListKey,
            latestNotificationAnimationCycle:
              state.latestNotificationAnimationCycle + 1,
            latestPresentationStartedEmpty: state.notifications.length === 0,
          };
        }),
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
          let notificationAutoHideByListKey =
            state.notificationAutoHideByListKey;
          let removedAnyNotification = false;
          const notifications = state.notifications.filter((notification) => {
            if (isPartyGatheringNotification(notification)) {
              return true;
            }

            const regularNotification = notification as NotificationWithServers;
            const shouldRemove =
              regularNotification.npc?.id !== undefined &&
              npcIdSet.has(regularNotification.npc.id) &&
              (world ? regularNotification.world === world : true);

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
      pauseNotificationAutoHide: (listKey) =>
        set((state) => {
          const currentState = state.notificationAutoHideByListKey[listKey];

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
    (state) => state.notifications.length,
  ),
);
