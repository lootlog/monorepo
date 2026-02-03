import { useState, useRef, useCallback } from "react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useDebounce } from "@/hooks/use-debounce";
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

const getStoredSettings = (key: string): StatsSettings => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS;
};

const saveSettings = (key: string, settings: StatsSettings) => {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
};

export const useStatsSettings = (page: StatsSettingsPage) => {
  const guildId = useGuildId();
  const storageKey = `stats-settings-${guildId}-${page}`;

  // Initialize from localStorage - key includes guildId so it's guild-specific
  const initialSettingsRef = useRef<StatsSettings | null>(null);
  if (initialSettingsRef.current === null) {
    initialSettingsRef.current = getStoredSettings(storageKey);
  }

  const [settings, setSettingsState] = useState<StatsSettings>(
    initialSettingsRef.current,
  );

  // Ref to track pending save timeout
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store current storageKey in ref for use in callbacks
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  // Debounced values for API calls
  const debouncedMinLvl = useDebounce(settings.minLvl, 500);
  const debouncedMaxLvl = useDebounce(settings.maxLvl, 500);

  // Helper to update settings with debounced localStorage save
  // Using stable callback that reads storageKey from ref
  const updateSettings = useCallback(
    (updater: (prev: StatsSettings) => StatsSettings, immediate = false) => {
      setSettingsState((prev) => {
        const next = updater(prev);

        // Clear any pending save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Schedule localStorage save (debounced or immediate)
        const currentKey = storageKeyRef.current;
        if (immediate) {
          saveSettings(currentKey, next);
        } else {
          saveTimeoutRef.current = setTimeout(() => {
            saveSettings(currentKey, next);
          }, 500);
        }

        return next;
      });
    },
    [], // No dependencies - uses refs for mutable values
  );

  const setWorld = useCallback(
    (world: string | null) => {
      updateSettings((prev) => {
        if (prev.world === world) return prev;
        return { ...prev, world };
      }, true);
    },
    [updateSettings],
  );

  const setMinLvl = useCallback(
    (minLvl: string) => {
      updateSettings((prev) => {
        if (prev.minLvl === minLvl) return prev;
        return { ...prev, minLvl };
      });
    },
    [updateSettings],
  );

  const setMaxLvl = useCallback(
    (maxLvl: string) => {
      updateSettings((prev) => {
        if (prev.maxLvl === maxLvl) return prev;
        return { ...prev, maxLvl };
      });
    },
    [updateSettings],
  );

  const setNpcType = useCallback(
    (npcType: NpcType | "ALL") => {
      updateSettings((prev) => {
        if (prev.npcType === npcType) return prev;
        return { ...prev, npcType };
      }, true);
    },
    [updateSettings],
  );

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
