import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DETECTOR_NPC_TYPES,
  type DetectorNpcType,
  type DetectorTypeSettings,
} from "@lootlog/schema/account-preferences";
import { useEffect, useEffectEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

const DetectorTypeSettingsSchema = z.object({
  detect: z.boolean(),
  autoSend: z.boolean(),
  notifyWindow: z.boolean(),
  highlight: z.boolean(),
  notifySound: z.boolean(),
});

const FormSchema = z.object({
  types: z.object({
    ELITE2: DetectorTypeSettingsSchema,
    HERO: DetectorTypeSettingsSchema,
    COLOSSUS: DetectorTypeSettingsSchema,
    TITAN: DetectorTypeSettingsSchema,
  }),
});

type FormData = z.infer<typeof FormSchema>;

type DetectorTypesSettings = Record<DetectorNpcType, DetectorTypeSettings>;

const cloneDetectorTypeSettings = (
  settings: DetectorTypeSettings,
): DetectorTypeSettings => ({
  detect: settings.detect,
  autoSend: settings.autoSend,
  notifyWindow: settings.notifyWindow,
  highlight: settings.highlight,
  notifySound: settings.notifySound,
});

const areDetectorTypeSettingsEqual = (
  left: DetectorTypeSettings,
  right: DetectorTypeSettings,
) =>
  left.detect === right.detect &&
  left.autoSend === right.autoSend &&
  left.notifyWindow === right.notifyWindow &&
  left.highlight === right.highlight &&
  left.notifySound === right.notifySound;

// SAFETY: the entries cover every DetectorNpcType key, so the record is complete.
const cloneTypes = (settings: DetectorTypesSettings): DetectorTypesSettings =>
  Object.fromEntries(
    DETECTOR_NPC_TYPES.map((type) => [
      type,
      cloneDetectorTypeSettings(settings[type]),
    ]),
  ) as DetectorTypesSettings;

const areTypesEqual = (
  left: DetectorTypesSettings,
  right: DetectorTypesSettings,
) =>
  DETECTOR_NPC_TYPES.every((type) =>
    areDetectorTypeSettingsEqual(left[type], right[type]),
  );

/**
 * One form for every detected NPC type. Edits autosave; only the types that
 * differ from the stored settings are sent.
 */
export function useDetectorTypesForm() {
  const {
    accountId,
    isFetched,
    settings: accountSettings,
  } = useCurrentGameAccountDetectorSettings();

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
    defaultValues: { types: cloneTypes(accountSettings) },
  });

  useEffect(() => {
    const nextFormValues = { types: cloneTypes(accountSettings) };

    if (areTypesEqual(getValues().types, accountSettings)) {
      reset(nextFormValues, { keepValues: true });

      return;
    }

    reset(nextFormValues);
  }, [accountSettings, getValues, reset]);

  // SAFETY: initialization and every reset supply every type, and fields are never unregistered.
  const watchedData = useWatch({ control }) as FormData;

  const syncCurrentValues = () => {
    if (!accountId || !isFetched) {
      return;
    }

    const nextTypes = getValues().types;

    const changedTypes = Object.fromEntries(
      DETECTOR_NPC_TYPES.filter(
        (type) =>
          !areDetectorTypeSettingsEqual(nextTypes[type], accountSettings[type]),
      ).map((type) => [type, cloneDetectorTypeSettings(nextTypes[type])]),
    );

    if (Object.keys(changedTypes).length === 0) {
      return;
    }

    debouncedUpdate({ detector: changedTypes });
  };

  const syncFromEffect = useEffectEvent(syncCurrentValues);

  useEffect(() => {
    if (!formState.isDirty) {
      return;
    }

    syncFromEffect();
  }, [accountId, accountSettings, formState.isDirty, isFetched, watchedData]);

  /** Sets one switch for every type where it is editable (its row is on). */
  const setSwitchForAll = (
    field: keyof DetectorTypeSettings,
    checked: boolean,
  ) => {
    for (const type of DETECTOR_NPC_TYPES) {
      if (field !== "detect" && !watchedData.types[type].detect) continue;

      setValue(`types.${type}.${field}`, checked, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  return { control, setSwitchForAll, types: watchedData.types };
}
