import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const debouncedUpdate = useDebouncedCallback(
    (
      payload: Parameters<typeof updateUserGameAccountPreferences.mutate>[0],
    ) => {
      updateUserGameAccountPreferences.mutate(payload);
    },
    300,
  );

  const { control, register, watch, reset, setValue, formState } =
    useForm<FormData>({
      resolver: zodResolver(FormSchema),
      defaultValues: currentCategorySettings,
    });

  const lastSettingsRef = useRef<NotificationSettings>(currentCategorySettings);
  useDeepCompareEffect(() => {
    if (lastSettingsRef.current !== currentCategorySettings) {
      lastSettingsRef.current = currentCategorySettings;
      reset(currentCategorySettings);
    }
  }, [currentCategorySettings, reset]);

  const watchedData = watch();
  useDeepCompareEffect(() => {
    if (!accountId || !isFetched || !formState.isDirty) {
      return;
    }

    const nextCategorySettings = watchedData as NotificationSettings;
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
            Auto ukrywanie: (sekundy)
          </Label>
          <Input
            id={`${categoryKey}-auto-hide-timeout`}
            type="number"
            disabled={!watchShow}
            className="ll:h-5! ll:w-12! ll:px-1! ll:py-0! ll:text-[11px]! ll:text-center"
            placeholder="0"
            {...register("autoHideTimeout", {
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
        <div className="ll:grid ll:grid-cols-2 ll:gap-1.5 xl:ll:grid-cols-3 ll:mt-2">
          {guilds?.map((guild) => {
            const isSelected = selectedGuildIds.includes(guild.id);

            return (
              <button
                key={guild.id}
                type="button"
                disabled={!watchShow}
                aria-pressed={isSelected}
                onClick={() => toggleGuild(guild.id)}
                className={cn(
                  "ll:min-h-9 ll:rounded-md ll:border ll:px-2.5 ll:py-1.5 ll:text-left ll:text-[11px] ll:font-semibold ll:leading-4 ll:transition-all ll-custom-cursor-pointer",
                  "ll:focus-visible:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-white/60",
                  !watchShow &&
                    "ll:cursor-not-allowed ll:border-gray-800 ll:bg-gray-900/30 ll:text-gray-500 ll:opacity-60",
                  watchShow &&
                    !isSelected &&
                    "ll:border-gray-700 ll:bg-gray-950/70 ll:text-gray-200 ll:hover:border-gray-500 ll:hover:bg-gray-900",
                  watchShow &&
                    isSelected &&
                    "ll:border-white/70 ll:bg-gray-800 ll:text-white ll:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                )}
                style={
                  watchShow && isSelected
                    ? {
                        borderColor: textColor,
                        backgroundColor: "rgba(255,255,255,0.08)",
                      }
                    : undefined
                }
              >
                <span className="ll:flex ll:items-center ll:gap-2">
                  <Avatar className="ll:h-5 ll:w-5 ll:rounded-sm">
                    <AvatarImage
                      src={guild.icon ?? undefined}
                      alt={guild.name}
                      className="ll:h-full ll:w-full ll:rounded-sm ll:object-cover"
                    />
                    <AvatarFallback className="ll:rounded-sm ll:text-[9px] ll:font-semibold ll:text-gray-200">
                      {guild.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="ll:min-w-0 ll:flex-1 ll:truncate">
                    {guild.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
};
