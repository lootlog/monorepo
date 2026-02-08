import { useWindowsStore, type WindowId } from "@/store/windows.store";
import {
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyBinding,
} from "@/store/hotkeys.store";
import { useEffect } from "react";

const ACTION_TO_WINDOW: Record<HotkeyAction, WindowId> = {
  "toggle-command": "command",
  "toggle-chat": "chat",
  "toggle-settings": "settings",
  "toggle-timers": "timers",
  "toggle-online-players": "online-players",
};

const matchesBinding = (event: KeyboardEvent, binding: HotkeyBinding) => {
  return (
    event.key.toUpperCase() === binding.key.toUpperCase() &&
    event.shiftKey === binding.shift &&
    event.ctrlKey === binding.ctrl &&
    event.altKey === binding.alt
  );
};

export const useHotkeys = () => {
  const { toggleOpen } = useWindowsStore();
  const bindings = useHotkeysStore((s) => s.bindings);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isInputActive = ["TEXTAREA", "MAGIC_INPUT", "INPUT"].includes(
        window.document.activeElement?.tagName ?? "",
      );
      if (isInputActive) return;

      for (const [action, binding] of Object.entries(bindings)) {
        if (matchesBinding(event, binding)) {
          event.preventDefault();
          const windowId = ACTION_TO_WINDOW[action as HotkeyAction];
          if (windowId) {
            toggleOpen(windowId, true);
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bindings, toggleOpen]);

  return null;
};
