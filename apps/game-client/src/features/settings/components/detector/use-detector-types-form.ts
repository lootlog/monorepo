import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import {
  DETECTOR_NPC_TYPES,
  type DetectorNpcType,
  type DetectorTypeSettings,
  type DetectorTypeSettingsPatch,
} from "@lootlog/schema/account-preferences";

type DetectorSwitch = keyof DetectorTypeSettings;

/**
 * Per-type detector switches. Every change is written straight through the
 * shared settings patch queue, which updates the cache optimistically,
 * batches rapid clicks into one request and re-applies patches still pending
 * when a server response lands, so a switch never snaps back mid-save.
 */
export function useDetectorTypesForm() {
  const { settings } = useCurrentGameAccountDetectorSettings();
  const { mutate } = useUpdateGameAccountPreferences();

  const setSwitch = (
    type: DetectorNpcType,
    field: DetectorSwitch,
    checked: boolean,
  ) => {
    const patch: DetectorTypeSettingsPatch = { [field]: checked };
    mutate({ detector: { [type]: patch } });
  };

  /** Sets one switch for every type where it is editable (its row is on). */
  const setSwitchForAll = (field: DetectorSwitch, checked: boolean) => {
    const detector = Object.fromEntries(
      DETECTOR_NPC_TYPES.filter(
        (type) => field === "detect" || settings[type].detect,
      ).map((type) => [type, { [field]: checked }]),
    );

    if (Object.keys(detector).length > 0) mutate({ detector });
  };

  return { setSwitch, setSwitchForAll, types: settings };
}
