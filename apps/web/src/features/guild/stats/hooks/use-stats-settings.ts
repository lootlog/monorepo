import { useLocalStorage } from "usehooks-ts";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useDebounce } from "@/hooks/use-debounce";
import type { NpcType } from "@/lib/api/generated/main/model/npc-type";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

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
  period?: KillStatsPeriod;
};

const DEFAULT_SETTINGS: StatsSettings = {
  world: null,
  minLvl: "",
  maxLvl: "",
  npcType: "ALL",
  period: "all",
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

  const setPeriod = (period: KillStatsPeriod) => {
    setSettings((prev) => {
      if ((prev.period ?? "all") === period) return prev;
      return { ...prev, period };
    });
  };

  const parsedMinLvl = debouncedMinLvl
    ? Number.parseInt(debouncedMinLvl, 10)
    : undefined;
  const parsedMaxLvl = debouncedMaxLvl
    ? Number.parseInt(debouncedMaxLvl, 10)
    : undefined;

  return {
    settings: {
      ...settings,
      period: settings.period ?? "all",
    },
    debouncedMinLvl: Number.isNaN(parsedMinLvl) ? undefined : parsedMinLvl,
    debouncedMaxLvl: Number.isNaN(parsedMaxLvl) ? undefined : parsedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
    setNpcType,
    setPeriod,
  };
};
