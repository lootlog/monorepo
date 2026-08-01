import { useWindowsStore, type WindowId } from "@/store/windows.store";
import {
  HOTKEY_ACTIONS,
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyBinding,
} from "@/store/hotkeys.store";
import { useEffect, useRef } from "react";
import {
  canEnqueueReadyRoomInvitations,
  enqueueReadyRoomInvitations,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import {
  createMapPingPressIdentity,
  isSameMapPingPressIdentity,
  type MapPingPressIdentity,
} from "@/features/map-pings/map-ping-interaction-controller";
import {
  addMeasuredEventListener,
  setMeasuredTimeout,
} from "@/lib/performance-monitoring/measured-callback";

type HotkeyEvent = KeyboardEvent | MouseEvent;
type UseHotkeysOptions = {
  onMapPingCancel?: () => void;
  onMapPingEnd?: (event: HotkeyEvent) => void;
  onMapPingStart?: (event: HotkeyEvent) => boolean;
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

export const useHotkeys = ({
  onMapPingCancel,
  onMapPingEnd,
  onMapPingStart,
}: UseHotkeysOptions = {}) => {
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);
  const bindings = useHotkeysStore((s) => s.bindings);
  const activeMapPingIdentityRef = useRef<MapPingPressIdentity | null>(null);
  const handledMouseRef = useRef<{
    button: number;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  } | null>(null);
  const handledMouseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const rememberHandledMouse = (event: MouseEvent) => {
      if (handledMouseTimeoutRef.current !== null) {
        window.clearTimeout(handledMouseTimeoutRef.current);
      }
      handledMouseRef.current = {
        button: event.button,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
      };
      handledMouseTimeoutRef.current = setMeasuredTimeout(
        "hotkeys.handled-mouse-expiry",
        () => {
          handledMouseRef.current = null;
          handledMouseTimeoutRef.current = null;
        },
        1_000,
      );
    };

    const cancelActiveMapPing = () => {
      if (!activeMapPingIdentityRef.current) {
        return false;
      }

      activeMapPingIdentityRef.current = null;
      onMapPingCancel?.();
      return true;
    };

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

        if (hotkeyAction === "invite-all" && canEnqueueReadyRoomInvitations()) {
          void enqueueReadyRoomInvitations().catch((error: unknown) => {
            console.warn("Failed to resolve party invitations", error);
          });
          return true;
        }

        if (hotkeyAction === "map-ping") {
          if (event instanceof KeyboardEvent && event.repeat) {
            return activeMapPingIdentityRef.current !== null;
          }

          const handled = onMapPingStart?.(event) ?? false;
          if (handled) {
            activeMapPingIdentityRef.current =
              createMapPingPressIdentity(event);
          }
          return handled || activeMapPingIdentityRef.current !== null;
        }

        return false;
      }

      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && cancelActiveMapPing()) {
        event.preventDefault();
        return;
      }
      if (isEditableElementActive()) return;
      if (executeAction(event)) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const activeIdentity = activeMapPingIdentityRef.current;
      if (
        !activeIdentity ||
        activeIdentity.kind !== "keyboard" ||
        !isSameMapPingPressIdentity(
          activeIdentity,
          createMapPingPressIdentity(event),
        )
      ) {
        return;
      }

      activeMapPingIdentityRef.current = null;
      onMapPingEnd?.(event);
      event.preventDefault();
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
      if (matchingAction[0] !== "map-ping") {
        rememberHandledMouse(event);
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      const activeIdentity = activeMapPingIdentityRef.current;
      if (
        !activeIdentity ||
        activeIdentity.kind !== "mouse" ||
        !isSameMapPingPressIdentity(
          activeIdentity,
          createMapPingPressIdentity(event),
        )
      ) {
        return;
      }

      activeMapPingIdentityRef.current = null;
      onMapPingEnd?.(event);
      event.preventDefault();
      rememberHandledMouse(event);
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

    const removeListeners = [
      addMeasuredEventListener(
        window,
        "keydown",
        handleKeyDown as EventListener,
        "hotkeys.keydown",
      ),
      addMeasuredEventListener(
        window,
        "keyup",
        handleKeyUp as EventListener,
        "hotkeys.keyup",
      ),
      addMeasuredEventListener(
        window,
        "mousedown",
        handleMouseDown as EventListener,
        "hotkeys.mousedown",
      ),
      addMeasuredEventListener(
        window,
        "mouseup",
        handleMouseUp as EventListener,
        "hotkeys.mouseup",
      ),
      addMeasuredEventListener(
        window,
        "auxclick",
        suppressHandledMouseEvent as EventListener,
        "hotkeys.auxclick",
      ),
      addMeasuredEventListener(
        window,
        "blur",
        cancelActiveMapPing as EventListener,
        "hotkeys.blur",
      ),
    ];
    return () => {
      cancelActiveMapPing();
      for (const removeListener of removeListeners) removeListener();
      if (handledMouseTimeoutRef.current !== null) {
        window.clearTimeout(handledMouseTimeoutRef.current);
        handledMouseTimeoutRef.current = null;
      }
    };
  }, [bindings, onMapPingCancel, onMapPingEnd, onMapPingStart, toggleOpen]);

  return null;
};
