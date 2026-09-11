import { SettingsRow } from "@/components/settings/settings-row";
import { Switch } from "@/components/ui/switch";
import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  DetectorNpcType,
  DetectorTypeSettings,
} from "@lootlog/schema/account-preferences";
import { type FC, useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

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
  const { t } = useTranslation();

  const {
    accountId,
    isFetched,
    settings: accountSettings,
  } = useCurrentGameAccountDetectorSettings();

  const updateUserGameAccountPreferences = useUpdateGameAccountPreferences();

  const currentCategorySettings = accountSettings[categoryKey];

  const toggleFields: Array<{
    key: keyof DetectorTypeSettings;
    label: string;
    description: string;
  }> = [
    {
      key: "detect",
      label: t("settings.detector.toggles.detect"),
      description: t("settings.detector.toggles.detectDescription"),
    },
    {
      key: "autoSend",
      label: t("settings.detector.toggles.autoSend"),
      description: t("settings.detector.toggles.autoSendDescription"),
    },
    {
      key: "notifyWindow",
      label: t("settings.detector.toggles.notifyWindow"),
      description: t("settings.detector.toggles.notifyWindowDescription"),
    },
    {
      key: "highlight",
      label: t("settings.detector.toggles.highlight"),
      description: t("settings.detector.toggles.highlightDescription"),
    },
    {
      key: "notifySound",
      label: t("settings.detector.toggles.notifySound"),
      description: t("settings.detector.toggles.notifySoundDescription"),
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

  const { control, reset, formState, getValues } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: cloneDetectorTypeSettings(currentCategorySettings),
  });

  useEffect(() => {
    const nextFormValues = cloneDetectorTypeSettings(currentCategorySettings);
    const currentFormSettings = cloneDetectorTypeSettings(getValues());

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

  // SAFETY: Initialization and every reset supply all five boolean fields, and fields are never unregistered.
  const watchedData = useWatch({ control }) as FormData;

  useEffect(() => {
    if (!accountId || !isFetched || !formState.isDirty) {
      return;
    }

    const nextCategorySettings = cloneDetectorTypeSettings(watchedData);

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
    <form className="ll:flex ll:flex-col">
      {toggleFields.map((field) => {
        const isDisabled = field.key !== "detect" && !watchDetect;
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
    </form>
  );
};
