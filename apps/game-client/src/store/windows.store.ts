import { GameNpc } from "@/types/margonem/npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NpcDetectorWindowState = {
  npcs: GameNpc[];
};

export type CreateNotificationState = {
  npc?: GameNpc;
};

export type WindowId =
  | "settings"
  | "timers"
  | "chat"
  | "online-players"
  | "add-timer"
  | "npc-detector"
  | "notifications"
  | "create-notification"
  | "quick-access";

interface WindowPositionState {
  x: number;
  y: number;
}

export type WindowOpacity = 1 | 2 | 3 | 4 | 5;

interface WindowSizeState {
  width: number;
  height: number;
}

interface WindowData {
  open: boolean;
  position: WindowPositionState;
  size: WindowSizeState;
  opacity: WindowOpacity;
  locked: boolean;
  autofocus?: boolean;
}

interface WindowsState {
  settings: WindowData;
  timers: WindowData;
  chat: WindowData;
  "online-players": WindowData;
  "add-timer": WindowData;
  "npc-detector": WindowData & { state: NpcDetectorWindowState };
  notifications: WindowData;
  "create-notification": WindowData & { state: CreateNotificationState };
  "quick-access": WindowData;
  currentWindowFocus?: WindowId;
  setCurrentWindowFocus: (key: WindowId) => void;
  setOpen: <T = unknown>(window: WindowId, open: boolean, state?: T) => void;
  setPosition: (window: WindowId, pos: WindowPositionState) => void;
  setSize: (window: WindowId, size: WindowSizeState) => void;
  setOpacity: (window: WindowId, opacity: WindowOpacity) => void;
  setLocked: (window: WindowId, locked: boolean) => void;
  toggleOpen: (window: WindowId, autofocus?: boolean) => void;
  setAutofocus: (window: WindowId, autofocus: boolean) => void;
}

const DEFAULT_OPACITY: WindowOpacity = 4;
const DEFAULT_POSITION: WindowPositionState = { x: 0, y: 0 };
const DEFAULT_SIZE: WindowSizeState = { width: 242, height: 240 };

export const useWindowsStore = create<WindowsState>()(
  persist(
    (set, get) => ({
      settings: {
        open: false,
        position: DEFAULT_POSITION,
        size: { width: 420, height: 440 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      timers: {
        open: true,
        position: DEFAULT_POSITION,
        size: DEFAULT_SIZE,
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      chat: {
        open: true,
        position: DEFAULT_POSITION,
        size: DEFAULT_SIZE,
        opacity: DEFAULT_OPACITY,
        locked: false,
        autofocus: false,
      },
      "online-players": {
        open: true,
        position: DEFAULT_POSITION,
        size: { width: 242, height: 240 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "add-timer": {
        open: false,
        position: DEFAULT_POSITION,
        size: { width: 242, height: 300 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "npc-detector": {
        open: false,
        position: DEFAULT_POSITION,
        size: { width: 300, height: 300 },
        opacity: DEFAULT_OPACITY,
        state: { npcs: [] },
        locked: false,
      },
      notifications: {
        open: false,
        position: DEFAULT_POSITION,
        size: { width: 360, height: 300 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "create-notification": {
        open: false,
        position: DEFAULT_POSITION,
        size: { width: 242, height: 300 },
        opacity: DEFAULT_OPACITY,
        state: { npcs: [] },
        locked: false,
      },
      "quick-access": {
        open: true,
        position: DEFAULT_POSITION,
        size: { width: 180, height: 48 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      currentWindowFocus: undefined,
      setCurrentWindowFocus: (key: WindowId) =>
        set({ currentWindowFocus: key }),
      setOpen: <T = unknown>(key: WindowId, open: boolean, windowState?: T) => {
        return set((state) => ({
          [key]: { ...state[key], open, state: open ? windowState : [] },
          currentWindowFocus: key,
        }));
      },
      setPosition: (key: WindowId, pos) =>
        set((state) => ({ [key]: { ...state[key], position: pos } })),
      setSize: (key: WindowId, size) =>
        set((state) => ({ [key]: { ...state[key], size } })),
      setOpacity: (key: WindowId, opacity: WindowOpacity) =>
        set((state) => ({ [key]: { ...state[key], opacity } })),
      setLocked: (key: WindowId, locked: boolean) =>
        set((state) => ({ [key]: { ...state[key], locked } })),
      setAutofocus: (key: WindowId, autofocus: boolean) =>
        set((state) => ({ [key]: { ...state[key], autofocus } })),
      toggleOpen: (key: WindowId, autofocus?: boolean) => {
        const curr = get()[key].open;
        set((state) => ({
          [key]: {
            ...state[key],
            open: !curr,
            autofocus,
          },
          currentWindowFocus: !curr ? key : undefined,
        }));
      },
    }),
    {
      name: "ll-windows-state",
      partialize: (state) => ({
        settings: state.settings,
        timers: state.timers,
        chat: state.chat,
        "online-players": state["online-players"],
        "add-timer": state["add-timer"],
        "npc-detector": state["npc-detector"],
        notifications: state["notifications"],
        currentWindowFocus: state.currentWindowFocus,
        "create-notification": {
          size: state["create-notification"].size,
          position: state["create-notification"].position,
          opacity: state["create-notification"].opacity,
        },
        "quick-access": state["quick-access"],
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
