import { create } from "zustand";

export enum LanguageVersion {
  EN = "en",
  PL = "pl",
}

interface GameState {
  gameInitialized: boolean;
}

interface SocketState {
  connected: boolean;
  joined: boolean;
  joinedGuilds: string[];
}

interface GlobalState {
  gameState: GameState;
  setGameState: (game: GameState) => void;
  socketState: SocketState;
  setSocketState: (state: Partial<SocketState>) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  gameState: {
    gameInitialized: false,
  },
  setGameState: (gameState) => set({ gameState }),
  socketState: {
    connected: false,
    joined: false,
    joinedGuilds: [],
  },
  setSocketState: (socketState) =>
    set((state) => ({
      socketState: { ...state.socketState, ...socketState },
    })),
}));
