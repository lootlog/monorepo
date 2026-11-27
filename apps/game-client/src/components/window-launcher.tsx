import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { useWindowDisplayPosition } from "@/components/draggable-window/use-window-display-position";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import { useWindowViewport } from "@/hooks/ui/window-viewport";
import { useWindowsStore } from "@/store/windows.store";

type WindowLauncherProps = {
  icon: LucideIcon;
  label: string;
  onOpen: () => void;
  besideQuickAccess?: boolean;
};

const LAUNCHER_HEIGHT = 32;

const LAUNCHER_GAP = 8;

export const WindowLauncher: FC<WindowLauncherProps> = ({
  icon: Icon,
  label,
  onOpen,
  besideQuickAccess = false,
}) => {
  const { isMobile } = useMobileMode();
  const viewport = useWindowViewport();

  const quickAccessSize = useWindowsStore(
    (state) => state["quick-access"].size,
  );

  const position = useWindowDisplayPosition("quick-access", quickAccessSize);

  if (isMobile) {
    return (
      <button
        type="button"
        className="ll-custom-cursor-pointer ll:pointer-events-auto ll:fixed ll:z-[400] ll:inline-flex ll:h-10 ll:items-center ll:gap-1.5 ll:rounded-lg ll:border ll:border-white/50 ll:bg-black/85 ll:px-3 ll:text-xs ll:font-semibold ll:text-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)] ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-black ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
        style={{
          left: "max(12px, env(safe-area-inset-left, 0px))",
          bottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <Icon size={16} aria-hidden="true" />
        {label}
      </button>
    );
  }

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
      className="ll-custom-cursor-pointer ll:pointer-events-auto ll:absolute ll:inline-flex ll:h-8 ll:items-center ll:gap-1.5 ll:rounded-lg ll:border ll:border-white/50 ll:bg-black/75 ll:px-2.5 ll:text-xs ll:text-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)] ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-black ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
      style={{ left: position.x, top }}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
};
