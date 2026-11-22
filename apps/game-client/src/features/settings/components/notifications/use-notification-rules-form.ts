import { toggleAvailableGuild } from "@/lib/selected-lootlog-guild";
import { useUpdateGameAccountPreferences } from "@/lib/settings-persistence/use-game-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import {
  NOTIFICATION_TYPES,
  type NotificationSettings,
  type NotificationType,
} from "@lootlog/schema/account-preferences";

export const AUTO_HIDE_MIN_SECONDS = 0;

export const AUTO_HIDE_MAX_SECONDS = 600;

type NotificationSwitch = "show" | "ignoreOtherWorlds" | "highlight" | "sound";

export function useNotificationRulesForm() {
  const { settings } = useCurrentGameAccountNotificationSettings();

  const {
    guildsQuery: { data: accessibleGuilds },
    orderedGuilds: guilds,
  } = useLootlogGuilds();

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

  const setAutoHideTimeout = (type: NotificationType, seconds: number) =>
    setRule(type, { autoHideTimeout: seconds });

  const toggleGuild = (guildId: string) => {
    if (!accessibleGuilds) return;

    mutate({
      notifications: {
        guildIds: toggleAvailableGuild(guilds, settings.guildIds, guildId),
      },
    });
  };

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
