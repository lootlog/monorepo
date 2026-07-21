import type { GameNpc } from "@lootlog/margonem/npcs";
import { create } from "zustand";

export type GameNpcWithLocation = GameNpc & {
  location: string;
  notificationSent: boolean;
};

type AddNpcOptions = {
  highlightOnExisting?: boolean;
};

export interface NpcDetectorState {
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
  setNpcStates: (
    updates: readonly {
      npcId: number;
      npc: Partial<GameNpcWithLocation>;
    }[],
  ) => void;
  clearDetectionAnimation: (npcId: number, cycle: number) => void;
}

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
      if (newNpcs.length === 0) return state;

      const shouldAnimateIncoming = options?.highlightOnExisting ?? false;
      const detectionAnimationCycle = shouldAnimateIncoming
        ? state.latestDetectionAnimationCycle + 1
        : state.latestDetectionAnimationCycle;
      const npcById = new Map(
        state.npcs.map((currentNpc) => [currentNpc.id, currentNpc]),
      );
      const originalNpcIds = state.npcs.map((currentNpc) => currentNpc.id);
      const newNpcIds: number[] = [];
      const incomingNpcIds: number[] = [];
      const activeDetectionAnimations = shouldAnimateIncoming
        ? {}
        : state.activeDetectionAnimations;

      for (const incomingNpc of newNpcs) {
        const existingNpc = npcById.get(incomingNpc.id);
        if (!existingNpc) {
          newNpcIds.push(incomingNpc.id);
        }

        npcById.set(
          incomingNpc.id,
          existingNpc ? { ...existingNpc, ...incomingNpc } : incomingNpc,
        );
        incomingNpcIds.push(incomingNpc.id);
        if (shouldAnimateIncoming) {
          activeDetectionAnimations[incomingNpc.id] = detectionAnimationCycle;
        }
      }

      let orderedNpcIds: number[];
      if (shouldAnimateIncoming) {
        const incomingNpcIdSet = new Set<number>();
        const frontNpcIds: number[] = [];
        for (let index = incomingNpcIds.length - 1; index >= 0; index -= 1) {
          const incomingNpcId = incomingNpcIds[index];
          if (incomingNpcIdSet.has(incomingNpcId)) continue;

          incomingNpcIdSet.add(incomingNpcId);
          frontNpcIds.push(incomingNpcId);
        }
        orderedNpcIds = [
          ...frontNpcIds,
          ...originalNpcIds.filter((npcId) => !incomingNpcIdSet.has(npcId)),
        ];
      } else {
        orderedNpcIds = [...newNpcIds.reverse(), ...originalNpcIds];
      }

      return {
        npcs: orderedNpcIds
          .map((npcId) => npcById.get(npcId))
          .filter((npc): npc is GameNpcWithLocation => npc !== undefined),
        activeDetectionAnimations,
        latestDetectionAnimationCycle: detectionAnimationCycle,
      };
    }),
  removeNpc: (npcId: number | number[]) =>
    set((state) => {
      const npcIds = new Set(Array.isArray(npcId) ? npcId : [npcId]);
      const hasNpcToRemove = state.npcs.some((npc) => npcIds.has(npc.id));
      const hasAnimationToRemove = [...npcIds].some(
        (currentNpcId) =>
          state.activeDetectionAnimations[currentNpcId] !== undefined,
      );

      if (!hasNpcToRemove && !hasAnimationToRemove) return state;

      const activeDetectionAnimations = {
        ...state.activeDetectionAnimations,
      };

      npcIds.forEach((currentNpcId) => {
        delete activeDetectionAnimations[currentNpcId];
      });

      return {
        npcs: state.npcs.filter((npc) => !npcIds.has(npc.id)),
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
  setNpcStates: (updates) =>
    set((state) => {
      if (updates.length === 0) return state;

      const updatesByNpcId = new Map(
        updates.map((update) => [update.npcId, update.npc]),
      );
      let changed = false;
      const npcs = state.npcs.map((npc) => {
        const update = updatesByNpcId.get(npc.id);
        if (!update) return npc;

        changed = true;
        return { ...npc, ...update };
      });

      return changed ? { npcs } : state;
    }),
  clearDetectionAnimation: (npcId, cycle) =>
    set((state) => {
      if (state.activeDetectionAnimations[npcId] !== cycle) {
        return state;
      }

      const activeDetectionAnimations = {
        ...state.activeDetectionAnimations,
      };
      delete activeDetectionAnimations[npcId];

      return { activeDetectionAnimations };
    }),
}));
