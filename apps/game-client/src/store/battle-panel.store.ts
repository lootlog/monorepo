import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface BattlePanelState {
  isBattleCollectionEnabled: boolean;
  toggleBattleCollection: () => void;
}

export const useBattlePanelStore = create<BattlePanelState>()(
  persist(
    (set) => ({
      isBattleCollectionEnabled: false,
      toggleBattleCollection: () => {
        set((state) => ({
          isBattleCollectionEnabled: !state.isBattleCollectionEnabled,
        }));
      },
    }),
    {
      name: "ll:battle-panel:state",
      partialize: (state) => ({
        isBattleCollectionEnabled: state.isBattleCollectionEnabled,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
