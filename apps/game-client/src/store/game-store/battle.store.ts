import { create } from "zustand";
import type { GameEvent, W } from "@lootlog/margonem/game-events";

export const MAX_BATTLE_CAPTURE_EVENTS = 10_000;
export const MAX_BATTLE_CAPTURE_BYTES = 5 * 1024 * 1024;

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
  applyBatch: (batch: {
    battleState?: BattleState["battleState"];
    battleWarriors?: BattleWarriorsWithAccountId | null;
    lastBattleHash?: string;
    lastKillHash?: string;
  }) => void;
  addEvent: (event: GameEvent) => boolean;
  clearEvents: () => void;
  getCaptureSnapshot: () => {
    bytes: number;
    events: GameEvent[];
    overflowed: boolean;
    turns: string[];
  };
  setBattleState: (state: "idle" | "in-battle") => void;
  setLastBattleHash: (hash: string) => void;
  setLastKillHash: (hash: string) => void;
  startBattle: (hash: string) => void;
  endBattle: () => void;
  updateBattleWarriors: (warriors: BattleWarriorsWithAccountId | null) => void;
}

export const useBattleStore = create<BattleState & BattleActions>(
  (set, get) => {
    let capturedBytes = 0;
    let capturedTurns: string[] = [];
    let captureOverflowed = false;

    const overflowCapture = () => {
      captureOverflowed = true;
      capturedTurns = [];
      get().events.length = 0;
    };

    return {
      events: [],
      battleState: "idle",
      lastBattleHash: "",
      lastKillHash: "",
      battleWarriors: {},

      applyBatch: (batch) =>
        set((state) => {
          const nextState: Partial<BattleState> = {};

          if (
            batch.battleState !== undefined &&
            batch.battleState !== state.battleState
          ) {
            nextState.battleState = batch.battleState;
          }
          if (
            batch.lastBattleHash !== undefined &&
            batch.lastBattleHash !== state.lastBattleHash
          ) {
            nextState.lastBattleHash = batch.lastBattleHash;
          }
          if (
            batch.lastKillHash !== undefined &&
            batch.lastKillHash !== state.lastKillHash
          ) {
            nextState.lastKillHash = batch.lastKillHash;
          }
          if (batch.battleWarriors !== undefined) {
            const battleWarriors = batch.battleWarriors
              ? batch.battleWarriors
              : {};
            if (battleWarriors !== state.battleWarriors) {
              nextState.battleWarriors = battleWarriors;
            }
          }

          return Object.keys(nextState).length > 0 ? nextState : state;
        }),

      addEvent: (event) => {
        if (captureOverflowed) return false;

        let eventBytes: number;
        try {
          eventBytes = JSON.stringify(event).length * 2;
        } catch {
          overflowCapture();
          return false;
        }

        const events = get().events;
        if (
          events.length >= MAX_BATTLE_CAPTURE_EVENTS ||
          capturedBytes + eventBytes > MAX_BATTLE_CAPTURE_BYTES
        ) {
          overflowCapture();
          return false;
        }

        events.push(event);
        capturedBytes += eventBytes;
        if (event.f?.m) {
          capturedTurns.push(...event.f.m);
        }
        return true;
      },

      clearEvents: () => {
        capturedBytes = 0;
        capturedTurns = [];
        captureOverflowed = false;
        get().events.length = 0;
      },

      getCaptureSnapshot: () => ({
        bytes: capturedBytes,
        events: [...get().events],
        overflowed: captureOverflowed,
        turns: [...capturedTurns],
      }),

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
    };
  },
);
