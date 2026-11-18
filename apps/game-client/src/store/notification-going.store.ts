import type { NotificationGoingPlayer } from "@lootlog/schema/notification-going";
import { create } from "zustand";
import {
  getNpcWorldKey,
  type NotificationWithServers,
  type StoredNotification,
} from "@/store/notifications.store";

// A notification's answers outlive its row only briefly; NPC notifications
// expire on the server after half an hour.
const GOING_RETENTION_MS = 30 * 60_000;

type GoingByGuild = Record<string, readonly NotificationGoingPlayer[]>;

type NotificationGoingEntry = {
  readonly updatedAt: number;
  /** The reported NPC on its world, once an answer names it. */
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

/**
 * The reports whose answers one notification row lists. Players answer the
 * report their own row opened with, and rows of one NPC open with different
 * reports: the reporter never receives their own, and a long-lived row forgets
 * its oldest ids. The NPC joins them.
 */
export type NotificationGoingScope = {
  readonly notificationIds: readonly string[];
  readonly npcKey?: string;
};

/**
 * Who of each Lootlog answered an NPC notification with "I'm going". Each
 * Lootlog reports its own members and each report keeps its own answers, so
 * the lists are kept apart and joined only for display.
 */
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

/**
 * A gathering keeps to its own report: joining it is its answer, and the
 * NPC's other reports are separate rows.
 */
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

/** Everyone going to the NPC of one notification row. */
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

/** The reports of one notification row that list the User as going. */
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
