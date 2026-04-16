import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DetectorNpcType, DetectorTypeSettings } from "@lootlog/types";
import { type FC } from "react";
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
    const currentFormSettings = getDetectorTypeSettingsFromFormData(
      getValues(),
    );

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

    const nextCategorySettings = getDetectorTypeSettingsFromFormData(
      watchedData,
    );

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
            <div
              key={field.key}
              className={cn(
                "ll:flex ll:items-center ll:justify-between ll:gap-3 ll:rounded-sm ll:border ll:px-2.5 ll:py-1.5 ll:transition-colors",
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
      </div>
    </form>
  );
};
