import { create } from "zustand";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";

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

export const useGlobalStore = create<GlobalState>(
  performanceStoreMiddleware(
    "global",
    (set) => ({
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
    }),
    (state) => state.socketState.joinedGuilds.length,
  ),
);
