import type {
  RuntimeGameSnapshot,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import { create } from "zustand";

type GameState = {
  game: RuntimeGameSnapshot | null;
  mapEpoch: number;
  revision: number;
  status: RuntimeStatus;
  clearGame: (mapChanged?: boolean) => void;
  replaceGame: (game: RuntimeGameSnapshot, mapChanged?: boolean) => void;
};

export const useGameStore = create<GameState>()((set) => ({
  game: null,
  mapEpoch: 0,
  revision: 0,
  status: "uninitialized",
  clearGame: (mapChanged = false) =>
    set((state) => ({
      game: null,
      mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
      revision: state.revision + 1,
      status: "uninitialized",
    })),
  replaceGame: (game, mapChanged = false) =>
    set((state) => ({
      game: Object.freeze({
        hero: Object.freeze({ ...game.hero }),
        map: Object.freeze({ ...game.map }),
        world: game.world,
      }),
      mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
      revision: state.revision + 1,
      status: "ready",
    })),
}));
