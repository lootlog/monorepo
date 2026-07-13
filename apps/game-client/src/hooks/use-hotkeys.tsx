import { useWindowsStore, type WindowId } from "@/store/windows.store";
import {
  HOTKEY_ACTIONS,
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyBinding,
} from "@/store/hotkeys.store";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { useEffect, useRef } from "react";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";

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

export const useHotkeys = ({ onMapPing }: UseHotkeysOptions = {}) => {
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);
  const bindings = useHotkeysStore((s) => s.bindings);
  const { inviteParticipants } = useReadyRoomInvitations();
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
          const ownedReadyRoom = selectOwnedReadyRoom(
            usePartyFinderStore.getState(),
          );
          const participantDiscordIds = ownedReadyRoom
            ? Object.values(ownedReadyRoom.participants)
                .filter(
                  ({ application, partyPresence }) =>
                    application === "ACCEPTED" && partyPresence === "OUTSIDE",
                )
                .map(({ discordId }) => discordId)
            : [];
          if (participantDiscordIds.length === 0) return false;
          isInvitingRef.current = true;
          void inviteParticipants(participantDiscordIds).finally(() => {
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
      const matchingAction = Object.entries(bindings).find(
        ([action, binding]) =>
          binding.type === "mouse" &&
          matchesBinding(event, binding) &&
          (hotkeyScopes.get(action as HotkeyAction) === "global" ||
            hotkeyScopes.get(action as HotkeyAction) === "map-surface"),
      );
      if (
        !matchingAction ||
        (isEditableElementActive() && matchingAction[0] !== "map-ping") ||
        !executeAction(event)
      ) {
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
  }, [bindings, toggleOpen, inviteParticipants, onMapPing]);

  return null;
};
