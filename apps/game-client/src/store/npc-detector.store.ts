import { NpcType } from "@/hooks/api/use-npcs";
import { GameNpc } from "@/types/margonem/npcs";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type GameNpcWithLocation = GameNpc & {
  location: string;
};

export type PickedNpcType =
  | NpcType.HERO
  | NpcType.COLOSSUS
  | NpcType.TITAN
  | NpcType.ELITE2;

export interface NpcDetectorSettingByNpc {
  detect: boolean;
  notifyWindow: boolean;
  autoNotifyClan: boolean;
  autoNotifyChat: boolean;
  notifySound: boolean;
  highlight: boolean;
  guildIds: string[];
}

export type NpcDetectorSettings = Pick<
  Record<NpcType, NpcDetectorSettingByNpc>,
  PickedNpcType
>;

interface NpcDetectorState {
  npcs: GameNpcWithLocation[];
  settings: Record<string, NpcDetectorSettings>;
  setState: (game: NpcDetectorState) => void;
  removeNpc: (npcId: number | number[]) => void;
  addNpc: (npc: GameNpcWithLocation | GameNpcWithLocation[]) => void;
  clearNpcs: () => void;
  setSettings: (charactedId: string, settings: NpcDetectorSettings) => void;
}

export const recommendedSettings: NpcDetectorSettings = {
  [NpcType.ELITE2]: {
    detect: true,
    notifyWindow: true,
    autoNotifyClan: false,
    autoNotifyChat: false,
    notifySound: true,
    highlight: true,
    guildIds: [],
  },
  [NpcType.HERO]: {
    detect: true,
    notifyWindow: true,
    autoNotifyClan: false,
    autoNotifyChat: false,
    notifySound: true,
    highlight: true,
    guildIds: [],
  },
  [NpcType.COLOSSUS]: {
    detect: true,
    notifyWindow: true,
    autoNotifyClan: false,
    autoNotifyChat: false,
    notifySound: true,
    highlight: true,
    guildIds: [],
  },
  [NpcType.TITAN]: {
    detect: true,
    notifyWindow: true,
    autoNotifyClan: false,
    autoNotifyChat: false,
    notifySound: true,
    highlight: true,
    guildIds: [],
  },
};

export const useNpcDetectorStore = create<NpcDetectorState>()(
  persist(
    (set) => ({
      npcs: [],
      settings: {
        npcs: {} as Record<NpcType, NpcDetectorSettingByNpc>,
      },
      setState: ({ npcs }) => set({ npcs }),
      addNpc: (npc) =>
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
      setSettings: (characterId, settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [characterId]: {
              ...state.settings[characterId],
              ...settings,
            },
          },
        })),
    }),
    {
      name: "ll-npc-detector-state",
      partialize: (state) => ({
        settings: state.settings,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
