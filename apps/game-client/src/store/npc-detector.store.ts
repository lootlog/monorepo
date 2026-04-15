import { NpcType } from "@/hooks/api/use-npcs";
import type { GameNpc } from "@lootlog/margonem";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll-npc-detector-state");

export type GameNpcWithLocation = GameNpc & {
  location: string;
  notificationSent: boolean;
};

type AddNpcOptions = {
  highlightOnExisting?: boolean;
};

export interface NpcDetectorSettingByNpc {
  detect: boolean;
  notifyWindow: boolean;
  autoNotifyClan: boolean;
  notifySound: boolean;
  highlight: boolean;
  guildIds: string[];
}

export type DetectorNpcType =
  | NpcType.HERO
  | NpcType.COLOSSUS
  | NpcType.TITAN
  | NpcType.ELITE2;

export type NpcDetectorSettings = Pick<
  Record<NpcType, NpcDetectorSettingByNpc>,
  DetectorNpcType
>;

interface NpcDetectorState {
  npcs: GameNpcWithLocation[];
  activeDetectionAnimations: Record<number, number>;
  latestDetectionAnimationCycle: number;
  settings: Record<string, NpcDetectorSettings>;
  setState: (game: NpcDetectorState) => void;
  removeNpc: (npcId: number | number[]) => void;
  addNpc: (
    npc: GameNpcWithLocation | GameNpcWithLocation[],
    options?: AddNpcOptions,
  ) => void;
  clearNpcs: () => void;
  setSettings: (charactedId: string, settings: NpcDetectorSettings) => void;
  setNpcState: (npcId: number, npc: GameNpcWithLocation) => void;
  clearDetectionAnimation: (npcId: number, cycle: number) => void;
}

const moveNpcToFront = (
  npcs: GameNpcWithLocation[],
  npc: GameNpcWithLocation,
  indexToRemove?: number,
) => {
  if (indexToRemove === undefined) {
    return [npc, ...npcs];
  }

  return [
    npc,
    ...npcs.slice(0, indexToRemove),
    ...npcs.slice(indexToRemove + 1),
  ];
};

export const recommendedSettings: NpcDetectorSettings = {
  [NpcType.ELITE2]: {
    detect: false,
    notifyWindow: false,
    autoNotifyClan: false,
    notifySound: false,
    highlight: false,
    guildIds: [],
  },
  [NpcType.HERO]: {
    detect: true,
    notifyWindow: true,
    autoNotifyClan: false,
    notifySound: false,
    highlight: true,
    guildIds: [],
  },
  [NpcType.COLOSSUS]: {
    detect: true,
    notifyWindow: true,
    autoNotifyClan: false,
    notifySound: false,
    highlight: true,
    guildIds: [],
  },
  [NpcType.TITAN]: {
    detect: true,
    notifyWindow: true,
    autoNotifyClan: false,
    notifySound: false,
    highlight: true,
    guildIds: [],
  },
};

export const useNpcDetectorStore = create<NpcDetectorState>()(
  persist(
    (set) => ({
      npcs: [],
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
      settings: {},
      setState: ({ npcs }) =>
        set({
          npcs,
          activeDetectionAnimations: {},
        }),
      addNpc: (npc, options) =>
        set((state) => {
          const newNpcs = Array.isArray(npc) ? npc : [npc];
          const shouldAnimateIncoming = options?.highlightOnExisting ?? false;
          const detectionAnimationCycle =
            shouldAnimateIncoming && newNpcs.length > 0
              ? state.latestDetectionAnimationCycle + 1
              : state.latestDetectionAnimationCycle;
          let nextNpcs = [...state.npcs];
          const activeDetectionAnimations = shouldAnimateIncoming
            ? {}
            : { ...state.activeDetectionAnimations };

          newNpcs.forEach((incomingNpc) => {
            const existingNpcIndex = nextNpcs.findIndex(
              (currentNpc) => currentNpc.id === incomingNpc.id,
            );

            if (existingNpcIndex === -1) {
              nextNpcs = moveNpcToFront(nextNpcs, incomingNpc);
              if (shouldAnimateIncoming) {
                activeDetectionAnimations[incomingNpc.id] =
                  detectionAnimationCycle;
              }
              return;
            }

            const existingNpc = nextNpcs[existingNpcIndex];
            const mergedNpc = {
              ...existingNpc,
              ...incomingNpc,
            };

            if (shouldAnimateIncoming) {
              activeDetectionAnimations[mergedNpc.id] = detectionAnimationCycle;
            }

            nextNpcs = shouldAnimateIncoming
              ? moveNpcToFront(nextNpcs, mergedNpc, existingNpcIndex)
              : nextNpcs.map((currentNpc) =>
                  currentNpc.id === mergedNpc.id ? mergedNpc : currentNpc,
                );
          });

          return {
            npcs: nextNpcs,
            activeDetectionAnimations,
            latestDetectionAnimationCycle: detectionAnimationCycle,
          };
        }),
      removeNpc: (npcId: number | number[]) =>
        set((state) => {
          const activeDetectionAnimations = {
            ...state.activeDetectionAnimations,
          };
          const npcIds = Array.isArray(npcId) ? npcId : [npcId];

          npcIds.forEach((currentNpcId) => {
            delete activeDetectionAnimations[currentNpcId];
          });

          return {
            npcs: state.npcs.filter((npc) =>
              Array.isArray(npcId) ? !npcId.includes(npc.id) : npc.id !== npcId,
            ),
            activeDetectionAnimations,
          };
        }),
      clearNpcs: () => set({ npcs: [], activeDetectionAnimations: {} }),
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
      setNpcState: (npcId: number, npc: GameNpcWithLocation) => {
        set((state) => {
          const npcs = state.npcs.map((n) =>
            n.id === npcId ? { ...n, ...npc } : n,
          );
          return { npcs };
        });
      },
      clearDetectionAnimation: (npcId, cycle) =>
        set((state) => {
          if (state.activeDetectionAnimations[npcId] !== cycle) {
            return {};
          }

          const activeDetectionAnimations = {
            ...state.activeDetectionAnimations,
          };
          delete activeDetectionAnimations[npcId];

          return { activeDetectionAnimations };
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        settings: state.settings,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
