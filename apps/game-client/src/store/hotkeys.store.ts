import { isObjectRecord } from "@lootlog/schema/records";
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
  | "toggle-quick-access"
  | "invite-all"
  | "map-ping"
  | "chat-position"
  | "chat-help"
  | "join-party-gathering"
  | "create-party-gathering";

type HotkeyModifiers = {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
};

export type KeyboardHotkeyBinding = HotkeyModifiers & {
  type: "keyboard";
  key: string;
};

export type MouseHotkeyButton = 1 | 3 | 4;

export type MouseHotkeyBinding = HotkeyModifiers & {
  type: "mouse";
  button: MouseHotkeyButton;
};

export type HotkeyBinding = KeyboardHotkeyBinding | MouseHotkeyBinding;
export type HotkeyScope = "global" | "map-surface";

export type HotkeyCategory = "communication" | "windows" | "party";

export type HotkeyActionConfig = {
  action: HotkeyAction;
  labelKey: string;
  descriptionKey: string;
  category: HotkeyCategory;
  scope: HotkeyScope;
  defaultBinding: HotkeyBinding;
};

export const HOTKEY_CATEGORY_KEYS: Record<HotkeyCategory, string> = {
  communication: "settings.hotkeys.categories.communication",
  windows: "settings.hotkeys.categories.windows",
  party: "settings.hotkeys.categories.party",
};

export const HOTKEY_ACTIONS: HotkeyActionConfig[] = [
  ...(
    [
      { action: "chat-position", key: "P" },
      { action: "chat-help", key: "H" },
      { action: "join-party-gathering", key: "" },
      { action: "create-party-gathering", key: "" },
    ] as const
  ).map(({ action, key }) => ({
    action,
    labelKey: `chat:quickActions.hotkeys.${action}.label`,
    descriptionKey: `chat:quickActions.hotkeys.${action}.description`,
    category: "communication" as const,
    scope: "global" as const,
    defaultBinding: {
      type: "keyboard" as const,
      key,
      shift: false,
      ctrl: false,
      alt: key !== "",
    },
  })),
  {
    action: "toggle-command",
    labelKey: "settings.hotkeys.actions.toggle-command.label",
    descriptionKey: "settings.hotkeys.actions.toggle-command.description",
    category: "communication",
    scope: "global",
    defaultBinding: {
      type: "keyboard",
      key: "S",
      shift: true,
      ctrl: false,
      alt: false,
    },
  },
  {
    action: "toggle-chat",
    labelKey: "settings.hotkeys.actions.toggle-chat.label",
    descriptionKey: "settings.hotkeys.actions.toggle-chat.description",
    category: "communication",
    scope: "global",
    defaultBinding: {
      type: "keyboard",
      key: "C",
      shift: true,
      ctrl: false,
      alt: false,
    },
  },
  {
    action: "toggle-settings",
    labelKey: "settings.hotkeys.actions.toggle-settings.label",
    descriptionKey: "settings.hotkeys.actions.toggle-settings.description",
    category: "windows",
    scope: "global",
    defaultBinding: {
      type: "keyboard",
      key: "O",
      shift: true,
      ctrl: false,
      alt: false,
    },
  },
  {
    action: "toggle-timers",
    labelKey: "settings.hotkeys.actions.toggle-timers.label",
    descriptionKey: "settings.hotkeys.actions.toggle-timers.description",
    category: "windows",
    scope: "global",
    defaultBinding: {
      type: "keyboard",
      key: "T",
      shift: true,
      ctrl: false,
      alt: false,
    },
  },
  {
    action: "toggle-online-players",
    labelKey: "settings.hotkeys.actions.toggle-online-players.label",
    descriptionKey:
      "settings.hotkeys.actions.toggle-online-players.description",
    category: "windows",
    scope: "global",
    defaultBinding: {
      type: "keyboard",
      key: "P",
      shift: true,
      ctrl: false,
      alt: false,
    },
  },
  {
    action: "toggle-quick-access",
    labelKey: "settings.hotkeys.actions.toggle-quick-access.label",
    descriptionKey: "settings.hotkeys.actions.toggle-quick-access.description",
    category: "windows",
    scope: "global",
    defaultBinding: {
      type: "keyboard",
      key: "Q",
      shift: true,
      ctrl: false,
      alt: false,
    },
  },
  {
    action: "invite-all",
    labelKey: "settings.hotkeys.actions.invite-all.label",
    descriptionKey: "settings.hotkeys.actions.invite-all.description",
    category: "party",
    scope: "global",
    defaultBinding: {
      type: "keyboard",
      key: "I",
      shift: true,
      ctrl: false,
      alt: false,
    },
  },
  {
    action: "map-ping",
    labelKey: "settings.hotkeys.actions.map-ping.label",
    descriptionKey: "settings.hotkeys.actions.map-ping.description",
    category: "communication",
    scope: "map-surface",
    defaultBinding: {
      type: "mouse",
      button: 1,
      shift: false,
      ctrl: false,
      alt: false,
    },
  },
];

