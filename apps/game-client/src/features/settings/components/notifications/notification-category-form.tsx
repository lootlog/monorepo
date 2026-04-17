import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsGuildSelectionGrid } from "@/features/settings/components/shared/settings-guild-selection-grid";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NotificationSettings, NotificationType } from "@lootlog/types";
import { type FC, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDeepCompareEffect } from "react-use";
import { useTranslation } from "react-i18next";
import { z } from "zod";

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

const isDeferredNotificationSyncField = (fieldName: string | null) => {
  return fieldName === "autoHideTimeout";
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
  const { data: guilds } = useGuilds();
  const updateUserGameAccountPreferences =
    useUpdateUserGameAccountPreferences(accountId);

  const currentCategorySettings: NotificationSettings =
    accountSettings[categoryKey];
  const textColor = getTextColor(categoryKey, true);
  const toggleFields: Array<{
    key: keyof Pick<
      NotificationSettings,
      "show" | "ignoreOtherWorlds" | "highlight" | "sound"
    >;
    label: string;
  }> = [
    { key: "show", label: t("settings.notifications.toggles.show") },
    {
      key: "ignoreOtherWorlds",
      label: t("settings.notifications.toggles.ignoreOtherWorlds"),
    },
    {
      key: "highlight",
      label: t("settings.notifications.toggles.highlight"),
    },
    { key: "sound", label: t("settings.notifications.toggles.sound") },
  ];
  const deferredSyncFieldRef = useRef<string | null>(null);
  const debouncedUpdate = useDebouncedCallback(
    (
      payload: Parameters<typeof updateUserGameAccountPreferences.mutate>[0],
    ) => {
      updateUserGameAccountPreferences.mutate(payload);
    },
    300,
  );

  const { control, register, watch, reset, setValue, formState, getValues } =
    useForm<FormData>({
      resolver: zodResolver(FormSchema),
      defaultValues: cloneNotificationSettings(currentCategorySettings),
    });

  useDeepCompareEffect(() => {
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

  const watchedData = watch();

  const syncCurrentValues = () => {
    if (!accountId || !isFetched) {
      return;
    }

    const nextCategorySettings = getValues() as NotificationSettings;
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

  useDeepCompareEffect(() => {
    if (
      !formState.isDirty ||
      isDeferredNotificationSyncField(deferredSyncFieldRef.current)
    ) {
      return;
    }
    syncCurrentValues();
  }, [
    accountId,
    categoryKey,
    currentCategorySettings,
    debouncedUpdate,
    formState.isDirty,
    isFetched,
    watchedData,
  ]);

  const watchShow = watchedData.show;
  const selectedGuildIds = watchedData.guildIds ?? [];

  const toggleGuild = (guildId: string) => {
    if (!guilds || !watchShow) {
      return;
    }

    const nextGuildIds = selectedGuildIds.includes(guildId)
      ? selectedGuildIds.filter((currentGuildId) => currentGuildId !== guildId)
      : [...selectedGuildIds, guildId];

    const normalizedGuildIds = guilds
      .map((guild) => guild.id)
      .filter((currentGuildId) => nextGuildIds.includes(currentGuildId));

    setValue("guildIds", normalizedGuildIds, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <form className="ll:flex ll:flex-col ll:gap-4 ll:py-4">
      <div className="ll:grid ll:gap-2">
        {toggleFields.map((field) => {
          const isDisabled = field.key !== "show" && !watchShow;
          const isHighlightField = field.key === "highlight";

          return (
            <SettingsControlRow
              key={field.key}
              disabled={isDisabled}
              label={field.label}
              labelStyle={isHighlightField ? { color: textColor } : undefined}
            >
              <Controller
                name={field.key}
                control={control}
                render={({ field: controllerField }) => (
                  <Switch
                    id={`${categoryKey}-${field.key}`}
                    checked={controllerField.value}
                    disabled={isDisabled}
                    onCheckedChange={controllerField.onChange}
                  />
                )}
              />
            </SettingsControlRow>
          );
        })}
        <SettingsControlRow
          disabled={!watchShow}
          label={t("settings.notifications.autoHideLabel")}
          description={t("settings.notifications.autoHideDescription")}
          controlClassName="ll:w-12"
        >
          <Input
            id={`${categoryKey}-auto-hide-timeout`}
            type="number"
            disabled={!watchShow}
            className="ll:h-5! ll:w-full! ll:px-1! ll:py-0! ll:text-[11px]! ll:text-center"
            placeholder="0"
            onFocus={() => {
              deferredSyncFieldRef.current = "autoHideTimeout";
            }}
            {...register("autoHideTimeout", {
              onBlur: () => {
                deferredSyncFieldRef.current = null;
                syncCurrentValues();
              },
              setValueAs: (value) => {
                if (value === "" || value === null || value === undefined) {
                  return 0;
                }

                const parsedValue = Number(value);
                return Number.isNaN(parsedValue) ? 0 : parsedValue;
              },
            })}
          />
        </SettingsControlRow>
      </div>

      <SettingsSection title={t("settings.notifications.serversTitle")}>
        <SettingsGuildSelectionGrid
          guilds={guilds}
          selectedGuildIds={selectedGuildIds}
          disabled={!watchShow}
          onToggle={toggleGuild}
          emptyStateLabel={t("settings.notifications.emptyGuilds")}
          variant="compact"
        />
      </SettingsSection>
    </form>
  );
};
