import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import { enqueueSettingsPatch } from "@/features/settings/persistence/settings-patch-client";

const STORAGE_KEY = storageKey("ll:battle-panel:state");

interface BattlePanelState {
  isBattleCollectionEnabled: boolean;
  setBattleCollectionEnabled: (enabled: boolean) => void;
  toggleBattleCollection: () => void;
}

export const useBattlePanelStore = create<BattlePanelState>()(
  persist(
    (set, get) => ({
      isBattleCollectionEnabled: false,
      setBattleCollectionEnabled: (isBattleCollectionEnabled) => {
        set({ isBattleCollectionEnabled });
      },
      toggleBattleCollection: () => {
        const isBattleCollectionEnabled = !get().isBattleCollectionEnabled;
        set({ isBattleCollectionEnabled });
        enqueueSettingsPatch({
          domain: "gameData",
          scopeType: "CHARACTER",
          set: { battlePanel: { isBattleCollectionEnabled } },
        });
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
