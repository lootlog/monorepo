import { GuildSwitcher } from "@/components/guild-switcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NotificationSettings, NotificationType } from "@lootlog/types";
import { type FC, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDeepCompareEffect } from "react-use";
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

const TOGGLE_FIELDS: Array<{
  key: keyof Pick<
    NotificationSettings,
    "show" | "ignoreOtherWorlds" | "highlight" | "sound"
  >;
  label: string;
}> = [
  { key: "show", label: "Wyświetlaj" },
  { key: "ignoreOtherWorlds", label: "Ignoruj inne światy" },
  { key: "highlight", label: "Podświetlenie" },
  { key: "sound", label: "Powiadom dźwiękiem" },
];

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
        {TOGGLE_FIELDS.map((field) => {
          const isDisabled = field.key !== "show" && !watchShow;
          const isHighlightField = field.key === "highlight";

          return (
            <div
              key={field.key}
              className={cn(
                "ll:flex ll:items-center ll:justify-between ll:gap-4 ll:rounded-md ll:border ll:px-3 ll:py-2 ll:transition-colors",
                isDisabled
                  ? "ll:border-gray-700/80 ll:bg-gray-900/30 ll:opacity-60"
                  : "ll:border-gray-600 ll:bg-gray-900/70 ll:hover:border-gray-500",
              )}
            >
              <Label
                htmlFor={`${categoryKey}-${field.key}`}
                className="ll:flex-1 ll:text-[12px] ll:leading-4"
                style={isHighlightField ? { color: textColor } : undefined}
              >
                {field.label}
              </Label>
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
            </div>
          );
        })}
        <div
          className={cn(
            "ll:flex ll:items-center ll:justify-between ll:gap-4 ll:rounded-md ll:border ll:px-3 ll:py-2 ll:transition-colors",
            !watchShow
              ? "ll:border-gray-700/80 ll:bg-gray-900/30 ll:opacity-60"
              : "ll:border-gray-600 ll:bg-gray-900/70 ll:hover:border-gray-500",
          )}
        >
          <Label
            htmlFor={`${categoryKey}-auto-hide-timeout`}
            className="ll:flex-1 ll:text-[12px] ll:leading-4"
          >
            Auto ukrywanie (sekundy, 0 = wyłączone):
          </Label>
          <Input
            id={`${categoryKey}-auto-hide-timeout`}
            type="number"
            disabled={!watchShow}
            className="ll:h-5! ll:w-12! ll:px-1! ll:py-0! ll:text-[11px]! ll:text-center"
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
        </div>
      </div>

      <div className="ll:space-y-3">
        <Label className="ll:block">Z jakich serwerów:</Label>
        <GuildSwitcher
          multiple
          selectedValues={selectedGuildIds}
          disabled={!watchShow}
          className="ll:mt-0"
          onToggle={toggleGuild}
        />
      </div>
    </form>
  );
};
