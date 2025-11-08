import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Period =
  | "24h"
  | "3d"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "180d"
  | "all";

export interface BattleFilters {
  minLevel?: number;
  maxLevel?: number;
  period?: Period;
  world?: string;
  type?: Array<"solo" | "group">;
  search?: string;
  result?: Array<"won" | "lost" | "flee">;
  ph?: boolean;
}

interface BattleFiltersState {
  characterFilters: Record<string, BattleFilters>;
  globalFilters: BattleFilters;
  currentCharacterId?: string;

  setCurrentCharacterId: (characterId: string | undefined) => void;
  getFilters: (characterId: string | undefined) => BattleFilters;
  updateFilters: (
    characterId: string | undefined,
    filters: Partial<BattleFilters>,
  ) => void;
  resetFilters: (characterId: string | undefined) => void;
}

const DEFAULT_FILTERS: BattleFilters = {
  minLevel: 1,
  maxLevel: 500,
  period: "30d",
};

export const useBattleFiltersStore = create<BattleFiltersState>()(
  persist(
    (set, get) => ({
      characterFilters: {},
      globalFilters: { ...DEFAULT_FILTERS },
      currentCharacterId: undefined,

      setCurrentCharacterId: (characterId) =>
        set({ currentCharacterId: characterId }),

      getFilters: (characterId) => {
        const state = get();
        if (!characterId) {
          return state.globalFilters;
        }
        return state.characterFilters[characterId] ?? DEFAULT_FILTERS;
      },

      updateFilters: (characterId, filters) =>
        set((state) => {
          if (!characterId) {
            return {
              globalFilters: {
                ...state.globalFilters,
                ...filters,
              },
            };
          }

          const currentFilters =
            state.characterFilters[characterId] ?? DEFAULT_FILTERS;
          return {
            characterFilters: {
              ...state.characterFilters,
              [characterId]: {
                ...currentFilters,
                ...filters,
              },
            },
          };
        }),

      resetFilters: (characterId) =>
        set((state) => {
          if (!characterId) {
            return {
              globalFilters: { ...DEFAULT_FILTERS },
            };
          }

          const newCharacterFilters = { ...state.characterFilters };
          delete newCharacterFilters[characterId];
          return {
            characterFilters: newCharacterFilters,
          };
        }),
    }),
    {
      name: "battle-panel-filters",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
