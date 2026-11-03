import {
  normalizeBattlePings,
  normalizeLootSplit,
} from "@lootlog/domain/account-preferences";
import type { SettingsCatalogValue } from "@lootlog/domain/settings-documents";
import type { SettingsJsonRecord } from "@lootlog/domain/settings-paths";
import type {
  BattlePingPreferences,
  LootSplitPreferences,
} from "@lootlog/schema/account-preferences";
import { selectSettingsValue } from "./settings-documents";
import { enqueueSettingsPatch } from "./settings-patch-client";
import { useSettingsDocuments } from "./use-settings-documents";

type AccountFlagValues = {
  battlePings: BattlePingPreferences;
  lootSplit: LootSplitPreferences;
};

type AccountFlag = keyof AccountFlagValues;

// Mapped per flag, so a flag's normalizer returns that flag's own shape.
type AccountFlagNormalizers = {
  [TFlag in AccountFlag]: (
    stored: SettingsCatalogValue<`gameData.${TFlag}`>,
  ) => AccountFlagValues[TFlag];
};

const NORMALIZERS: AccountFlagNormalizers = {
  battlePings: normalizeBattlePings,
  lootSplit: normalizeLootSplit,
};

/**
 * Account-scoped `gameData` fields headed by an on/off flag, outside the
 * legacy account preferences contract.
 */
export const useAccountEnabledFlag = <TFlag extends AccountFlag>(
  flag: TFlag,
) => {
  const { data: documents } = useSettingsDocuments();

  // Sets only the leaves it names, so a flag change keeps its siblings.
  const update = (set: SettingsJsonRecord) => {
    enqueueSettingsPatch({
      domain: "gameData",
      scopeType: "GAME_ACCOUNT",
      set: { [flag]: set },
    });
  };

  return {
    data: documents
      ? NORMALIZERS[flag](selectSettingsValue(documents, `gameData.${flag}`))
      : undefined,
    setEnabled: (enabled: boolean) => update({ enabled }),
    update,
  };
};
