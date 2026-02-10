import type { GameClientAddon } from "@/addons/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const DISABLED_ADDONS_STORAGE_KEY = "ll:addons:disabled";

type AddonsPersistedState = {
  disabledAddonIds: string[];
};

type AddonsState = AddonsPersistedState & {
  setAddonEnabled: (addonId: string, enabled: boolean) => void;
  resetAddonOverrides: () => void;
};

const normalizeDisabledAddonIds = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));
};

export const useAddonsStore = create<AddonsState>()(
  persist(
    (set) => ({
      disabledAddonIds: [],
      setAddonEnabled: (addonId, enabled) => {
        set((state) => {
          const nextDisabledAddonIds = new Set(state.disabledAddonIds);

          if (enabled) {
            nextDisabledAddonIds.delete(addonId);
          } else {
            nextDisabledAddonIds.add(addonId);
          }

          return {
            disabledAddonIds: normalizeDisabledAddonIds(
              Array.from(nextDisabledAddonIds),
            ),
          };
        });
      },
      resetAddonOverrides: () => set({ disabledAddonIds: [] }),
    }),
    {
      name: DISABLED_ADDONS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ disabledAddonIds: state.disabledAddonIds }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        disabledAddonIds: normalizeDisabledAddonIds(
          (persistedState as AddonsPersistedState | undefined)
            ?.disabledAddonIds,
        ),
      }),
      version: 1,
    },
  ),
);

const hasDisabledAddon = (
  disabledAddonIds: ReadonlySet<string> | readonly string[],
  addonId: string,
) => {
  if (Array.isArray(disabledAddonIds)) {
    return disabledAddonIds.includes(addonId);
  }

  return (disabledAddonIds as ReadonlySet<string>).has(addonId);
};

export const readDisabledAddonIds = (): Set<string> => {
  return new Set(useAddonsStore.getState().disabledAddonIds);
};

export const isAddonEnabled = (
  addon: GameClientAddon,
  disabledAddonIds: ReadonlySet<string> | readonly string[],
): boolean => {
  if (hasDisabledAddon(disabledAddonIds, addon.id)) {
    return false;
  }

  return addon.defaultEnabled !== false;
};

export const setAddonEnabled = (
  addonId: string,
  enabled: boolean,
): Set<string> => {
  useAddonsStore.getState().setAddonEnabled(addonId, enabled);
  return readDisabledAddonIds();
};

export const resetAddonOverrides = () => {
  useAddonsStore.getState().resetAddonOverrides();
};
