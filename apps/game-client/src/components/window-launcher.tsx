import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { useWindowDisplayPosition } from "@/components/draggable-window/use-window-display-position";
import { useWindowViewport } from "@/hooks/ui/window-viewport";
import { useWindowsStore } from "@/store/windows.store";

type WindowLauncherProps = {
  icon: LucideIcon;
  label: string;
  onOpen: () => void;
  /**
   * The quick access bar is on screen too, so the launcher sits next to it
   * instead of on it.
   */
  besideQuickAccess?: boolean;
};

const LAUNCHER_HEIGHT = 32;

const LAUNCHER_GAP = 8;

/**
 * The way back to a dismissed window that stands in for the overlay, such as
 * the login or error window. It sits where the player keeps the quick access
 * bar and shares a window's frame, so it reads as the same Lootlog entry point.
 */
export const WindowLauncher: FC<WindowLauncherProps> = ({
  icon: Icon,
  label,
  onOpen,
  besideQuickAccess = false,
}) => {
  const viewport = useWindowViewport();

  const quickAccessSize = useWindowsStore(
    (state) => state["quick-access"].size,
  );

  // The same place, default and viewport clamp the quick access bar gets.
  const position = useWindowDisplayPosition("quick-access", quickAccessSize);
  let top = position.y;

  if (besideQuickAccess) {
    const below = position.y + quickAccessSize.height + LAUNCHER_GAP;

    top =
      below + LAUNCHER_HEIGHT <= viewport.height
        ? below
        : Math.max(0, position.y - LAUNCHER_GAP - LAUNCHER_HEIGHT);
  }

  return (
    <button
      type="button"
      className="ll-custom-cursor-pointer ll:pointer-events-auto ll:absolute ll:inline-flex ll:h-8 ll:items-center ll:gap-1.5 ll:rounded-lg ll:border ll:border-white/50 ll:bg-black/75 ll:px-2.5 ll:text-xs ll:text-white ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)] ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-black ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
      style={{ left: position.x, top }}
      onClick={(event) => {
        // The overlay sits above Margonem; a click here must not reach the game.
        event.stopPropagation();
        onOpen();
      }}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
};
