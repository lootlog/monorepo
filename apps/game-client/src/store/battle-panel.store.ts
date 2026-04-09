import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:battle-panel:state");

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
      name: STORAGE_KEY,
      partialize: (state) => ({
        isBattleCollectionEnabled: state.isBattleCollectionEnabled,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
