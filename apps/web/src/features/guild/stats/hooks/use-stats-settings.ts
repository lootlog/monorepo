import { useLocalStorage } from "usehooks-ts";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import type { NpcType } from "./use-guild-kill-stats";

type StatsSettingsPage =
  | "overview"
  | "ranking"
  | "member"
  | "npcs-list"
  | "npc-killers";

export type StatsSettings = {
  world: string | null;
  minLvl: string;
  maxLvl: string;
  npcType?: NpcType | "ALL";
};

const DEFAULT_SETTINGS: StatsSettings = {
  world: null,
  minLvl: "",
  maxLvl: "",
  npcType: "ALL",
};

export const useStatsSettings = (page: StatsSettingsPage) => {
  const guildId = useGuildId();
  const storageKey = `stats-settings-${guildId}-${page}`;

  const [settings, setSettings] = useLocalStorage<StatsSettings>(
    storageKey,
    DEFAULT_SETTINGS,
  );

  // Debounced values for API calls
  const debouncedMinLvl = useDebounce(settings.minLvl, 500);
  const debouncedMaxLvl = useDebounce(settings.maxLvl, 500);

  const setWorld = (world: string | null) => {
    setSettings((prev) => {
      if (prev.world === world) return prev;
      return { ...prev, world };
    });
  };

  const setMinLvl = (minLvl: string) => {
    setSettings((prev) => {
      if (prev.minLvl === minLvl) return prev;
      return { ...prev, minLvl };
    });
  };

  const setMaxLvl = (maxLvl: string) => {
    setSettings((prev) => {
      if (prev.maxLvl === maxLvl) return prev;
      return { ...prev, maxLvl };
    });
  };

  const setNpcType = (npcType: NpcType | "ALL") => {
    setSettings((prev) => {
      if (prev.npcType === npcType) return prev;
      return { ...prev, npcType };
    });
  };

  const parsedMinLvl = debouncedMinLvl
    ? Number.parseInt(debouncedMinLvl, 10)
    : undefined;
  const parsedMaxLvl = debouncedMaxLvl
    ? Number.parseInt(debouncedMaxLvl, 10)
    : undefined;

  return {
    settings,
    debouncedMinLvl: Number.isNaN(parsedMinLvl) ? undefined : parsedMinLvl,
    debouncedMaxLvl: Number.isNaN(parsedMaxLvl) ? undefined : parsedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
    setNpcType,
  };
};
