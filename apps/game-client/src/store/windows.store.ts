import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WindowId =
  | "settings"
  | "timers"
  | "chat"
  | "online-players"
  | "add-timer";

interface WindowPositionState {
  x: number;
  y: number;
}

export type WindowOpacity = 1 | 2 | 3 | 4;

interface WindowSizeState {
  width: number;
  height: number;
}

interface WindowData {
  open: boolean;
  position: WindowPositionState;
  size: WindowSizeState;
  opacity: WindowOpacity;
}

interface WindowsState {
  settings: WindowData;
  timers: WindowData;
  chat: WindowData;
  "online-players": WindowData;
  "add-timer": WindowData;
  currentWindowFocus?: WindowId;
  setCurrentWindowFocus: (key: WindowId) => void;
  setOpen: (window: WindowId, open: boolean) => void;
  setPosition: (window: WindowId, pos: WindowPositionState) => void;
  setSize: (window: WindowId, size: WindowSizeState) => void;
  setOpacity: (window: WindowId, opacity: WindowOpacity) => void;
  toggleOpen: (window: WindowId) => void;
}

const DEFAULT_OPACITY: WindowOpacity = 4;
const DEFAULT_POSITION: WindowPositionState = { x: 0, y: 0 };
const DEFAULT_SIZE: WindowSizeState = { width: 242, height: 240 };

export const useWindowsStore = create<WindowsState>()(
  // @ts-ignore
  persist(
    (set, get) => ({
      settings: {
        open: false,
        position: DEFAULT_POSITION,
        size: { width: 420, height: 440 },
        opacity: DEFAULT_OPACITY,
      },
      timers: {
        open: true,
        position: DEFAULT_POSITION,
        size: DEFAULT_SIZE,
        opacity: DEFAULT_OPACITY,
      },
      chat: {
        open: true,
        position: DEFAULT_POSITION,
        size: DEFAULT_SIZE,
        opacity: DEFAULT_OPACITY,
      },
      "online-players": {
        open: true,
        position: DEFAULT_POSITION,
        size: { width: 242, height: 240 },
        opacity: DEFAULT_OPACITY,
      },
      "add-timer": {
        open: true,
        position: DEFAULT_POSITION,
        size: { width: 242, height: 240 },
        opacity: DEFAULT_OPACITY,
      },
      currentWindowFocus: undefined,
      setCurrentWindowFocus: (key: WindowId) =>
        set({ currentWindowFocus: key }),
      setOpen: (key: WindowId, open) =>
        set((state) => ({ [key]: { ...state[key], open } })),
      setPosition: (key: WindowId, pos) =>
        set((state) => ({ [key]: { ...state[key], position: pos } })),
      setSize: (key: WindowId, size) =>
        set((state) => ({ [key]: { ...state[key], size } })),
      setOpacity: (key: WindowId, opacity: WindowOpacity) =>
        set((state) => ({ [key]: { ...state[key], opacity } })),
      toggleOpen: (key: WindowId) => {
        const curr = get()[key].open;
        set((state) => ({ [key]: { ...state[key], open: !curr } }));
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
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
