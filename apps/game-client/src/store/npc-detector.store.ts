import type { GameNpc } from "@lootlog/margonem/npcs";
import { create } from "zustand";

export type GameNpcWithLocation = GameNpc & {
  location: string;
  notificationSent: boolean;
};

type AddNpcOptions = {
  highlightOnExisting?: boolean;
};

interface NpcDetectorState {
  npcs: GameNpcWithLocation[];
  activeDetectionAnimations: Record<number, number>;
  latestDetectionAnimationCycle: number;
  setState: (game: NpcDetectorState) => void;
  removeNpc: (npcId: number | number[]) => void;
  addNpc: (
    npc: GameNpcWithLocation | GameNpcWithLocation[],
    options?: AddNpcOptions,
  ) => void;
  clearNpcs: () => void;
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

export const useNpcDetectorStore = create<NpcDetectorState>()((set) => ({
  npcs: [],
  activeDetectionAnimations: {},
  latestDetectionAnimationCycle: 0,
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
            activeDetectionAnimations[incomingNpc.id] = detectionAnimationCycle;
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
}));
