import type { MobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";
import { useMobileUiStore } from "./mobile-ui.store";
import type { WindowPayload, WindowsState } from "./windows.store";

export const syncMobilePanelOpen = (
  state: WindowsState,
  key: MobilePanelWindowId,
  open: boolean,
  windowState: WindowPayload | undefined,
): Partial<WindowsState> | null => {
  const mobileStore = useMobileUiStore.getState();

  if (open) {
    mobileStore.openPanel(key);
  } else if (mobileStore.activePanel === key) {
    mobileStore.closePanel();
  }

  const currentWindow = state[key];

  const hasSameWindowState =
    windowState === undefined ||
    ("state" in currentWindow && Object.is(currentWindow.state, windowState));

  const nextFocusRequest =
    !open && state.focusRequest?.windowId === key
      ? undefined
      : state.focusRequest;

  const shouldCloseCommand = open && state.command.open;

  if (
    hasSameWindowState &&
    state.focusRequest === nextFocusRequest &&
    !shouldCloseCommand
  ) {
    return null;
  }

  const patch: Partial<WindowsState> = {
    focusRequest: nextFocusRequest,
  };

  if (shouldCloseCommand) {
    patch.command = { ...state.command, open: false };
  }

  if (!hasSameWindowState && key === "settings") {
    patch.settings = { ...state.settings, state: windowState };
  }

  return patch;
};
