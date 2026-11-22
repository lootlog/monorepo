import { useShallow } from "zustand/react/shallow";
import {
  clampToViewport,
  useWindowViewport,
  type WindowPosition,
  type WindowSize,
} from "@/hooks/ui/window-viewport";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { resolveDefaultWindowPosition } from "./window-default-placement";

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
