import { updateSettingsField } from "./update-settings-field";
import { useLocalStorage } from "usehooks-ts";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";

type LootStatsSettings = {
  period: LootsControllerGetLootStatsPeriod;
  excludeColossus: boolean;
};

const DEFAULT_SETTINGS: LootStatsSettings = {
  period: "7d",
  excludeColossus: false,
};

export const useLootStatsSettings = () => {
  const guildId = useGuildId();
  const storageKey = `loot-stats-settings-${guildId}`;
  const { world } = useGuildWorld();

  const [settings, setSettings] = useLocalStorage<LootStatsSettings>(
    storageKey,
    DEFAULT_SETTINGS,
  );

  const setPeriod = (period: LootsControllerGetLootStatsPeriod) => {
    setSettings((previous) => updateSettingsField(previous, "period", period));
  };

  const setExcludeColossus = (excludeColossus: boolean) => {
    setSettings((previous) =>
      updateSettingsField(previous, "excludeColossus", excludeColossus),
    );
  };

  return {
    // The page's own filters, with the Organization's world they apply to.
    settings: {
      period: settings.period,
      excludeColossus: settings.excludeColossus,
      world,
    },
    setPeriod,
    setExcludeColossus,
  };
};
