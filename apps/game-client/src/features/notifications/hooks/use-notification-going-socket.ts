import { useEffect, useEffectEvent } from "react";
import { Schema } from "effect";
import {
  NotificationGoingUpdateSchema,
  type NotificationGoingUpdate,
} from "@lootlog/schema/notification-going";
import { useSocket } from "@/contexts/socket-context";
import { useSession } from "@/hooks/auth/use-session";
import { getFixedT } from "@/i18n/get-fixed-t";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import {
  selectNotificationGoing,
  useNotificationGoingStore,
} from "@/store/notification-going.store";

const isGoingUpdate = Schema.is(NotificationGoingUpdateSchema);

/**
 * Keeps the "going" answers of the current Lootlogs' NPC notifications. The
 * reporter never sees their own notification, so they hear about each answer
 * to it as a game message instead.
 */
export const useNotificationGoingSocket = () => {
  const { socket, connected, joined } = useSocket();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const handleUpdate = useEffectEvent((update: NotificationGoingUpdate) => {
    // The gateway forwards the API's answer list as is; skip a malformed one.
    if (!isGoingUpdate(update)) return;

    const ids = [update.notificationId];

    // The reporter hears about a player once, even when several of their
    // Lootlogs list the answer.
    const previous = selectNotificationGoing(
      useNotificationGoingStore.getState(),
      ids,
    );

    useNotificationGoingStore
      .getState()
      .setGuildGoing(update.notificationId, update.guildId, update.going);

    if (!userId || update.reporterUserId !== userId) return;

    const current = selectNotificationGoing(
      useNotificationGoingStore.getState(),
      ids,
    );

    const t = getFixedT("notifications");
    const before = new Set(previous.map((player) => player.userId));
    const after = new Set(current.map((player) => player.userId));

    for (const player of current) {
      if (!before.has(player.userId))
        showRuntimeMessage(
          t("going.reporterJoined", { nick: player.nick, npc: update.npcName }),
        );
    }

    for (const player of previous) {
      if (!after.has(player.userId))
        showRuntimeMessage(
          t("going.reporterLeft", { nick: player.nick, npc: update.npcName }),
        );
    }
  });

  useEffect(() => {
    if (!connected || !joined || !socket) return;

    const onUpdate = (update: NotificationGoingUpdate) => handleUpdate(update);

    socket.on("notification.going", onUpdate);

    return () => {
      socket.off("notification.going", onUpdate);
    };
  }, [connected, joined, socket]);
};
