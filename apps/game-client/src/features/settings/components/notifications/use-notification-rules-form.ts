import { toggleAvailableGuild } from "@/features/settings/components/shared/settings-guild-picker";
import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { zodResolver } from "@hookform/resolvers/zod";
import { cloneNotifications } from "@lootlog/domain/account-preferences";
import {
  NOTIFICATION_TYPES,
  type NotificationSettings,
  type NotificationsSettings,
  type NotificationsSettingsPatch,
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
  sound: z.boolean(),
});

const FormSchema = z.object({
  guildIds: z.array(z.string()),
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
  left.sound === right.sound;

const areGuildIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((guildId, index) => guildId === right[index]);

const toFormValues = (settings: NotificationsSettings): FormData => {
  const { guildIds, ...rules } = cloneNotifications(settings);

  return { guildIds, rules };
};

const areFormValuesEqual = (
  values: FormData,
  settings: NotificationsSettings,
) =>
  areGuildIdsEqual(values.guildIds, settings.guildIds) &&
  NOTIFICATION_TYPES.every((type) =>
    areNotificationSettingsEqual(values.rules[type], settings[type]),
  );

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
    defaultValues: toFormValues(accountSettings),
  });

  useEffect(() => {
    const nextFormValues = toFormValues(accountSettings);

    if (areFormValuesEqual(getValues(), accountSettings)) {
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

    const { guildIds: nextGuildIds, rules: nextRules } = getValues();

    const patch: NotificationsSettingsPatch = Object.fromEntries(
      NOTIFICATION_TYPES.filter(
        (type) =>
          !areNotificationSettingsEqual(nextRules[type], accountSettings[type]),
      ).map((type) => [type, nextRules[type]]),
    );

    if (!areGuildIdsEqual(nextGuildIds, accountSettings.guildIds)) {
      patch.guildIds = nextGuildIds;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    debouncedUpdate({ notifications: patch });
  };

  const syncFromEffect = useEffectEvent(syncCurrentValues);

  useEffect(() => {
    if (!formState.isDirty) {
      return;
    }

    syncFromEffect();
  }, [accountId, accountSettings, formState.isDirty, isFetched, watchedData]);

  const toggleGuild = (guildId: string) => {
    if (!guilds) {
      return;
    }

    setValue(
      "guildIds",
      toggleAvailableGuild(guilds, watchedData.guildIds, guildId),
      { shouldDirty: true, shouldTouch: true },
    );
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
    guildIds: watchedData.guildIds,
    rules: watchedData.rules,
    setSwitchForAll,
    toggleGuild,
  };
}
