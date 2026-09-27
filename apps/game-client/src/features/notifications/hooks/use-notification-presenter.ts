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

    const audibleSettingsKeys = new Map<NotificationPresentation, string>();

    const presentations = requests.map(
      ({ notification, playSound: audible }) => {
        const settingsKey = getNotificationSettingsKey(notification);

        const categorySettings = isNotificationSettingsKey(settingsKey)
          ? settings[settingsKey]
          : undefined;

        const autoHideTimeout = categorySettings?.autoHideTimeout ?? 0;

        const presentation = {
          notification,
          autoHideDurationMs: Math.max(0, autoHideTimeout * 1_000),
        } satisfies NotificationPresentation;

        if (audible !== false && categorySettings?.sound) {
          audibleSettingsKeys.set(presentation, settingsKey);
        }

        return presentation;
      },
    );

    let addedPresentations: ReadonlySet<NotificationPresentation> = new Set();

    unstable_batchedUpdates(() => {
      addedPresentations = presentInStore(presentations);
      setOpen("notifications", true);
    });

    // A report joining a listed row stays silent: automatic sending would
    // otherwise replay the sound every few seconds.
    const soundKeys = new Set<string>();

    for (const presentation of addedPresentations) {
      const settingsKey = audibleSettingsKeys.get(presentation);

      if (settingsKey !== undefined) soundKeys.add(settingsKey);
    }

    if (soundKeys.size > 0) {
      playSounds("notifications", soundKeys);
    }
  };

  return { presentNotifications };
};
