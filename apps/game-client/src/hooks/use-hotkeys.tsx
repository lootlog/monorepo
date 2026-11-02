import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { useHotkeysStore, type HotkeyBinding } from "@/store/hotkeys.store";
import { useEffect, useRef } from "react";
import {
  canEnqueueReadyRoomInvitations,
  enqueueReadyRoomInvitations,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import { toggleCharacterDetectorAutoSend } from "@/features/npc-detector/character-auto-send";
import {
  createPingPressIdentity,
  isSamePingPressIdentity,
  pingInteractionController,
} from "@/features/pings/ping-interaction-controller";

type HotkeyEvent = KeyboardEvent | MouseEvent;

type UseHotkeysOptions = {
  onChatHelp?: () => void;
  onChatPosition?: () => void;
  onPingCancel?: () => void;
  onPingEnd?: (event: HotkeyEvent) => void;
  onPingStart?: (event: HotkeyEvent) => boolean;
};

const ACTION_TO_WINDOW = new Map<string, WindowId>([
  ["toggle-command", "command"],
  ["toggle-chat", "chat"],
  ["toggle-settings", "settings"],
  ["toggle-timers", "timers"],
  ["toggle-online-players", "online-players"],
  ["toggle-quick-access", "quick-access"],
]);

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

const isPingActive = () =>
  pingInteractionController.getActiveIdentity() !== null;

/** The event releases the key or button that holds the active ping. */
const releasesActivePing = (event: HotkeyEvent) => {
  const activeIdentity = pingInteractionController.getActiveIdentity();

  return (
    activeIdentity !== null &&
    isSamePingPressIdentity(activeIdentity, createPingPressIdentity(event))
  );
};

export const useHotkeys = (handlers: UseHotkeysOptions = {}) => {
  // Callers pass fresh callbacks on every render. The listeners read the
  // latest ones through a ref, so a re-render mid-press does not reinstall
  // them and cancel a held ping.
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  const toggleOpen = useWindowsStore((state) => state.toggleOpen);
  const bindings = useHotkeysStore((s) => s.bindings);

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
      handledMouseTimeoutRef.current = window.setTimeout(() => {
        handledMouseRef.current = null;
        handledMouseTimeoutRef.current = null;
      }, 1_000);
    };

    const cancelActivePing = () => {
      if (!isPingActive()) {
        return false;
      }

      handlersRef.current.onPingCancel?.();

      return true;
    };

    const quickActions = new Map<string, () => void>([
      [
        "create-party-gathering",
        () => useWindowsStore.getState().openAndFocus("create-party-gathering"),
      ],
      ["chat-position", () => handlersRef.current.onChatPosition?.()],
      ["chat-help", () => handlersRef.current.onChatHelp?.()],
      [
        "join-party-gathering",
        () => window.dispatchEvent(new Event("lootlog:join-visible-gathering")),
      ],
      ["toggle-detector-auto-send", toggleCharacterDetectorAutoSend],
    ]);

    /**
     * Runs the first binding the event matches, if `allows` lets it run, and
     * returns its action; null when nothing ran.
     */
    const executeAction = (
      event: HotkeyEvent,
      allows: (action: string) => boolean = () => true,
    ): string | null => {
      const match = Object.entries(bindings).find(([, binding]) =>
        matchesBinding(event, binding),
      );

      if (!match || !allows(match[0])) return null;
      const [action] = match;
      const isRepeat = event instanceof KeyboardEvent && event.repeat;
      const quickAction = quickActions.get(action);

      if (quickAction) {
        if (!isRepeat) quickAction();

        return action;
      }

      const windowId = ACTION_TO_WINDOW.get(action);

      if (windowId) {
        toggleOpen(windowId);

        return action;
      }

      if (action === "invite-all" && canEnqueueReadyRoomInvitations()) {
        void enqueueReadyRoomInvitations().catch((cause: unknown) => {
          console.warn("Failed to resolve party invitations", cause);
        });

        return action;
      }

      if (action === "map-ping") {
        const started =
          !isRepeat && (handlersRef.current.onPingStart?.(event) ?? false);

        return started || isPingActive() ? action : null;
      }

      return null;
    };

    // Margonem reads keys from a bubbling document listener and ignores
    // modifiers, so Shift+S would also walk the hero south. This listener runs
    // in the window capture phase and keeps a key it handles from the game.
    const consumeKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    // The settings recorder listens later in the same capture phase; while it
    // records, the key is the new binding, not a hotkey.
    const isRecordingBinding = () =>
      useHotkeysStore.getState().recordingAction !== null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isRecordingBinding()) return;

      if (event.key === "Escape" && cancelActivePing()) {
        consumeKey(event);

        return;
      }

      if (isEditableElementActive()) return;

      if (executeAction(event)) {
        consumeKey(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!releasesActivePing(event)) return;

      handlersRef.current.onPingEnd?.(event);
      event.preventDefault();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (isRecordingBinding()) return;

      // A map ping still starts while a text input keeps focus.
      const action = executeAction(
        event,
        (matched) => matched === "map-ping" || !isEditableElementActive(),
      );

      if (!action) return;

      event.preventDefault();

      if (action !== "map-ping") {
        rememberHandledMouse(event);
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!releasesActivePing(event)) return;

      handlersRef.current.onPingEnd?.(event);
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

    window.addEventListener("keydown", handleKeyDown, true);
    // Focused editors stop key events from bubbling; a held ping must still
    // end on its release.
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("auxclick", suppressHandledMouseEvent);
    window.addEventListener("blur", cancelActivePing);

    return () => {
      cancelActivePing();
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("auxclick", suppressHandledMouseEvent);
      window.removeEventListener("blur", cancelActivePing);

      if (handledMouseTimeoutRef.current !== null) {
        window.clearTimeout(handledMouseTimeoutRef.current);
        handledMouseTimeoutRef.current = null;
      }
    };
  }, [bindings, toggleOpen]);

  return null;
};
