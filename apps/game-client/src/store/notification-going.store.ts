import type { NotificationGoingPlayer } from "@lootlog/schema/notification-going";
import { create } from "zustand";
import {
  getNpcWorldKey,
  type NotificationWithServers,
  type StoredNotification,
} from "@/store/notifications.store";

const GOING_RETENTION_MS = 30 * 60_000;

type GoingByGuild = Record<string, readonly NotificationGoingPlayer[]>;

type NotificationGoingEntry = {
  readonly updatedAt: number;
  readonly npcKey?: string;
  readonly byGuild: GoingByGuild;
};

type NotificationGoingState = {
  byNotification: Record<string, NotificationGoingEntry>;
  setGuildGoing: (
    notificationId: string,
    guildId: string,
    going: readonly NotificationGoingPlayer[],
    npcKey?: string,
  ) => void;
};

export type NotificationGoingScope = {
  readonly notificationIds: readonly string[];
  readonly npcKey?: string;
};

export const useNotificationGoingStore = create<NotificationGoingState>()(
  (set) => ({
    byNotification: {},
    setGuildGoing: (notificationId, guildId, going, npcKey) =>
      set((state) => {
        const now = Date.now();

        const kept = Object.fromEntries(
          Object.entries(state.byNotification).filter(
            ([, entry]) => now - entry.updatedAt < GOING_RETENTION_MS,
          ),
        );

        return {
          byNotification: {
            ...kept,
            [notificationId]: {
              updatedAt: now,
              npcKey: npcKey ?? kept[notificationId]?.npcKey,
              byGuild: {
                ...kept[notificationId]?.byGuild,
                [guildId]: going,
              },
            },
          },
        };
      }),
  }),
);

export const getNotificationGoingScope = (
  notification: StoredNotification & NotificationWithServers,
): NotificationGoingScope => ({
  notificationIds: notification.recentReportIds,
  ...(notification.npc &&
    !notification.isGatheringParty && {
      npcKey: getNpcWorldKey(notification.npc.id, notification.world),
    }),
});

const selectScopeEntries = (
  state: NotificationGoingState,
  { notificationIds, npcKey }: NotificationGoingScope,
) =>
  Object.entries(state.byNotification).filter(
    ([notificationId, entry]) =>
      notificationIds.includes(notificationId) ||
      (npcKey !== undefined && entry.npcKey === npcKey),
  );

export const selectNotificationGoing = (
  state: NotificationGoingState,
  scope: NotificationGoingScope,
): NotificationGoingPlayer[] => [
  ...new Map(
    selectScopeEntries(state, scope)
      .flatMap(([, entry]) => Object.values(entry.byGuild).flat())
      .map((player) => [player.userId, player]),
  ).values(),
];

export const selectUserGoingNotificationIds = (
  state: NotificationGoingState,
  scope: NotificationGoingScope,
  userId: string,
): string[] =>
  selectScopeEntries(state, scope).flatMap(([notificationId, entry]) =>
    Object.values(entry.byGuild)
      .flat()
      .some((player) => player.userId === userId)
      ? [notificationId]
      : [],
  );
