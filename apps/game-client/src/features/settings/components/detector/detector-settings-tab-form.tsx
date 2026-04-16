import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DetectorNpcType, DetectorTypeSettings } from "@lootlog/types";
import type { FC } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDeepCompareEffect } from "react-use";
import { z } from "zod";

type DetectorSettingsTabFormProps = {
  categoryKey: DetectorNpcType;
};

const FormSchema = z.object({
  detect: z.boolean(),
  autoSend: z.boolean(),
  notifyWindow: z.boolean(),
  highlight: z.boolean(),
  notifySound: z.boolean(),
});

type FormData = z.infer<typeof FormSchema>;

const TOGGLE_FIELDS: Array<{
  key: keyof DetectorTypeSettings;
  label: string;
}> = [
  { key: "detect", label: "Wykrywaj" },
  { key: "autoSend", label: "Auto wysylanie" },
  { key: "notifyWindow", label: "Okno powiadomienia" },
  { key: "highlight", label: "Podswietlenie" },
  { key: "notifySound", label: "Powiadom dzwiekiem" },
];

const cloneDetectorTypeSettings = (
  settings: DetectorTypeSettings,
): DetectorTypeSettings => {
  return {
    detect: settings.detect,
    autoSend: settings.autoSend,
    notifyWindow: settings.notifyWindow,
    highlight: settings.highlight,
    notifySound: settings.notifySound,
  };
};

const getDetectorTypeSettingsFromFormData = (
  settings: FormData,
): DetectorTypeSettings => {
  return {
    detect: settings.detect,
    autoSend: settings.autoSend,
    notifyWindow: settings.notifyWindow,
    highlight: settings.highlight,
    notifySound: settings.notifySound,
  };
};

const areDetectorTypeSettingsEqual = (
  left: DetectorTypeSettings,
  right: DetectorTypeSettings,
) => {
  return (
    left.detect === right.detect &&
    left.autoSend === right.autoSend &&
    left.notifyWindow === right.notifyWindow &&
    left.highlight === right.highlight &&
    left.notifySound === right.notifySound
  );
};

export const DetectorSettingsTabForm: FC<DetectorSettingsTabFormProps> = ({
  categoryKey,
}) => {
  const {
    accountId,
    isFetched,
    settings: accountSettings,
  } = useCurrentGameAccountDetectorSettings();
  const updateUserGameAccountPreferences =
    useUpdateUserGameAccountPreferences(accountId);

  const currentCategorySettings = accountSettings[categoryKey];
  const textColor = getTextColor(categoryKey, true);
  const debouncedUpdate = useDebouncedCallback(
    (
      payload: Parameters<typeof updateUserGameAccountPreferences.mutate>[0],
    ) => {
      updateUserGameAccountPreferences.mutate(payload);
    },
    300,
  );

  const { control, watch, reset, formState, getValues } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: cloneDetectorTypeSettings(currentCategorySettings),
  });

  useDeepCompareEffect(() => {
    const nextFormValues = cloneDetectorTypeSettings(currentCategorySettings);
    const currentFormSettings =
      getDetectorTypeSettingsFromFormData(getValues());

    if (
      areDetectorTypeSettingsEqual(currentFormSettings, currentCategorySettings)
    ) {
      reset(nextFormValues, {
        keepValues: true,
      });

      return;
    }

    reset(nextFormValues);
  }, [currentCategorySettings, getValues, reset]);

  const watchedData = watch();

  useDeepCompareEffect(() => {
    if (!accountId || !isFetched || !formState.isDirty) {
      return;
    }

    const nextCategorySettings =
      getDetectorTypeSettingsFromFormData(watchedData);

    if (
      areDetectorTypeSettingsEqual(
        nextCategorySettings,
        currentCategorySettings,
      )
    ) {
      return;
    }

    debouncedUpdate({
      detector: {
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

  const watchDetect = watchedData.detect;

  return (
    <form className="ll:flex ll:flex-col ll:gap-3 ll:py-3">
      <div className="ll:grid ll:gap-2">
        {TOGGLE_FIELDS.map((field) => {
          const isDisabled = field.key !== "detect" && !watchDetect;
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
      </div>
    </form>
  );
};
