import { create } from "zustand";

export type GameInterface = "si" | "ni" | undefined;

interface GameState {
  gameInitialized: boolean;
  gameInterface: "si" | "ni" | undefined;
  world: string | undefined;
  accountId: number | undefined;
  characterId?: number | undefined; // Optional, as it may not be set initially
}
interface GlobalState {
  gameState: GameState;
  setGameState: (game: GameState) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  gameState: {
    gameInitialized: false,
    gameInterface: undefined,
    world: undefined,
    accountId: undefined,
    characterId: undefined,
  },
  setGameState: (gameState) => set({ gameState }),
}));
