import { isObjectRecord } from "@lootlog/schema/records";
import {
  ALL_PROFESSIONS_VALUE,
  PROFESSION_OPTIONS,
  type ProfessionFilterValue,
  type OnlinePlayersFiltersValue,
} from "@/features/online-players/online-players-list.helpers";
import type { OnlinePlayersViewMode } from "@/features/online-players/online-players.types";
import { storageKey } from "@/lib/storage-key";
import {
  getCharacterFilterKey,
  migrateCharacterFilters,
} from "@/lib/character-filter-scope";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const ONLINE_PLAYERS_STORAGE_KEY = storageKey("ll-online-players-state");

const DEFAULT_VIEW_MODE: OnlinePlayersViewMode = "accounts";

const DEFAULT_FILTERS_VISIBLE = true;

const VALID_PROFESSIONS: readonly ProfessionFilterValue[] = [
  ALL_PROFESSIONS_VALUE,
  ...PROFESSION_OPTIONS,
];

const isProfessionFilterValue = (
  value: string,
): value is ProfessionFilterValue => {
  return VALID_PROFESSIONS.some((profession) => profession === value);
};

type OnlinePlayersState = {
  viewMode: OnlinePlayersViewMode;
  filtersVisible: boolean;
  filtersByScope: Record<string, OnlinePlayersFiltersValue>;
  legacyFiltersByGuildId: Record<string, OnlinePlayersFiltersValue>;
  setViewMode: (viewMode: OnlinePlayersViewMode) => void;
  toggleFiltersVisible: () => void;
  initializeCharacterFilters: (scopeKey: string) => void;
  setFilters: (
    scopeKey: string,
    guildId: string,
    filters: OnlinePlayersFiltersValue,
  ) => void;
};

const isViewMode = (viewMode: unknown): viewMode is OnlinePlayersViewMode => {
  return viewMode === "members" || viewMode === "accounts";
};

const isOnlinePlayersFiltersValue = (
  filters: unknown,
): filters is OnlinePlayersFiltersValue => {
  if (!isObjectRecord(filters)) {
    return false;
  }

  return (
    typeof filters.minLvl === "number" &&
    typeof filters.maxLvl === "number" &&
    typeof filters.selectedProfession === "string" &&
    isProfessionFilterValue(filters.selectedProfession)
  );
};

const sanitizeFilters = (
  filtersByKey: unknown,
): Record<string, OnlinePlayersFiltersValue> => {
  if (!isObjectRecord(filtersByKey)) {
    return {};
  }

  const entries: Array<[string, OnlinePlayersFiltersValue]> = [];

  for (const [key, filters] of Object.entries(filtersByKey)) {
    if (isOnlinePlayersFiltersValue(filters)) entries.push([key, filters]);
  }

  return Object.fromEntries(entries);
};

export const migrateOnlinePlayersState = (
  persisted: unknown,
): Pick<
  OnlinePlayersState,
  "viewMode" | "filtersVisible" | "filtersByScope" | "legacyFiltersByGuildId"
> => {
  const state = isObjectRecord(persisted) ? persisted : undefined;

  return {
    viewMode: isViewMode(state?.viewMode) ? state.viewMode : DEFAULT_VIEW_MODE,
    filtersVisible:
      typeof state?.filtersVisible === "boolean"
        ? state.filtersVisible
        : DEFAULT_FILTERS_VISIBLE,
    filtersByScope: sanitizeFilters(state?.filtersByScope),
    legacyFiltersByGuildId: sanitizeFilters(
      state?.legacyFiltersByGuildId ?? state?.filtersByGuildId,
    ),
  };
};

export const useOnlinePlayersStore = create<OnlinePlayersState>()(
  persist(
    (set, get) => ({
      viewMode: DEFAULT_VIEW_MODE,
      filtersVisible: DEFAULT_FILTERS_VISIBLE,
      filtersByScope: {},
      legacyFiltersByGuildId: {},
      setViewMode: (viewMode) => set({ viewMode }),
      toggleFiltersVisible: () =>
        set((state) => ({ filtersVisible: !state.filtersVisible })),
      initializeCharacterFilters: (scopeKey) => {
        if (Object.keys(get().legacyFiltersByGuildId).length === 0) return;

        set((state) => ({
          filtersByScope: {
            ...migrateCharacterFilters(state.legacyFiltersByGuildId, scopeKey),
            ...state.filtersByScope,
          },
          legacyFiltersByGuildId: {},
        }));
      },
      setFilters: (scopeKey, guildId, filters) =>
        set((state) => ({
          filtersByScope: {
            ...migrateCharacterFilters(state.legacyFiltersByGuildId, scopeKey),
            ...state.filtersByScope,
            [getCharacterFilterKey(scopeKey, guildId)]: {
              minLvl: filters.minLvl,
              maxLvl: filters.maxLvl,
              selectedProfession:
                filters.selectedProfession ?? ALL_PROFESSIONS_VALUE,
            },
          },
          legacyFiltersByGuildId: {},
        })),
    }),
    {
      name: ONLINE_PLAYERS_STORAGE_KEY,
      partialize: (state) => ({
        viewMode: state.viewMode,
        filtersVisible: state.filtersVisible,
        filtersByScope: state.filtersByScope,
        legacyFiltersByGuildId: state.legacyFiltersByGuildId,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: migrateOnlinePlayersState,
      merge: (persisted, current) => ({
        ...current,
        ...migrateOnlinePlayersState(persisted),
      }),
    },
  ),
);
