import { create } from "zustand";

interface LootState {
  lastLootId: number | null;
}

interface LootActions {
  setLastLootId: (id: number | null) => void;
}

export const useLootStore = create<LootState & LootActions>((set) => ({
  lastLootId: null,

  setLastLootId: (lastLootId) => set({ lastLootId }),
}));
