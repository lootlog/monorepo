import { updateSettingsField } from "./update-settings-field";
import { useLocalStorage } from "usehooks-ts";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";

export type LootStatsSettings = {
  period: LootsControllerGetLootStatsPeriod;
  world: string | null;
  excludeColossus: boolean;
};

const DEFAULT_SETTINGS: LootStatsSettings = {
  period: "7d",
  world: null,
  excludeColossus: false,
};

export const useLootStatsSettings = () => {
  const guildId = useGuildId();
  const storageKey = `loot-stats-settings-${guildId}`;

  const [settings, setSettings] = useLocalStorage<LootStatsSettings>(
    storageKey,
    DEFAULT_SETTINGS,
  );

  const setPeriod = (period: LootsControllerGetLootStatsPeriod) => {
    setSettings((previous) => updateSettingsField(previous, "period", period));
  };

  const setWorld = (world: string | null) => {
    setSettings((previous) => updateSettingsField(previous, "world", world));
  };

  const setExcludeColossus = (excludeColossus: boolean) => {
    setSettings((previous) =>
      updateSettingsField(previous, "excludeColossus", excludeColossus),
    );
  };

  return {
    settings,
    setPeriod,
    setWorld,
    setExcludeColossus,
  };
};
