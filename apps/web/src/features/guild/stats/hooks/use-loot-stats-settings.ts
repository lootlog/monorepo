import { useLocalStorage } from "usehooks-ts";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { LootsControllerGetLootStatsPeriod } from "@/lib/api/generated/main/model/loots-controller-get-loot-stats-period";

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
    setSettings((prev) => {
      if (prev.period === period) return prev;
      return { ...prev, period };
    });
  };

  const setWorld = (world: string | null) => {
    setSettings((prev) => {
      if (prev.world === world) return prev;
      return { ...prev, world };
    });
  };

  const setExcludeColossus = (excludeColossus: boolean) => {
    setSettings((prev) => {
      if (prev.excludeColossus === excludeColossus) return prev;
      return { ...prev, excludeColossus };
    });
  };

  return {
    settings,
    setPeriod,
    setWorld,
    setExcludeColossus,
  };
};
