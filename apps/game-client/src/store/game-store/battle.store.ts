import { create } from "zustand";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import type { W } from "@/types/margonem/game-events/f";

export type BattleWarriorsWithAccountId = Record<
  string,
  W[string] & { accountId?: number }
>;

interface BattleState {
  events: GameEvent[];
  battleState: "idle" | "in-battle";
  lastBattleHash: string;
  lastKillHash: string;
  battleWarriors: BattleWarriorsWithAccountId;
}

interface BattleActions {
  addEvent: (event: GameEvent) => void;
  clearEvents: () => void;
  setBattleState: (state: "idle" | "in-battle") => void;
  setLastBattleHash: (hash: string) => void;
  setLastKillHash: (hash: string) => void;
  startBattle: (hash: string) => void;
  endBattle: () => void;
  updateBattleWarriors: (warriors: BattleWarriorsWithAccountId | null) => void;
}

export const useBattleStore = create<BattleState & BattleActions>((set) => ({
  events: [],
  battleState: "idle",
  lastBattleHash: "",
  lastKillHash: "",
  battleWarriors: {},

  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
    })),

  clearEvents: () => set({ events: [] }),

  setBattleState: (battleState) => set({ battleState }),

  setLastBattleHash: (hash) => set({ lastBattleHash: hash }),

  setLastKillHash: (hash) => set({ lastKillHash: hash }),

  startBattle: (hash) =>
    set({
      battleState: "in-battle",
      lastBattleHash: hash,
    }),

  endBattle: () => set({ battleState: "idle" }),

  updateBattleWarriors: (warriors) =>
    set((state) => {
      if (!warriors) {
        return { battleWarriors: {} };
      }

      const updatedWarriors = { ...state.battleWarriors };
      Object.keys(warriors).forEach((key) => {
        updatedWarriors[key] = {
          ...updatedWarriors[key],
          ...warriors[key],
        };
      });
      return { battleWarriors: updatedWarriors };
    }),
}));
