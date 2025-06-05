import { create } from "zustand";

export type GameInterface = "si" | "ni" | undefined;

interface GlobalState {
  gameInitialized: boolean;
  setGameInitialized: (initialized: boolean) => void;
  gameInterface: "si" | "ni" | undefined;
  setGameInterface: (interfaceType: GameInterface) => void;
  world: string | undefined;
  setWorld: (world: string) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  gameInitialized: false,
  setGameInitialized: (initialized) => set({ gameInitialized: initialized }),
  gameInterface: undefined,
  setGameInterface: (interfaceType) => set({ gameInterface: interfaceType }),
  world: undefined,
  setWorld: (world) => set({ world }),
}));
