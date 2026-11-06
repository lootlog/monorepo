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
import { useNotificationGoingStore } from "@/store/notification-going.store";

const isGoingUpdate = Schema.is(NotificationGoingUpdateSchema);

/**
 * Keeps the "going" answers of the current Lootlogs' NPC notifications. The
 * reporter never sees their own notification, so they hear about each answer
 * to it as a game message instead.
 */
export const useNotificationGoingSocket = () => {
  const { socket, connected, joined } = useSocket();
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;

  const handleUpdate = useEffectEvent((update: NotificationGoingUpdate) => {
    // The gateway forwards the API's answer list as is; skip a malformed one.
    if (!isGoingUpdate(update)) return;

    const store = useNotificationGoingStore.getState();

    const previous =
      store.byNotification[update.notificationId]?.byGuild[update.guildId] ??
      [];

    store.setGuildGoing(update.notificationId, update.guildId, update.going);

    if (!discordId || update.reporterDiscordId !== discordId) return;

    const t = getFixedT("notifications");
    const before = new Set(previous.map((player) => player.discordId));
    const after = new Set(update.going.map((player) => player.discordId));

    for (const player of update.going) {
      if (!before.has(player.discordId))
        showRuntimeMessage(
          t("going.reporterJoined", { nick: player.nick, npc: update.npcName }),
        );
    }

    for (const player of previous) {
      if (!after.has(player.discordId))
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
