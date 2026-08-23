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
  clearOthers: (mapChanged?: boolean) => void;
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

function areRuntimeOthersEqual(
  current: RuntimeOther,
  incoming: RuntimeOther,
): boolean {
  return (
    current.accountId === incoming.accountId &&
    current.characterId === incoming.characterId &&
    current.icon === incoming.icon &&
    current.level === incoming.level &&
    current.name === incoming.name &&
    current.profession === incoming.profession
  );
}

function reconcileOthersById(
  current: OthersById,
  incoming: OthersById,
): OthersById {
  const incomingEntries = Object.entries(incoming);
  const reconciled: Record<string, RuntimeOther> = {};
  let changed = Object.keys(current).length !== incomingEntries.length;

  for (const [id, other] of incomingEntries) {
    const currentOther = current[id];
    if (currentOther && areRuntimeOthersEqual(currentOther, other)) {
      reconciled[id] = currentOther;
      continue;
    }

    reconciled[id] = other;
    changed = true;
  }

  return changed ? Object.freeze(reconciled) : current;
}

export const useOthersStore = create<OthersState>()((set, get) => ({
  mapEpoch: 0,
  othersById: Object.freeze({}),
  revision: 0,
  status: "uninitialized",
  applyBatch: ({ removeIds = [], upserts = {} }) =>
    set((state) => {
      let writableOthersById: Record<string, RuntimeOther> | null = null;
      const getWritableOthersById = () => {
        writableOthersById ??= { ...state.othersById };
        return writableOthersById;
      };

      for (const id of removeIds) {
        if (!(id in state.othersById)) continue;
        delete getWritableOthersById()[id];
      }

      for (const [id, other] of Object.entries(upserts)) {
        const currentOther = state.othersById[id];
        if (
          currentOther === other ||
          (currentOther && areRuntimeOthersEqual(currentOther, other))
        ) {
          continue;
        }
        getWritableOthersById()[id] = other;
      }

      if (!writableOthersById && state.status === "ready") return state;
      return {
        othersById: Object.freeze(
          writableOthersById ?? { ...state.othersById },
        ),
        revision: state.revision + 1,
        status: "ready",
      };
    }),
  clearOthers: (mapChanged = false) =>
    set((state) => ({
      mapEpoch: state.mapEpoch + (mapChanged ? 1 : 0),
      othersById: Object.freeze({}),
      revision: state.revision + 1,
      status: "uninitialized",
    })),
  getOther: (id) => get().othersById[id],
  removeOther: (id) => get().applyBatch({ removeIds: [id] }),
  replaceOthers: (othersById, mapChanged = false) =>
    set((state) => {
      const reconciledOthersById = reconcileOthersById(
        state.othersById,
        othersById,
      );
      if (
        !mapChanged &&
        state.status === "ready" &&
        reconciledOthersById === state.othersById
      ) {
        return state;
      }

      return {
        mapEpoch: state.mapEpoch + (mapChanged ? 1 : 0),
        othersById: reconciledOthersById,
        revision: state.revision + 1,
        status: "ready",
      };
    }),
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
