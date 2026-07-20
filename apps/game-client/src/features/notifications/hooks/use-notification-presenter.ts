import {
  getNotificationSettingsKey,
  isNotificationSettingsKey,
} from "@/features/notifications/utils/get-notification-settings-key";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import {
  type NotificationPresentation,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { unstable_batchedUpdates } from "react-dom";

export type NotificationPresentationRequest = {
  notification: NotificationPresentation["notification"];
  playSound?: boolean;
};

export const useNotificationPresenter = () => {
  const { settings } = useCurrentGameAccountNotificationSettings();
  const presentInStore = useNotificationsStore(
    (state) => state.presentNotifications,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { playSounds } = useSoundPlayback();

  const presentNotifications = (
    requests: readonly NotificationPresentationRequest[],
  ) => {
    if (requests.length === 0) {
      return;
    }

    const soundKeys = new Set<string>();
    const presentations = requests.map(
      ({ notification, playSound: audible }) => {
        const settingsKey = getNotificationSettingsKey(notification);
        const categorySettings = isNotificationSettingsKey(settingsKey)
          ? settings[settingsKey]
          : undefined;
        const autoHideTimeout = categorySettings?.autoHideTimeout ?? 0;

        if (audible !== false && categorySettings?.sound) {
          soundKeys.add(settingsKey);
        }

        return {
          notification,
          autoHideDurationMs: Math.max(0, autoHideTimeout * 1_000),
        } satisfies NotificationPresentation;
      },
    );

    unstable_batchedUpdates(() => {
      presentInStore(presentations);
      setOpen("notifications", true);
    });
    if (soundKeys.size > 0) {
      playSounds("notifications", soundKeys);
    }
  };

  return { presentNotifications };
};
