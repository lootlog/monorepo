import { useWindowsStore, type WindowId } from "@/store/windows.store";
import {
  HOTKEY_ACTIONS,
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyBinding,
} from "@/store/hotkeys.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { inviteCharacterToParty } from "@/utils/game/character-actions";
import { useEffect, useRef } from "react";

type HotkeyEvent = KeyboardEvent | MouseEvent;
type UseHotkeysOptions = {
  onMapPing?: (event: HotkeyEvent) => boolean;
};

const ACTION_TO_WINDOW: Partial<Record<HotkeyAction, WindowId>> = {
  "toggle-command": "command",
  "toggle-chat": "chat",
  "toggle-settings": "settings",
  "toggle-timers": "timers",
  "toggle-online-players": "online-players",
  "toggle-quick-access": "quick-access",
};

const matchesBinding = (event: HotkeyEvent, binding: HotkeyBinding) => {
  const modifiersMatch =
    event.shiftKey === binding.shift &&
    event.ctrlKey === binding.ctrl &&
    event.altKey === binding.alt;
  if (!modifiersMatch) {
    return false;
  }

  if (event instanceof KeyboardEvent && binding.type === "keyboard") {
    return event.key.toUpperCase() === binding.key.toUpperCase();
  }

  return (
    event instanceof MouseEvent &&
    binding.type === "mouse" &&
    event.button === binding.button
  );
};

const isEditableElementActive = () => {
  const activeElement = window.document.activeElement;
  return (
    activeElement instanceof HTMLElement &&
    (["TEXTAREA", "MAGIC_INPUT", "INPUT"].includes(activeElement.tagName) ||
      activeElement.isContentEditable ||
      activeElement.getAttribute("role") === "textbox")
  );
};

const hotkeyScopes = new Map(
  HOTKEY_ACTIONS.map(({ action, scope }) => [action, scope]),
);

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
    inviteCharacterToParty(v.characterId);
    await new Promise((r) => setTimeout(r, 200));
  }
};

export const useHotkeys = ({ onMapPing }: UseHotkeysOptions = {}) => {
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);
  const bindings = useHotkeysStore((s) => s.bindings);
  const setInviteState = usePartyFinderStore((s) => s.setInviteState);
  const isInvitingRef = useRef(false);
  const handledMouseRef = useRef<{
    button: number;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  } | null>(null);

  useEffect(() => {
    const executeAction = (event: HotkeyEvent) => {
      for (const [action, binding] of Object.entries(bindings)) {
        if (!matchesBinding(event, binding)) {
          continue;
        }

        const hotkeyAction = action as HotkeyAction;
        const windowId = ACTION_TO_WINDOW[hotkeyAction];
        if (windowId) {
          toggleOpen(windowId, true);
          return true;
        }

        if (hotkeyAction === "invite-all" && !isInvitingRef.current) {
          isInvitingRef.current = true;
          inviteAll(setInviteState).finally(() => {
            isInvitingRef.current = false;
          });
          return true;
        }

        if (hotkeyAction === "map-ping") {
          return onMapPing?.(event) ?? false;
        }

        return false;
      }

      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElementActive()) return;
      if (executeAction(event)) {
        event.preventDefault();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (isEditableElementActive()) return;

      const matchingAction = Object.entries(bindings).find(
        ([action, binding]) =>
          binding.type === "mouse" &&
          matchesBinding(event, binding) &&
          (hotkeyScopes.get(action as HotkeyAction) === "global" ||
            hotkeyScopes.get(action as HotkeyAction) === "map-surface"),
      );
      if (!matchingAction || !executeAction(event)) {
        return;
      }

      event.preventDefault();
      handledMouseRef.current = {
        button: event.button,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
      };
      window.setTimeout(() => {
        handledMouseRef.current = null;
      }, 1_000);
    };

    const suppressHandledMouseEvent = (event: MouseEvent) => {
      const handledMouse = handledMouseRef.current;
      if (
        handledMouse &&
        handledMouse.button === event.button &&
        handledMouse.ctrl === event.ctrlKey &&
        handledMouse.alt === event.altKey &&
        handledMouse.shift === event.shiftKey
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", suppressHandledMouseEvent);
    window.addEventListener("auxclick", suppressHandledMouseEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", suppressHandledMouseEvent);
      window.removeEventListener("auxclick", suppressHandledMouseEvent);
    };
  }, [bindings, toggleOpen, setInviteState, onMapPing]);

  return null;
};
