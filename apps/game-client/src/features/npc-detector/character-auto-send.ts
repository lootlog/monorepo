import { getFixedT } from "@/i18n/get-fixed-t";
import { selectSettingsValue } from "@/features/settings/persistence/settings-documents";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "@/features/settings/persistence/settings-patch-client";
import { useGameStore } from "@/store/game.store";
import { toast } from "sonner";

/**
 * Flips the current character's detector auto-send switch for every monster
 * type. Skips the toast while the character is unknown and nothing was saved.
 */
export const toggleCharacterDetectorAutoSend = () => {
  const enabled = !selectSettingsValue(
    readCurrentSettingsDocuments(),
    "gameData.detectorAutoSendEnabled",
  );

  const queued = enqueueSettingsPatch({
    domain: "gameData",
    scopeType: "CHARACTER",
    set: { detectorAutoSendEnabled: enabled },
  });

  if (!queued) return;

  const t = getFixedT("npcDetector");
  const name = useGameStore.getState().game?.hero.name ?? "";

  toast.success(
    t(enabled ? "autoSend.enabled" : "autoSend.disabled", { name }),
  );
};
