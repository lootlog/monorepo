import { useUpdateGameAccountPreferences } from "@/lib/settings-persistence/use-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import {
  DETECTOR_NPC_TYPES,
  type DetectorNpcType,
  type DetectorTypeSettings,
  type DetectorTypeSettingsPatch,
} from "@lootlog/schema/account-preferences";

type DetectorSwitch = keyof DetectorTypeSettings;

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
