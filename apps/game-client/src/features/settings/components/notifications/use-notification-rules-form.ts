import { toggleAvailableGuild } from "@/features/settings/components/shared/settings-guild-picker";
import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import {
  NOTIFICATION_TYPES,
  type NotificationSettings,
  type NotificationType,
} from "@lootlog/schema/account-preferences";

export const AUTO_HIDE_MIN_SECONDS = 0;

export const AUTO_HIDE_MAX_SECONDS = 600;

type NotificationSwitch = "show" | "ignoreOtherWorlds" | "highlight" | "sound";

/**
 * Per-category notification rules plus the shared server list. Every change
 * is written straight through the shared settings patch queue, which updates
 * the cache optimistically, batches rapid clicks into one request and
 * re-applies patches still pending when a server response lands, so a switch
 * never snaps back mid-save.
 */
export function useNotificationRulesForm() {
  const { settings } = useCurrentGameAccountNotificationSettings();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const { mutate } = useUpdateGameAccountPreferences();

  const setRule = (
    type: NotificationType,
    patch: Partial<NotificationSettings>,
  ) => {
    mutate({ notifications: { [type]: patch } });
  };

  const setSwitch = (
    type: NotificationType,
    field: NotificationSwitch,
    checked: boolean,
  ) => setRule(type, { [field]: checked });

  /** `seconds` arrives already clamped by the number field. */
  const setAutoHideTimeout = (type: NotificationType, seconds: number) =>
    setRule(type, { autoHideTimeout: seconds });

  const toggleGuild = (guildId: string) => {
    if (!guilds) return;

    mutate({
      notifications: {
        guildIds: toggleAvailableGuild(guilds, settings.guildIds, guildId),
      },
    });
  };

  /** Sets one switch in every category where it is editable (its row is on). */
  const setSwitchForAll = (field: NotificationSwitch, checked: boolean) => {
    const notifications = Object.fromEntries(
      NOTIFICATION_TYPES.filter(
        (type) => field === "show" || settings[type].show,
      ).map((type) => [type, { [field]: checked }]),
    );

    if (Object.keys(notifications).length > 0) mutate({ notifications });
  };

  const { guildIds, ...rules } = settings;

  return {
    guilds,
    guildIds,
    rules,
    setSwitch,
    setAutoHideTimeout,
    setSwitchForAll,
    toggleGuild,
  };
}
