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
  status: RuntimeStatus;
  applyNpcBatch: (batch: NpcBatch) => void;
  clearNpcs: (mapChanged?: boolean) => void;
  getNpc: (id: number) => NpcSnapshot | undefined;
  getMapNpc: (id: number) => NpcSnapshot | undefined;
  replaceNpcs: (npcs: readonly RuntimeNpc[], mapChanged?: boolean) => void;
};

const createNpcSnapshot = (npc: RuntimeNpc): NpcSnapshot =>
  Object.freeze({ ...npc });

const areNpcSnapshotsEqual = (
  current: NpcSnapshot,
  next: RuntimeNpc,
): boolean =>
  current.id === next.id &&
  current.x === next.x &&
  current.y === next.y &&
  current.templateId === next.templateId &&
  current.name === next.name &&
  current.level === next.level &&
  current.icon === next.icon &&
  current.type === next.type &&
  current.weight === next.weight &&
  current.profession === next.profession &&
  current.actions === next.actions &&
  current.groupId === next.groupId &&
  current.respawnRandomness === next.respawnRandomness;

const MAX_REMOVED_NPCS = 256;

const indexNpcs = (npcs: readonly RuntimeNpc[]): NpcsById =>
  Object.freeze(
    Object.fromEntries(npcs.map((npc) => [npc.id, createNpcSnapshot(npc)])),
  );

export const useNpcsStore = create<NpcsState>()((set, get) => {
  const removedNpcsById = new Map<number, NpcSnapshot>();

  const rememberRemovedNpc = (npc: NpcSnapshot) => {
    removedNpcsById.delete(npc.id);
    removedNpcsById.set(npc.id, npc);

    if (removedNpcsById.size <= MAX_REMOVED_NPCS) return;

    const [oldestId] = removedNpcsById.keys();

    if (oldestId !== undefined) removedNpcsById.delete(oldestId);
  };

  return {
    mapEpoch: 0,
    npcsById: {},
    status: "uninitialized",
    applyNpcBatch: ({ removeIds = [], upserts = [] }) => {
      const { npcsById } = get();

      for (const id of removeIds) {
        const npc = npcsById[id];

        if (npc) rememberRemovedNpc(npc);
      }

      for (const npc of upserts) removedNpcsById.delete(npc.id);

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
          status: "ready",
        };
      });
    },
    clearNpcs: (mapChanged = false) => {
      removedNpcsById.clear();
      set((state) => ({
        mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
        npcsById: Object.freeze({}),
        status: "uninitialized",
      }));
    },
    getNpc: (id) => get().npcsById[id],
    getMapNpc: (id) => get().npcsById[id] ?? removedNpcsById.get(id),
    replaceNpcs: (npcs, mapChanged = false) => {
      removedNpcsById.clear();
      set((state) => ({
        mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
        npcsById: indexNpcs(npcs),
        status: "ready",
      }));
    },
  };
});
