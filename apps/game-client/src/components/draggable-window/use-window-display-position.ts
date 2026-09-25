import { useShallow } from "zustand/react/shallow";
import {
  clampToViewport,
  useWindowViewport,
  type WindowPosition,
  type WindowSize,
} from "@/hooks/ui/window-viewport";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { resolveDefaultWindowPosition } from "./window-default-placement";

/**
 * Where a window is drawn now. Only a drag or another explicit action saves a
 * position. Until then the window sits at its viewport-relative default, and
 * whatever is saved is clamped for display only, so a briefly smaller browser
 * never rewrites it and a locked window can never be stranded off-screen.
 */
export const useWindowDisplayPosition = (
  id: WindowId,
  size: WindowSize,
): WindowPosition => {
  const viewport = useWindowViewport();

  const savedPosition = useWindowsStore(
    useShallow((state) =>
      state[id].hasDefinedPosition
        ? state[id].position
        : resolveDefaultWindowPosition(
            id,
            (windowId) => (windowId === id ? size : state[windowId].size),
            viewport,
          ),
    ),
  );

  return clampToViewport(savedPosition, size, viewport);
};
