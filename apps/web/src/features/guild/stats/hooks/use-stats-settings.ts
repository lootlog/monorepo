import { parseKillStatsLevel } from "@/features/kills/parse-kill-stats-level";
import { updateSettingsField } from "./update-settings-field";
import { useLocalStorage } from "usehooks-ts";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import type { KilledNpcType } from "@/constants/npc";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

type StatsSettingsPage =
  | "overview"
  | "ranking"
  | "member"
  | "npcs-list"
  | "npc-killers";

type StoredStatsSettings = {
  minLvl: string;
  maxLvl: string;
  npcType?: KilledNpcType | "ALL";
  period?: KillStatsPeriod;
};

/** The page's own filters, with the Organization's world they apply to. */
export type StatsSettings = StoredStatsSettings & { world: string | null };

const DEFAULT_SETTINGS: StoredStatsSettings = {
  minLvl: "",
  maxLvl: "",
  npcType: "ALL",
  period: "all",
};

export const useStatsSettings = (page: StatsSettingsPage) => {
  const guildId = useGuildId();
  const storageKey = `stats-settings-${guildId}-${page}`;

  const { world } = useGuildWorld();

  const [settings, setSettings] = useLocalStorage<StoredStatsSettings>(
    storageKey,
    DEFAULT_SETTINGS,
  );

  // Debounced values for API calls
  const debouncedMinLvl = useDebounce(settings.minLvl, 500);
  const debouncedMaxLvl = useDebounce(settings.maxLvl, 500);

  const setMinLvl = (minLvl: string) => {
    setSettings((previous) => updateSettingsField(previous, "minLvl", minLvl));
  };

  const setMaxLvl = (maxLvl: string) => {
    setSettings((previous) => updateSettingsField(previous, "maxLvl", maxLvl));
  };

  const setNpcType = (npcType: KilledNpcType | "ALL") => {
    setSettings((previous) =>
      updateSettingsField(previous, "npcType", npcType),
    );
  };

  const setPeriod = (period: KillStatsPeriod) => {
    setSettings((prev) => {
      if ((prev.period ?? "all") === period) return prev;

      return { ...prev, period };
    });
  };

  // The overview's NPC type is the picked KPI tile, not a filter to clear.
  const resetFilters = () => {
    setSettings((previous) => ({
      ...DEFAULT_SETTINGS,
      npcType:
        page === "overview" ? previous.npcType : DEFAULT_SETTINGS.npcType,
    }));
  };

  return {
    settings: {
      ...settings,
      world,
      period: settings.period ?? "all",
    },
    debouncedMinLvl: parseKillStatsLevel(debouncedMinLvl),
    debouncedMaxLvl: parseKillStatsLevel(debouncedMaxLvl),
    setMinLvl,
    setMaxLvl,
    setNpcType,
    setPeriod,
    resetFilters,
  };
};
