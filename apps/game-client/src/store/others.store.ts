import { create } from "zustand";
import type {
  RuntimeOther,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import {
  replaceRuntimeOtherHandlesForCompatibility,
  upsertRuntimeOtherHandleForCompatibility,
} from "@/lib/margonem-runtime/runtime-other-handles";

type RuntimeOtherInput =
  | RuntimeOther
  | Readonly<{
      d: Readonly<{
        account?: number | string;
        icon?: string;
        id?: number | string;
        lvl?: number;
        nick?: string;
        prof?: string;
      }>;
    }>;

type OthersById = Readonly<Record<string, RuntimeOther>>;

type OthersBatch = {
  removeIds?: readonly string[];
  upserts?: OthersById;
};

interface OthersState {
  mapEpoch: number;
  othersById: OthersById;
  revision: number;
  status: RuntimeStatus;
  applyBatch: (batch: OthersBatch) => void;
  clearOthers: () => void;
  getOther: (id: string) => RuntimeOther | undefined;
  removeOther: (id: string) => void;
  replaceOthers: (othersById: OthersById, mapChanged?: boolean) => void;
  setMany: (othersById: Readonly<Record<string, RuntimeOtherInput>>) => void;
  upsertOther: (id: string, other: RuntimeOtherInput) => void;
}

function normalizeOther(other: RuntimeOtherInput): RuntimeOther {
  if (!("d" in other)) return other;
  return Object.freeze({
    accountId: String(other.d.account ?? ""),
    characterId: String(other.d.id ?? ""),
    icon: other.d.icon ?? "",
    level: other.d.lvl ?? 0,
    name: other.d.nick ?? "",
    profession: other.d.prof ?? "",
  });
}

export const useOthersStore = create<OthersState>()((set, get) => ({
  mapEpoch: 0,
  othersById: Object.freeze({}),
  revision: 0,
  status: "uninitialized",
  applyBatch: ({ removeIds = [], upserts = {} }) =>
    set((state) => {
      const othersById = { ...state.othersById };
      let changed = false;

      for (const id of removeIds) {
        if (!(id in othersById)) continue;
        delete othersById[id];
        changed = true;
      }

      for (const [id, other] of Object.entries(upserts)) {
        if (othersById[id] === other) continue;
        othersById[id] = other;
        changed = true;
      }

      if (!changed && state.status === "ready") return state;
      return {
        othersById: Object.freeze(othersById),
        revision: state.revision + 1,
        status: "ready",
      };
    }),
  clearOthers: () =>
    set((state) => ({
      othersById: Object.freeze({}),
      revision: state.revision + 1,
      status: "uninitialized",
    })),
  getOther: (id) => get().othersById[id],
  removeOther: (id) => get().applyBatch({ removeIds: [id] }),
  replaceOthers: (othersById, mapChanged = false) =>
    set((state) => ({
      mapEpoch: state.mapEpoch + (mapChanged ? 1 : 0),
      othersById: Object.freeze({ ...othersById }),
      revision: state.revision + 1,
      status: "ready",
    })),
  setMany: (othersById) => {
    replaceRuntimeOtherHandlesForCompatibility(othersById);
    get().replaceOthers(
      Object.fromEntries(
        Object.entries(othersById).map(([id, other]) => [
          id,
          normalizeOther(other),
        ]),
      ),
    );
  },
  upsertOther: (id, other) => {
    upsertRuntimeOtherHandleForCompatibility(id, other);
    get().applyBatch({ upserts: { [id]: normalizeOther(other) } });
  },
}));
