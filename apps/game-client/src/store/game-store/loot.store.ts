import { create } from "zustand";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";

interface LootState {
  lastLootId: number | null;
}

interface LootActions {
  setLastLootId: (id: number | null) => void;
}

export const useLootStore = create<LootState & LootActions>(
  performanceStoreMiddleware("game-loot", (set) => ({
    lastLootId: null,

    setLastLootId: (lastLootId) => set({ lastLootId }),
  })),
);
