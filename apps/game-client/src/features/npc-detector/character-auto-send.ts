import { getFixedT } from "@/i18n/get-fixed-t";
import { selectSettingsValue } from "@/features/settings/persistence/settings-documents";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "@/features/settings/persistence/settings-patch-client";
import { useGameStore } from "@/store/game.store";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

/**
 * Flips the current character's detector auto-send switch for every monster
 * type. Skips the message while the character is unknown and nothing was saved.
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

  showRuntimeMessage(
    t(enabled ? "autoSend.enabled" : "autoSend.disabled", { name }),
  );
};
