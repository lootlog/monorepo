import { Footprints } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { messagingControllerGoing } from "@lootlog/client/main";
import { IconButton } from "@/components/ui/icon-button";
import { useSession } from "@/hooks/auth/use-session";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import {
  selectNotificationGoing,
  useNotificationGoingStore,
} from "@/store/notification-going.store";
import type {
  NotificationWithServers,
  StoredNotification,
} from "@/store/notifications.store";

type NotificationGoingButtonProps = {
  notification: StoredNotification & NotificationWithServers;
};

/**
 * Tells the player's Lootlog "I'm going" to a reported NPC without setting up
 * a gathering; pressing it again takes the answer back.
 */
export function NotificationGoingButton({
  notification,
}: NotificationGoingButtonProps) {
  const { t } = useTranslation("notifications");
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;

  const going = useNotificationGoingStore((state) =>
    selectNotificationGoing(state, notification.recentReportIds).some(
      (player) => player.discordId === discordId,
    ),
  );

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (next: boolean) => {
      const character = buildCurrentCharacterPayload();

      if (!character) throw new Error("No current character");

      return messagingControllerGoing(
        { notificationId: notification.notificationId },
        { world: notification.world, character, going: next },
      );
    },
    onError: () => showRuntimeMessage(t("going.failed")),
  });

  // The press shows at once; the Lootlog's answer list confirms it.
  const pressed = isPending ? variables : going;

  return (
    <IconButton
      label={t(pressed ? "going.cancel" : "going.go")}
      active={pressed}
      disabled={isPending}
      onClick={() => mutate(!pressed)}
    >
      <Footprints aria-hidden />
    </IconButton>
  );
}
