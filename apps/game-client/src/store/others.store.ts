import type { Other } from "@lootlog/margonem";
import { create } from "zustand";

type OthersById = Record<string, Other>;

interface OthersState {
  othersById: OthersById;
  clearOthers: () => void;
  getOther: (id: string) => Other | undefined;
  removeOther: (id: string) => void;
  setMany: (othersById: OthersById) => void;
  upsertOther: (id: string, other: Other) => void;
}

export const useOthersStore = create<OthersState>()((set, get) => ({
  othersById: {},
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
