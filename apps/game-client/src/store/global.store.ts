import { create } from "zustand";

export type GameInterface = "si" | "ni";
export enum LanguageVersion {
  EN = "en",
  PL = "pl",
}

interface GameState {
  gameInitialized: boolean;
}
interface GlobalState {
  gameState: GameState;
  setGameState: (game: GameState) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  gameState: {
    gameInitialized: false,
  },
  setGameState: (gameState) => set({ gameState }),
}));
