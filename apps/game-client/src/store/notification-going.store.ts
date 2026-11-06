import type { NotificationGoingPlayer } from "@lootlog/schema/notification-going";
import { create } from "zustand";

// A notification's answers outlive its row only briefly; NPC notifications
// expire on the server after half an hour.
const GOING_RETENTION_MS = 30 * 60_000;

type GoingByGuild = Record<string, readonly NotificationGoingPlayer[]>;

type NotificationGoingState = {
  byNotification: Record<
    string,
    { readonly updatedAt: number; readonly byGuild: GoingByGuild }
  >;
  setGuildGoing: (
    notificationId: string,
    guildId: string,
    going: readonly NotificationGoingPlayer[],
  ) => void;
};

/**
 * Who of each Lootlog answered an NPC notification with "I'm going". Each
 * Lootlog reports its own members, so the lists are kept apart and joined
 * only for display.
 */
export const useNotificationGoingStore = create<NotificationGoingState>()(
  (set) => ({
    byNotification: {},
    setGuildGoing: (notificationId, guildId, going) =>
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

/** Everyone going for any of the reports grouped into one notification row. */
export const selectNotificationGoing = (
  state: NotificationGoingState,
  notificationIds: readonly string[],
): NotificationGoingPlayer[] => [
  ...new Map(
    notificationIds
      .flatMap((id) =>
        Object.values(state.byNotification[id]?.byGuild ?? {}).flat(),
      )
      .map((player) => [player.userId, player]),
  ).values(),
];
