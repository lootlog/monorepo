import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StatisticsState {
  selectedCharacterId?: string;
  setSelectedCharacterId: (characterId: string | undefined) => void;
  headToHeadCharacterId?: string;
  setHeadToHeadCharacterId: (characterId: string | undefined) => void;
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
    }),
    {
      name: "battle-statistics-state",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
