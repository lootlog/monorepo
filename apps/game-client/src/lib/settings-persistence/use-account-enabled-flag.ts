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

type AccountFlagNormalizers = {
  [TFlag in AccountFlag]: (
    stored: SettingsCatalogValue<`gameData.${TFlag}`>,
  ) => AccountFlagValues[TFlag];
};

const NORMALIZERS: AccountFlagNormalizers = {
  battlePings: normalizeBattlePings,
  lootSplit: normalizeLootSplit,
};

export const useAccountEnabledFlag = <TFlag extends AccountFlag>(
  flag: TFlag,
) => {
  const { data: documents } = useSettingsDocuments();

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
