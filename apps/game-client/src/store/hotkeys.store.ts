import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import i18n from "@/i18n/config";

const STORAGE_KEY = storageKey("ll:hotkeys:state");

export type HotkeyAction =
  | "toggle-command"
  | "toggle-chat"
  | "toggle-settings"
  | "toggle-timers"
  | "toggle-online-players"
  | "invite-all";

export type HotkeyBinding = {
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
};

export type HotkeyCategory = "communication" | "windows" | "party";

export type HotkeyActionConfig = {
  action: HotkeyAction;
  labelKey: string;
  descriptionKey: string;
  category: HotkeyCategory;
  defaultBinding: HotkeyBinding;
};

export const HOTKEY_CATEGORY_KEYS: Record<HotkeyCategory, string> = {
  communication: "settings.hotkeys.categories.communication",
  windows: "settings.hotkeys.categories.windows",
  party: "settings.hotkeys.categories.party",
};

export const HOTKEY_ACTIONS: HotkeyActionConfig[] = [
  {
    action: "toggle-command",
    labelKey: "settings.hotkeys.actions.toggle-command.label",
    descriptionKey: "settings.hotkeys.actions.toggle-command.description",
    category: "communication",
    defaultBinding: { key: "S", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-chat",
    labelKey: "settings.hotkeys.actions.toggle-chat.label",
    descriptionKey: "settings.hotkeys.actions.toggle-chat.description",
    category: "communication",
    defaultBinding: { key: "C", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-settings",
    labelKey: "settings.hotkeys.actions.toggle-settings.label",
    descriptionKey: "settings.hotkeys.actions.toggle-settings.description",
    category: "windows",
    defaultBinding: { key: "O", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-timers",
    labelKey: "settings.hotkeys.actions.toggle-timers.label",
    descriptionKey: "settings.hotkeys.actions.toggle-timers.description",
    category: "windows",
    defaultBinding: { key: "T", shift: true, ctrl: false, alt: false },
  },
  {
    action: "toggle-online-players",
    labelKey: "settings.hotkeys.actions.toggle-online-players.label",
    descriptionKey:
      "settings.hotkeys.actions.toggle-online-players.description",
    category: "windows",
    defaultBinding: { key: "P", shift: true, ctrl: false, alt: false },
  },
  {
    action: "invite-all",
    labelKey: "settings.hotkeys.actions.invite-all.label",
    descriptionKey: "settings.hotkeys.actions.invite-all.description",
    category: "party",
    defaultBinding: { key: "I", shift: true, ctrl: false, alt: false },
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
      name: STORAGE_KEY,
      partialize: (state) => ({ bindings: state.bindings }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { bindings: Record<string, HotkeyBinding> };
        if (version < 2) {
          const defaults = getDefaultBindings();
          for (const [action, binding] of Object.entries(defaults)) {
            if (!state.bindings[action]) {
              state.bindings[action] = binding;
            }
          }
        }
        return state as unknown as HotkeysState;
      },
    },
  ),
);

export const formatBinding = (binding: HotkeyBinding): string => {
  const parts: string[] = [];
  if (binding.ctrl) parts.push(i18n.t("settings.hotkeys.modifiers.ctrl"));
  if (binding.alt) parts.push(i18n.t("settings.hotkeys.modifiers.alt"));
  if (binding.shift) parts.push(i18n.t("settings.hotkeys.modifiers.shift"));
  parts.push(binding.key);
  return parts.join(" + ");
};
