import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsState {
  allowWorldSelection?: boolean;
  world?: string;
  guildId?: string;
  setGuildId: (guildId: string) => void;
  setWorld: (world: string) => void;
  toggleAllowWorldSelection: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      world: undefined,
      allowWorldSelection: false,
      guildId: undefined,
      setGuildId: (guildId: string) => {
        set({ guildId });
      },
      setWorld: (world: string) => {
        set({ world });
      },
      toggleAllowWorldSelection: () => {
        set((state) => ({ allowWorldSelection: !state.allowWorldSelection }));
      },
    }),
    {
      name: "ll:settings:state",
      partialize: (state) => ({
        allowWorldSelection: state.allowWorldSelection,
        world: state.world,
        guildId: state.guildId,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
