import { isObjectRecord } from "@lootlog/schema/records";
import {
  ALL_PROFESSIONS_VALUE,
  PROFESSION_OPTIONS,
  type ProfessionFilterValue,
  type OnlinePlayersFiltersValue,
} from "@/features/online-players/online-players-list.helpers";
import type { OnlinePlayersViewMode } from "@/features/online-players/online-players.types";
import { storageKey } from "@/lib/storage-key";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORAGE_KEY = storageKey("ll-online-players-state");
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
  filtersByGuildId: Record<string, OnlinePlayersFiltersValue | undefined>;
  setViewMode: (viewMode: OnlinePlayersViewMode) => void;
  toggleFiltersVisible: () => void;
  setFilters: (guildId: string, filters: OnlinePlayersFiltersValue) => void;
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

const sanitizeFiltersByGuildId = (
  filtersByGuildId: unknown,
): Record<string, OnlinePlayersFiltersValue | undefined> => {
  if (!isObjectRecord(filtersByGuildId)) {
    return {};
  }

  const entries: Array<[string, OnlinePlayersFiltersValue]> = [];
  for (const [guildId, filters] of Object.entries(filtersByGuildId)) {
    if (isOnlinePlayersFiltersValue(filters)) entries.push([guildId, filters]);
  }
  return Object.fromEntries(entries);
};

export const migrateOnlinePlayersState = (
  persisted: unknown,
): Pick<
  OnlinePlayersState,
  "viewMode" | "filtersVisible" | "filtersByGuildId"
> => {
  const state = isObjectRecord(persisted) ? persisted : undefined;

  return {
    viewMode: isViewMode(state?.viewMode) ? state.viewMode : DEFAULT_VIEW_MODE,
    filtersVisible:
      typeof state?.filtersVisible === "boolean"
        ? state.filtersVisible
        : DEFAULT_FILTERS_VISIBLE,
    filtersByGuildId: sanitizeFiltersByGuildId(state?.filtersByGuildId),
  };
};

export const useOnlinePlayersStore = create<OnlinePlayersState>()(
  persist(
    (set) => ({
      viewMode: DEFAULT_VIEW_MODE,
      filtersVisible: DEFAULT_FILTERS_VISIBLE,
      filtersByGuildId: {},
      setViewMode: (viewMode) => set({ viewMode }),
      toggleFiltersVisible: () =>
        set((state) => ({ filtersVisible: !state.filtersVisible })),
      setFilters: (guildId, filters) =>
        set((state) => ({
          filtersByGuildId: {
            ...state.filtersByGuildId,
            [guildId]: {
              minLvl: filters.minLvl,
              maxLvl: filters.maxLvl,
              selectedProfession:
                filters.selectedProfession ?? ALL_PROFESSIONS_VALUE,
            },
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        viewMode: state.viewMode,
        filtersVisible: state.filtersVisible,
        filtersByGuildId: state.filtersByGuildId,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: migrateOnlinePlayersState,
    },
  ),
);
