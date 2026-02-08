import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type HotkeyAction =
  | "toggle-command"
  | "toggle-chat"
  | "toggle-settings"
  | "toggle-timers"
  | "toggle-online-players";

export type HotkeyBinding = {
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
};

export type HotkeyCategory = "communication" | "windows";

export type HotkeyActionConfig = {
  action: HotkeyAction;
  label: string;
  description: string;
  category: HotkeyCategory;
  defaultBinding: HotkeyBinding;
};

export const HOTKEY_CATEGORY_LABELS: Record<HotkeyCategory, string> = {
  communication: "Komunikacja",
  windows: "Okna",
};

export const HOTKEY_ACTIONS: HotkeyActionConfig[] = [
  {
    action: "toggle-command",
    label: "Konsola",
    description: "Otwórz/zamknij okno komendy",
    category: "communication",
    defaultBinding: { key: "S", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-chat",
    label: "Chat",
    description: "Otwórz/zamknij okno czatu",
    category: "communication",
    defaultBinding: { key: "C", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-settings",
    label: "Ustawienia",
    description: "Otwórz/zamknij ustawienia",
    category: "windows",
    defaultBinding: { key: "O", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-timers",
    label: "Timery",
    description: "Otwórz/zamknij okno timerów",
    category: "windows",
    defaultBinding: { key: "T", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-online-players",
    label: "Gracze online",
    description: "Otwórz/zamknij okno graczy online",
    category: "windows",
    defaultBinding: { key: "P", shift: true, ctrl: false, alt: false },
  },
];

const getDefaultBindings = (): Record<HotkeyAction, HotkeyBinding> => {
  const bindings = {} as Record<HotkeyAction, HotkeyBinding>;
  for (const config of HOTKEY_ACTIONS) {
    bindings[config.action] = { ...config.defaultBinding };
  }
  return bindings;
};

interface HotkeysState {
  bindings: Record<HotkeyAction, HotkeyBinding>;
  setBinding: (action: HotkeyAction, binding: HotkeyBinding) => void;
  resetBinding: (action: HotkeyAction) => void;
  resetAll: () => void;
}

export const useHotkeysStore = create<HotkeysState>()(
  persist(
    (set) => ({
      bindings: getDefaultBindings(),
      setBinding: (action, binding) =>
        set((state) => ({
          bindings: { ...state.bindings, [action]: binding },
        })),
      resetBinding: (action) => {
        const config = HOTKEY_ACTIONS.find((c) => c.action === action);
        if (!config) return;
        set((state) => ({
          bindings: {
            ...state.bindings,
            [action]: { ...config.defaultBinding },
          },
        }));
      },
      resetAll: () => set({ bindings: getDefaultBindings() }),
    }),
    {
      name: "ll:hotkeys:state",
      partialize: (state) => ({ bindings: state.bindings }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export const formatBinding = (binding: HotkeyBinding): string => {
  const parts: string[] = [];
  if (binding.ctrl) parts.push("Ctrl");
  if (binding.alt) parts.push("Alt");
  if (binding.shift) parts.push("Shift");
  parts.push(binding.key);
  return parts.join(" + ");
};
