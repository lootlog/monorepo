import { toggleAvailableGuild } from "@/features/settings/components/shared/settings-guild-picker";
import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  NOTIFICATION_TYPES,
  type NotificationSettings,
  type NotificationsSettings,
} from "@lootlog/schema/account-preferences";
import { useEffect, useEffectEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

export const AUTO_HIDE_MIN_SECONDS = 0;

export const AUTO_HIDE_MAX_SECONDS = 600;

const NotificationSettingsSchema = z.object({
  show: z.boolean(),
  highlight: z.boolean(),
  ignoreOtherWorlds: z.boolean(),
  autoHideTimeout: z
    .number()
    .min(AUTO_HIDE_MIN_SECONDS)
    .max(AUTO_HIDE_MAX_SECONDS)
    .optional(),
  guildIds: z.array(z.string()),
  sound: z.boolean(),
});

const FormSchema = z.object({
  rules: z.object({
    ELITE2: NotificationSettingsSchema,
    HERO: NotificationSettingsSchema,
    COLOSSUS: NotificationSettingsSchema,
    TITAN: NotificationSettingsSchema,
    message: NotificationSettingsSchema,
    "party-gathering": NotificationSettingsSchema,
  }),
});

type FormData = z.infer<typeof FormSchema>;

const areNotificationSettingsEqual = (
  left: NotificationSettings,
  right: NotificationSettings,
) =>
  left.show === right.show &&
  left.highlight === right.highlight &&
  left.ignoreOtherWorlds === right.ignoreOtherWorlds &&
  left.autoHideTimeout === right.autoHideTimeout &&
  left.sound === right.sound &&
  left.guildIds.length === right.guildIds.length &&
  left.guildIds.every((guildId, index) => guildId === right.guildIds[index]);

// SAFETY: the entries cover every NotificationType key, so the record is complete.
const cloneRules = (settings: NotificationsSettings): NotificationsSettings =>
  Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [
      type,
      { ...settings[type], guildIds: [...settings[type].guildIds] },
    ]),
  ) as NotificationsSettings;

const areRulesEqual = (
  left: NotificationsSettings,
  right: NotificationsSettings,
) =>
  NOTIFICATION_TYPES.every((type) =>
    areNotificationSettingsEqual(left[type], right[type]),
  );

/**
 * The shared server selection shown for every category: the union of the
 * stored per-category lists, ordered like the accessible guilds. A union
 * keeps every notification a player used to receive when the lists differ.
 */
const mergeGuildSelection = (
  rules: NotificationsSettings,
  guilds: readonly { id: string }[] | undefined,
): string[] => {
  const selected = new Set(
    NOTIFICATION_TYPES.flatMap((type) => rules[type].guildIds),
  );

  if (!guilds) return [...selected];

  return guilds.flatMap((guild) => (selected.has(guild.id) ? [guild.id] : []));
};

/**
 * One form for every notification category. Edits autosave; only the
 * categories that differ from the stored settings are sent.
 */
export function useNotificationRulesForm() {
  const {
    accountId,
    isFetched,
    settings: accountSettings,
  } = useCurrentGameAccountNotificationSettings();

  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  const updateUserGameAccountPreferences = useUpdateGameAccountPreferences();

  const debouncedUpdate = useDebouncedCallback(
    (
      payload: Parameters<typeof updateUserGameAccountPreferences.mutate>[0],
    ) => {
      updateUserGameAccountPreferences.mutate(payload);
    },
    300,
  );

  const { control, reset, setValue, formState, getValues } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { rules: cloneRules(accountSettings) },
  });

  useEffect(() => {
    const nextFormValues = { rules: cloneRules(accountSettings) };

    if (areRulesEqual(getValues().rules, accountSettings)) {
      reset(nextFormValues, { keepValues: true });

      return;
    }

    reset(nextFormValues);
  }, [accountSettings, getValues, reset]);

  // SAFETY: initialization and every reset supply every category, and fields are never unregistered.
  const watchedData = useWatch({ control }) as FormData;

  const syncCurrentValues = () => {
    if (!accountId || !isFetched) {
      return;
    }

    const nextRules = getValues().rules;

    const changedRules = Object.fromEntries(
      NOTIFICATION_TYPES.filter(
        (type) =>
          !areNotificationSettingsEqual(nextRules[type], accountSettings[type]),
      ).map((type) => [type, nextRules[type]]),
    );

    if (Object.keys(changedRules).length === 0) {
      return;
    }

    debouncedUpdate({ notifications: changedRules });
  };

  const syncFromEffect = useEffectEvent(syncCurrentValues);

  useEffect(() => {
    if (!formState.isDirty) {
      return;
    }

    syncFromEffect();
  }, [accountId, accountSettings, formState.isDirty, isFetched, watchedData]);

  const guildIds = mergeGuildSelection(watchedData.rules, guilds);

  /**
   * One server list for every category. Toggling writes the merged list to
   * each category, so lists that diverged before converge on the first edit.
   */
  const toggleGuild = (guildId: string) => {
    if (!guilds) {
      return;
    }

    const nextGuildIds = toggleAvailableGuild(guilds, guildIds, guildId);

    for (const type of NOTIFICATION_TYPES) {
      setValue(`rules.${type}.guildIds`, nextGuildIds, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  /** Sets one switch in every category where it is editable (its row is on). */
  const setSwitchForAll = (
    field: "show" | "ignoreOtherWorlds" | "highlight" | "sound",
    checked: boolean,
  ) => {
    for (const type of NOTIFICATION_TYPES) {
      if (field !== "show" && !watchedData.rules[type].show) continue;

      setValue(`rules.${type}.${field}`, checked, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  return {
    control,
    guilds,
    guildIds,
    rules: watchedData.rules,
    setSwitchForAll,
    toggleGuild,
  };
}
