import { Footprints } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { messagingControllerGoing } from "@lootlog/client/main";
import { IconButton } from "@/components/ui/icon-button";
import { useSession } from "@/hooks/auth/use-session";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import {
  getNotificationGoingScope,
  selectUserGoingNotificationIds,
  useNotificationGoingStore,
} from "@/store/notification-going.store";
import type {
  NotificationWithServers,
  StoredNotification,
} from "@/store/notifications.store";

type NotificationGoingButtonProps = {
  notification: StoredNotification & NotificationWithServers;
};

export function NotificationGoingButton({
  notification,
}: NotificationGoingButtonProps) {
  const { t } = useTranslation("notifications");
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const setGuildGoing = useNotificationGoingStore(
    (state) => state.setGuildGoing,
  );

  const scope = getNotificationGoingScope(notification);

  const going = useNotificationGoingStore(
    (state) =>
      userId !== undefined &&
      selectUserGoingNotificationIds(state, scope, userId).length > 0,
  );

  const { mutate, isPending, isSuccess, variables } = useMutation({
    mutationFn: (next: boolean) => {
      const character = buildCurrentCharacterPayload();

      if (!character) throw new Error("No current character");

      const answered =
        next || userId === undefined
          ? []
          : selectUserGoingNotificationIds(
              useNotificationGoingStore.getState(),
              scope,
              userId,
            );

      const notificationIds =
        answered.length > 0 ? answered : [notification.notificationId];

      return Promise.all(
        notificationIds.map((notificationId) =>
          messagingControllerGoing(
            { notificationId },
            { world: notification.world, character, going: next },
          ),
        ),
      );
    },
    onSuccess: (answers) => {
      for (const { notificationId, guilds } of answers)
        for (const { guildId, going: players } of guilds)
          setGuildGoing(notificationId, guildId, players, scope.npcKey);
    },
    onError: () => showRuntimeMessage(t("going.failed")),
  });

  const pressed = isPending ? variables : going;

  return (
    <IconButton
      label={t(pressed ? "going.cancel" : "going.go")}
      active={pressed}
      disabled={isPending}
      onClick={() => mutate(!pressed)}
    >
      <Footprints
        aria-hidden
        className={isSuccess && variables ? "ll-icon-bump" : undefined}
      />
    </IconButton>
  );
}
