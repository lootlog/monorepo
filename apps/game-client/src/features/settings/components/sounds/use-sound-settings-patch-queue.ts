import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { UpdateSoundSettingsDto } from "@lootlog/api-client/models/main/update-sound-settings-dto";
import { useRef } from "react";
import { mergeSoundSettingsPatches } from "./sound-settings-patch";

export const useSoundSettingsPatchQueue = (
  updateSettings: (payload: UpdateSoundSettingsDto) => void,
  delay = 300,
) => {
  const pendingPatchRef = useRef<UpdateSoundSettingsDto>({});
  const flush = useDebouncedCallback(() => {
    const payload = pendingPatchRef.current;
    pendingPatchRef.current = {};
    updateSettings(payload);
  }, delay);

  return (payload: UpdateSoundSettingsDto) => {
    pendingPatchRef.current = mergeSoundSettingsPatches(
      pendingPatchRef.current,
      payload,
    );
    flush();
  };
};