const getDefaultBindings = (): Record<HotkeyAction, HotkeyBinding> => {
  const bindings: Partial<Record<HotkeyAction, HotkeyBinding>> = {};
  for (const config of HOTKEY_ACTIONS) {
    bindings[config.action] = { ...config.defaultBinding };
  }
  // SAFETY: HOTKEY_ACTIONS enumerates all eight HotkeyAction values, copied by the loop above.
  return bindings as Record<HotkeyAction, HotkeyBinding>;
};

export const migrateHotkeysState = (persisted: unknown, version = 0) => {
  if (!isObjectRecord(persisted))
    throw new TypeError("Invalid persisted hotkey state");
  const state = persisted;
  const persistedBindings = isObjectRecord(state.bindings)
    ? state.bindings
    : {};
  const bindings: Record<string, HotkeyBinding> = {};

  for (const [action, binding] of Object.entries(persistedBindings)) {
    const migratedBinding = migrateBinding(binding);
    if (migratedBinding) {
      bindings[action] = migratedBinding;
    }
  }

  const defaults = getDefaultBindings();

  for (const [action, binding] of Object.entries(defaults)) {
    const previous = bindings[action];
    const isQuickAction = action === "chat-help" || action === "chat-position";
    const needsDefault =
      !previous ||
      (version < 7 &&
        isQuickAction &&
        previous.type === "keyboard" &&
        !previous.key);
    if (!needsDefault) continue;
    const occupied =
      isQuickAction &&
      Object.entries(bindings).some(
        ([otherAction, otherBinding]) =>
          otherAction !== action && bindingsEqual(otherBinding, binding),
      );
    bindings[action] = occupied
      ? { type: "keyboard", key: "", shift: false, ctrl: false, alt: false }
      : binding;
  }

  // SAFETY: The defaults loop adds every missing HotkeyAction after validating stored bindings.
  const completeBindings = bindings as Record<HotkeyAction, HotkeyBinding>;
  return { ...state, bindings: completeBindings };
};

const migrateBinding = (binding: unknown): HotkeyBinding | null => {
  if (!isObjectRecord(binding)) {
    return null;
  }

  const candidate = binding;
  const modifiers = {
    shift: candidate.shift === true,
    ctrl: candidate.ctrl === true,
    alt: candidate.alt === true,
  };

  if (
    candidate.type === "mouse" &&
    (candidate.button === 1 || candidate.button === 3 || candidate.button === 4)
  ) {
    return { type: "mouse", button: candidate.button, ...modifiers };
  }

  if (
    typeof candidate.key === "string" &&
    (candidate.key.length > 0 || candidate.type === "keyboard")
  ) {
    return { type: "keyboard", key: candidate.key, ...modifiers };
  }

  return null;
};

interface HotkeysState {
  bindings: Record<HotkeyAction, HotkeyBinding>;
  setBinding: (action: HotkeyAction, binding: HotkeyBinding) => boolean;
  resetBinding: (action: HotkeyAction) => void;
  resetAll: () => void;
}

export const useHotkeysStore = create<HotkeysState>()(
  persist<HotkeysState, [], [], Pick<HotkeysState, "bindings">>(
    (set, get) => ({
      bindings: getDefaultBindings(),
      setBinding: (action, binding) => {
        const hasConflict = Object.entries(get().bindings).some(
          ([otherAction, otherBinding]) =>
            otherAction !== action && bindingsEqual(otherBinding, binding),
        );
        if (hasConflict) {
          return false;
        }

        set((state) => ({
          bindings: { ...state.bindings, [action]: binding },
        }));
        return true;
      },
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
      version: 8,
      migrate: migrateHotkeysState,
    },
  ),
);

export const bindingsEqual = (
  first: HotkeyBinding,
  second: HotkeyBinding,
): boolean => {
  if (
    (first.type === "keyboard" && !first.key) ||
    (second.type === "keyboard" && !second.key)
  )
    return false;
  if (
    first.type !== second.type ||
    first.shift !== second.shift ||
    first.ctrl !== second.ctrl ||
    first.alt !== second.alt
  ) {
    return false;
  }

  if (first.type === "keyboard" && second.type === "keyboard") {
    return first.key.toUpperCase() === second.key.toUpperCase();
  }

  return (
    first.type === "mouse" &&
    second.type === "mouse" &&
    first.button === second.button
  );
};

export const formatBinding = (binding: HotkeyBinding): string => {
  if (binding.type === "keyboard" && !binding.key)
    return i18n.t("chat:quickActions.unassigned");
  const parts: string[] = [];
  if (binding.ctrl) parts.push(i18n.t("settings.hotkeys.modifiers.ctrl"));
  if (binding.alt) parts.push(i18n.t("settings.hotkeys.modifiers.alt"));
  if (binding.shift) parts.push(i18n.t("settings.hotkeys.modifiers.shift"));
  if (binding.type === "keyboard") {
    parts.push(binding.key);
  } else {
    parts.push(i18n.t(`settings.hotkeys.mouseButtons.${binding.button}`));
  }
  return parts.join(" + ");
};
