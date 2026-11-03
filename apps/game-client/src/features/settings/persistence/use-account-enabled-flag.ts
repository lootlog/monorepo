import {
  normalizeBattlePings,
  normalizeLootSplit,
} from "@lootlog/domain/account-preferences";
import { selectSettingsValue } from "./settings-documents";
import { enqueueSettingsPatch } from "./settings-patch-client";
import { useSettingsDocuments } from "./use-settings-documents";

const NORMALIZERS = {
  battlePings: normalizeBattlePings,
  lootSplit: normalizeLootSplit,
};

/**
 * Account-scoped `gameData` on/off fields of their own, outside the legacy
 * account preferences contract.
 */
export const useAccountEnabledFlag = (flag: keyof typeof NORMALIZERS) => {
  const { data: documents } = useSettingsDocuments();

  const setEnabled = (enabled: boolean) => {
    enqueueSettingsPatch({
      domain: "gameData",
      scopeType: "GAME_ACCOUNT",
      set: { [flag]: { enabled } },
    });
  };

  return {
    data: documents
      ? NORMALIZERS[flag](selectSettingsValue(documents, `gameData.${flag}`))
      : undefined,
    setEnabled,
  };
};
