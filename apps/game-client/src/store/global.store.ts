import { create } from "zustand";

export type GameInterface = "si" | "ni";
export enum LanguageVersion {
  EN = "en",
  PL = "pl",
}

interface GameState {
  gameInitialized: boolean;
  gameInterface?: GameInterface;
  world?: string;
  accountId?: string;
  characterId?: string;
  languageVersion?: LanguageVersion;
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
    languageVersion: undefined,
  },
  setGameState: (gameState) => set({ gameState }),
}));
