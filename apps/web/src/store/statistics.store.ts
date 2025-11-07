import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StatisticsState {
  selectedCharacterId?: string;
  setSelectedCharacterId: (characterId: string | undefined) => void;
  sameLevelOnly: boolean;
  setSameLevelOnly: (sameLevelOnly: boolean) => void;
}

export const useStatisticsStore = create<StatisticsState>()(
  persist(
    (set) => ({
      selectedCharacterId: undefined,
      setSelectedCharacterId: (characterId) =>
        set({ selectedCharacterId: characterId }),
      sameLevelOnly: false,
      setSameLevelOnly: (sameLevelOnly) => set({ sameLevelOnly }),
    }),
    {
      name: "battle-statistics-state",
      storage: createJSONStorage(() => localStorage),
      version: 5,
    },
  ),
);
