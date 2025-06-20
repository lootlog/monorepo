import { NpcType } from "@/hooks/api/use-npcs";
import { GameNpc } from "@/types/margonem/npcs";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface NpcDetectorState {
  npcs: GameNpc[];
  detectTypes: Pick<
    Record<NpcType, boolean>,
    NpcType.HERO | NpcType.COLOSSUS | NpcType.TITAN
  >;
  setState: (game: NpcDetectorState) => void;
  removeNpc: (npcId: number | number[]) => void;
  addNpc: (npc: GameNpc | GameNpc[]) => void;
  clearNpcs: () => void;
  setDetectTypes: (
    type: NpcType.HERO | NpcType.COLOSSUS | NpcType.TITAN
  ) => void;
}

export const useNpcDetectorStore = create<NpcDetectorState>()(
  persist(
    (set) => ({
      npcs: [],
      detectTypes: {
        [NpcType.HERO]: true,
        [NpcType.COLOSSUS]: true,
        [NpcType.TITAN]: true,
      },
      setState: ({ npcs }) => set({ npcs }),
      addNpc: (npc: GameNpc | GameNpc[]) =>
        set((state) => {
          const newNpcs = Array.isArray(npc) ? npc : [npc];
          const existingIds = new Set(state.npcs.map((n) => n.id));
          const uniqueNpcs = newNpcs.filter((n) => !existingIds.has(n.id));
          return {
            npcs: [...state.npcs, ...uniqueNpcs],
          };
        }),
      removeNpc: (npcId: number | number[]) =>
        set((state) => ({
          npcs: state.npcs.filter((npc) =>
            Array.isArray(npcId) ? !npcId.includes(npc.id) : npc.id !== npcId
          ),
        })),
      clearNpcs: () => set({ npcs: [] }),
      setDetectTypes: (type: NpcType.HERO | NpcType.COLOSSUS | NpcType.TITAN) =>
        set((state) => ({
          detectTypes: {
            ...state.detectTypes,
            [type]: !state.detectTypes[type],
          },
        })),
    }),
    {
      name: "ll-npc-detector-state",
      partialize: (state) => ({
        detectTypes: state.detectTypes,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
