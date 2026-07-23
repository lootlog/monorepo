import type {
  RuntimeNpc,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import { create } from "zustand";

export type NpcSnapshot = RuntimeNpc;

type NpcsById = Readonly<Record<number, NpcSnapshot>>;

type NpcBatch = {
  removeIds?: readonly number[];
  upserts?: readonly RuntimeNpc[];
};

type NpcsState = {
  mapEpoch: number;
  npcsById: NpcsById;
  revision: number;
  status: RuntimeStatus;
  applyNpcBatch: (batch: NpcBatch) => void;
  clearNpcs: (mapChanged?: boolean) => void;
  getNpc: (id: number) => NpcSnapshot | undefined;
  replaceNpcs: (npcs: readonly RuntimeNpc[], mapChanged?: boolean) => void;
};

const createNpcSnapshot = (npc: RuntimeNpc): NpcSnapshot =>
  Object.freeze({ ...npc });

const areNpcSnapshotsEqual = (
  current: NpcSnapshot,
  next: RuntimeNpc,
): boolean =>
  current.actions === next.actions &&
  current.groupId === next.groupId &&
  current.icon === next.icon &&
  current.id === next.id &&
  current.level === next.level &&
  current.name === next.name &&
  current.profession === next.profession &&
  current.respawnRandomness === next.respawnRandomness &&
  current.templateId === next.templateId &&
  current.type === next.type &&
  current.weight === next.weight &&
  current.x === next.x &&
  current.y === next.y;

const indexNpcs = (npcs: readonly RuntimeNpc[]): NpcsById =>
  Object.freeze(
    Object.fromEntries(
      npcs.map((npc) => [npc.id, createNpcSnapshot(npc)]),
    ) as Record<number, NpcSnapshot>,
  );

export const useNpcsStore = create<NpcsState>()((set, get) => ({
  mapEpoch: 0,
  npcsById: {},
  revision: 0,
  status: "uninitialized",
  applyNpcBatch: ({ removeIds = [], upserts = [] }) =>
    set((state) => {
      let nextNpcsById: Record<number, NpcSnapshot> | undefined;
      const getMutableNpcs = () => {
        nextNpcsById ??= { ...state.npcsById };
        return nextNpcsById;
      };

      for (const id of removeIds) {
        if ((nextNpcsById ?? state.npcsById)[id]) {
          delete getMutableNpcs()[id];
        }
      }

      for (const npc of upserts) {
        const currentNpc = (nextNpcsById ?? state.npcsById)[npc.id];
        if (currentNpc && areNpcSnapshotsEqual(currentNpc, npc)) {
          continue;
        }

        getMutableNpcs()[npc.id] = createNpcSnapshot(npc);
      }

      if (!nextNpcsById && state.status === "ready") {
        return state;
      }

      return {
        npcsById: Object.freeze(nextNpcsById ?? { ...state.npcsById }),
        revision: state.revision + 1,
        status: "ready",
      };
    }),
  clearNpcs: (mapChanged = false) =>
    set((state) => ({
      mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
      npcsById: Object.freeze({}),
      revision: state.revision + 1,
      status: "uninitialized",
    })),
  getNpc: (id) => get().npcsById[id],
  replaceNpcs: (npcs, mapChanged = false) =>
    set((state) => ({
      mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
      npcsById: indexNpcs(npcs),
      revision: state.revision + 1,
      status: "ready",
    })),
}));
