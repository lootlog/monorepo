import { create } from "zustand";

type FactionWarPickState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

/** Whether the pick screen is on screen; it opens once per session at most by itself. */
export const useFactionWarPickStore = create<FactionWarPickState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
