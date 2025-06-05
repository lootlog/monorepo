import { create } from "zustand";

export type GameInterface = "si" | "ni" | undefined;

interface GameState {
  gameInitialized: boolean;
  gameInterface: "si" | "ni" | undefined;
  world: string | undefined;
}

interface WindowPositionState {
  x: number;
  y: number;
}

interface WindowSizeState {
  width: number;
  height: number;
}

interface WindowsState {
  settings: {
    open: boolean;
    position: WindowPositionState;
    size: WindowSizeState;
  };
  timers: {
    open: boolean;
    position: WindowPositionState;
    size: WindowSizeState;
  };
  chat: {
    open: boolean;
    position: WindowPositionState;
    size: WindowSizeState;
  };
}

interface GlobalState {
  gameState: GameState;
  setGameState: (game: GameState) => void;
  windows: WindowsState;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  gameState: {
    gameInitialized: false,
    gameInterface: undefined,
    world: undefined,
  },
  windows: {
    settings: {
      open: false,
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 },
    },
    timers: {
      open: false,
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 },
    },
    chat: {
      open: false,
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 },
    },
  },
  setGameState: (gameState) => set({ gameState }),
}));
