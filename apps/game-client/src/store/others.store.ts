import type { Other } from "@lootlog/margonem/others";
import { create } from "zustand";

type OthersById = Record<string, Other>;

type OthersBatch = {
  removeIds?: readonly string[];
  upserts?: Readonly<OthersById>;
};

interface OthersState {
  othersById: OthersById;
  applyBatch: (batch: OthersBatch) => void;
  clearOthers: () => void;
  getOther: (id: string) => Other | undefined;
  removeOther: (id: string) => void;
  setMany: (othersById: OthersById) => void;
  upsertOther: (id: string, other: Other) => void;
}

export const useOthersStore = create<OthersState>()((set, get) => ({
  othersById: {},
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

      return changed ? { othersById } : state;
    }),
  clearOthers: () => set({ othersById: {} }),
  getOther: (id) => get().othersById[id],
  removeOther: (id) =>
    set((state) => {
      if (!state.othersById[id]) return state;

      const { [id]: _removed, ...othersById } = state.othersById;
      return { othersById };
    }),
  setMany: (othersById) => set({ othersById: { ...othersById } }),
  upsertOther: (id, other) =>
    set((state) => {
      if (state.othersById[id] === other) return state;

      return {
        othersById: {
          ...state.othersById,
          [id]: other,
        },
      };
    }),
}));
