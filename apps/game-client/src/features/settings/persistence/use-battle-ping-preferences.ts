import { normalizeBattlePings } from "@lootlog/domain/account-preferences";
import { selectSettingsValue } from "./settings-documents";
import { enqueueSettingsPatch } from "./settings-patch-client";
import { useSettingsSaveStatus } from "./settings-save-status.store";
import { useSettingsDocuments } from "./use-settings-documents";

/**
 * Battle pings are an account-scoped `gameData` document field of their own,
 * outside the legacy account preferences contract.
 */
export const useBattlePingPreferences = () => {
  const { data: documents } = useSettingsDocuments();
  const status = useSettingsSaveStatus();

  const setEnabled = (enabled: boolean) => {
    enqueueSettingsPatch({
      domain: "gameData",
      scopeType: "GAME_ACCOUNT",
      set: { battlePings: { enabled } },
    });
  };

  return {
    data: documents
      ? normalizeBattlePings(
          selectSettingsValue(documents, "gameData.battlePings"),
        )
      : undefined,
    isPending: status === "saving",
    setEnabled,
  };
};
