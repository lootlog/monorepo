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
  /**
   * An NPC of the current map, including one removed from it since it was
   * observed. Like Margonem's NpcManager `deleteNpc`, a removed NPC stays known
   * until the map changes: a battle or loot that follows its `npcs_del` still
   * identifies it.
   */
  getMapNpc: (id: number) => NpcSnapshot | undefined;
  replaceNpcs: (npcs: readonly RuntimeNpc[], mapChanged?: boolean) => void;
};

const createNpcSnapshot = (npc: RuntimeNpc): NpcSnapshot =>
  Object.freeze({ ...npc });

const NPC_SNAPSHOT_FIELDS = [
  "actions",
  "groupId",
  "icon",
  "id",
  "level",
  "name",
  "profession",
  "respawnRandomness",
  "templateId",
  "type",
  "weight",
  "x",
  "y",
] as const satisfies readonly (keyof RuntimeNpc)[];

const areNpcSnapshotsEqual = (
  current: NpcSnapshot,
  next: RuntimeNpc,
): boolean => {
  for (const field of NPC_SNAPSHOT_FIELDS) {
    if (current[field] !== next[field]) return false;
  }

  return true;
};

// Margonem keeps every removed NPC until the map changes. Lootlog needs one only
// for a battle or loot shortly after its removal, so the oldest are dropped.
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
    revision: 0,
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
          revision: state.revision + 1,
          status: "ready",
        };
      });
    },
    clearNpcs: (mapChanged = false) => {
      removedNpcsById.clear();
      set((state) => ({
        mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
        npcsById: Object.freeze({}),
        revision: state.revision + 1,
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
        revision: state.revision + 1,
        status: "ready",
      }));
    },
  };
});
