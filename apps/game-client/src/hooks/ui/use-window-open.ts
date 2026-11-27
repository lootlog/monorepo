import { isMobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import { useMobileUiStore } from "@/store/mobile-ui.store";
import { useWindowsStore, type WindowId } from "@/store/windows.store";

export const useWindowOpen = (windowId: WindowId): boolean => {
  const { isMobile } = useMobileMode();
  const desktopOpen = useWindowsStore((state) => state[windowId].open);
  const mobileActivePanel = useMobileUiStore((state) => state.activePanel);

  if (isMobile && isMobilePanelWindowId(windowId)) {
    return mobileActivePanel === windowId;
  }

  return desktopOpen;
};
