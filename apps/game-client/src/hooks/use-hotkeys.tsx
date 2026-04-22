import { useWindowsStore, type WindowId } from "@/store/windows.store";
import {
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyBinding,
} from "@/store/hotkeys.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { useEffect, useRef } from "react";

const ACTION_TO_WINDOW: Partial<Record<HotkeyAction, WindowId>> = {
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

const inviteAll = async (
  setInviteState: (id: string, state: "pending" | "failed") => void,
) => {
  const volunteers = usePartyFinderStore.getState().volunteers;
  const partyMembers = usePartyStore.getState().members;

  const invitable = volunteers.filter(
    (v) => !partyMembers.some((m) => m.id === Number.parseInt(v.characterId)),
  );

  for (const v of invitable) {
    setInviteState(v.characterId, "pending");
    window._g(`party&a=inv&id=${v.characterId}`);
    await new Promise((r) => setTimeout(r, 200));
  }
};

export const useHotkeys = () => {
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);
  const bindings = useHotkeysStore((s) => s.bindings);
  const setInviteState = usePartyFinderStore((s) => s.setInviteState);
  const isInvitingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = window.document.activeElement;
      const isInputActive =
        activeElement instanceof HTMLElement &&
        (["TEXTAREA", "MAGIC_INPUT", "INPUT"].includes(activeElement.tagName) ||
          activeElement.isContentEditable ||
          activeElement.getAttribute("role") === "textbox");

      if (isInputActive) return;

      for (const [action, binding] of Object.entries(bindings)) {
        if (matchesBinding(event, binding)) {
          event.preventDefault();

          const windowId = ACTION_TO_WINDOW[action as HotkeyAction];
          if (windowId) {
            toggleOpen(windowId, true);
            return;
          }

          if (action === "invite-all" && !isInvitingRef.current) {
            isInvitingRef.current = true;
            inviteAll(setInviteState).finally(() => {
              isInvitingRef.current = false;
            });
          }

          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bindings, toggleOpen, setInviteState]);

  return null;
};
