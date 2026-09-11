import { SettingsNumberField } from "@/components/settings/settings-number-field";
import { SettingsRow } from "@/components/settings/settings-row";
import {
  SettingsGuildPicker,
  toggleAvailableGuild,
} from "@/features/settings/components/shared/settings-guild-picker";
import { Switch } from "@/components/ui/switch";
import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  NotificationSettings,
  NotificationType,
} from "@lootlog/schema/account-preferences";
import { type FC, type FormEvent, useEffect, useEffectEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

type NotificationCategoryFormProps = {
  categoryKey: NotificationType;
};

const FormSchema = z.object({
  show: z.boolean(),
  highlight: z.boolean(),
  ignoreOtherWorlds: z.boolean(),
  autoHideTimeout: z.number().min(0).optional(),
  guildIds: z.array(z.string()),
  sound: z.boolean(),
});

type FormData = z.infer<typeof FormSchema>;

const areNotificationSettingsEqual = (
  left: NotificationSettings,
  right: NotificationSettings,
) => {
  return (
    left.show === right.show &&
    left.highlight === right.highlight &&
    left.ignoreOtherWorlds === right.ignoreOtherWorlds &&
    left.autoHideTimeout === right.autoHideTimeout &&
    left.sound === right.sound &&
    left.guildIds.length === right.guildIds.length &&
    left.guildIds.every((guildId, index) => guildId === right.guildIds[index])
  );
};

const cloneNotificationSettings = (
  settings: NotificationSettings,
): NotificationSettings => {
  return {
    ...settings,
    guildIds: [...settings.guildIds],
  };
};

const AUTO_HIDE_MIN_SECONDS = 0;

const AUTO_HIDE_MAX_SECONDS = 600;

const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

export const NotificationCategoryForm: FC<NotificationCategoryFormProps> = ({
  categoryKey,
}) => {
  const { t } = useTranslation();

  const {
    accountId,
    isFetched,
    settings: accountSettings,
  } = useCurrentGameAccountNotificationSettings();

  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  const updateUserGameAccountPreferences = useUpdateGameAccountPreferences();

  const currentCategorySettings: NotificationSettings =
    accountSettings[categoryKey];

  const toggleFields: Array<{
    key: keyof Pick<
      NotificationSettings,
      "show" | "ignoreOtherWorlds" | "highlight" | "sound"
    >;
    label: string;
    description: string;
  }> = [
    {
      key: "show",
      label: t("settings.notifications.toggles.show"),
      description: t("settings.notifications.toggles.showDescription"),
    },
    {
      key: "ignoreOtherWorlds",
      label: t("settings.notifications.toggles.ignoreOtherWorlds"),
      description: t(
        "settings.notifications.toggles.ignoreOtherWorldsDescription",
      ),
    },
    {
      key: "highlight",
      label: t("settings.notifications.toggles.highlight"),
      description: t("settings.notifications.toggles.highlightDescription"),
    },
    {
      key: "sound",
      label: t("settings.notifications.toggles.sound"),
      description: t("settings.notifications.toggles.soundDescription"),
    },
  ];

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
    defaultValues: cloneNotificationSettings(currentCategorySettings),
  });

  useEffect(() => {
    const nextFormValues = cloneNotificationSettings(currentCategorySettings);
    const currentFormSettings = cloneNotificationSettings(getValues());

    if (
      areNotificationSettingsEqual(currentFormSettings, currentCategorySettings)
    ) {
      reset(nextFormValues, {
        keepValues: true,
      });

      return;
    }

    reset(nextFormValues);
  }, [currentCategorySettings, getValues, reset]);

  const watchedData = useWatch({ control });

  const syncCurrentValues = () => {
    if (!accountId || !isFetched) {
      return;
    }

    const nextCategorySettings = getValues();

    if (
      areNotificationSettingsEqual(
        nextCategorySettings,
        currentCategorySettings,
      )
    ) {
      return;
    }

    debouncedUpdate({
      notifications: {
        [categoryKey]: nextCategorySettings,
      },
    });
  };

  const syncFromEffect = useEffectEvent(syncCurrentValues);

  // Autosave the form subscription to the debounced server mutation, rather than synchronizing parent render state.
  // oxlint-disable-next-line react-doctor/no-pass-data-to-parent
  useEffect(() => {
    if (!formState.isDirty) {
      return;
    }

    syncFromEffect();
  }, [
    accountId,
    categoryKey,
    currentCategorySettings,
    debouncedUpdate,
    formState.isDirty,
    isFetched,
    getValues,
    watchedData,
  ]);

  const watchShow = watchedData.show;
  const selectedGuildIds = watchedData.guildIds ?? [];

  const toggleGuild = (guildId: string) => {
    if (!guilds || !watchShow) {
      return;
    }

    const normalizedGuildIds = toggleAvailableGuild(
      guilds,
      selectedGuildIds,
      guildId,
    );

    setValue("guildIds", normalizedGuildIds, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <form className="ll:flex ll:flex-col" onSubmit={handleSubmit}>
      {toggleFields.map((field) => {
        const isDisabled = field.key !== "show" && !watchShow;
        const controlId = `${categoryKey}-${field.key}`;

        return (
          <SettingsRow
            key={field.key}
            htmlFor={controlId}
            disabled={isDisabled}
            label={field.label}
            description={field.description}
          >
            <Controller
              name={field.key}
              control={control}
              render={({ field: controllerField }) => (
                <Switch
                  id={controlId}
                  checked={controllerField.value}
                  disabled={isDisabled}
                  onCheckedChange={controllerField.onChange}
                />
              )}
            />
          </SettingsRow>
        );
      })}
      <SettingsRow
        htmlFor={`${categoryKey}-auto-hide-timeout`}
        disabled={!watchShow}
        label={t("settings.notifications.autoHideLabel")}
        description={t("settings.notifications.autoHideDescription")}
      >
        <Controller
          name="autoHideTimeout"
          control={control}
          render={({ field: controllerField }) => (
            <SettingsNumberField
              id={`${categoryKey}-auto-hide-timeout`}
              value={controllerField.value ?? 0}
              min={AUTO_HIDE_MIN_SECONDS}
              max={AUTO_HIDE_MAX_SECONDS}
              unit="s"
              disabled={!watchShow}
              onCommit={controllerField.onChange}
            />
          )}
        />
      </SettingsRow>
      <SettingsRow
        layout="stacked"
        disabled={!watchShow}
        label={t("settings.notifications.serversTitle")}
        description={t("settings.notifications.serversDescription")}
      >
        <SettingsGuildPicker
          aria-label={t("settings.notifications.serversTitle")}
          guilds={guilds}
          selectedGuildIds={selectedGuildIds}
          disabled={!watchShow}
          onToggle={toggleGuild}
          emptyStateLabel={t("settings.notifications.emptyGuilds")}
          className="ll:-mx-1.5 ll:w-[calc(100%+0.75rem)]"
        />
      </SettingsRow>
    </form>
  );
};
