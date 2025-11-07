import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StatisticsState {
  selectedCharacterId?: string;
  setSelectedCharacterId: (characterId: string | undefined) => void;
  headToHeadCharacterId?: string;
  setHeadToHeadCharacterId: (characterId: string | undefined) => void;
  streakCharacterId?: string;
  setStreakCharacterId: (characterId: string | undefined) => void;
  durationCharacterId?: string;
  setDurationCharacterId: (characterId: string | undefined) => void;
  phGrowthCharacterId?: string;
  setPhGrowthCharacterId: (characterId: string | undefined) => void;
}

export const useStatisticsStore = create<StatisticsState>()(
  persist(
    (set) => ({
      selectedCharacterId: undefined,
      setSelectedCharacterId: (characterId) =>
        set({ selectedCharacterId: characterId }),
      headToHeadCharacterId: undefined,
      setHeadToHeadCharacterId: (characterId) =>
        set({ headToHeadCharacterId: characterId }),
      streakCharacterId: undefined,
      setStreakCharacterId: (characterId) =>
        set({ streakCharacterId: characterId }),
      durationCharacterId: undefined,
      setDurationCharacterId: (characterId) =>
        set({ durationCharacterId: characterId }),
      phGrowthCharacterId: undefined,
      setPhGrowthCharacterId: (characterId) =>
        set({ phGrowthCharacterId: characterId }),
    }),
    {
      name: "battle-statistics-state",
      storage: createJSONStorage(() => localStorage),
      version: 3,
    },
  ),
);
