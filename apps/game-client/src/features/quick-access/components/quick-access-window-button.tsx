import type { FC, ReactNode } from "react";
import { QuickAccessButton } from "@/features/quick-access/components/quick-access-button";
import { useHotkeysStore, type HotkeyAction } from "@/store/hotkeys.store";
import { useWindowsStore, type WindowId } from "@/store/windows.store";

export type QuickAccessWindowButtonProps = {
  windowId: WindowId;
  label: string;
  icon: ReactNode;
  /** Hotkey whose binding the tooltip shows next to the label. */
  hotkeyAction?: HotkeyAction;
  /** Something new waits in the window; the label tells what. */
  badge?: { count: number; label: string };
};

/** Toggles one Lootlog window and lights up while that window is open. */
export const QuickAccessWindowButton: FC<QuickAccessWindowButtonProps> = ({
  windowId,
  label,
  icon,
  hotkeyAction,
  badge,
}) => {
  const open = useWindowsStore((state) => state[windowId].open);
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);

  const binding = useHotkeysStore((state) =>
    hotkeyAction ? state.bindings[hotkeyAction] : undefined,
  );

  return (
    <QuickAccessButton
      label={badge ? `${label}. ${badge.label}` : label}
      icon={
        badge ? (
          <span className="ll:relative ll:flex">
            {icon}
            <span
              aria-hidden
              className="ll:absolute ll:-top-1.5 ll:-right-2 ll:min-w-3.5 ll:rounded-full ll:bg-primary ll:px-0.5 ll:text-center ll:text-[9px] ll:font-bold ll:leading-3.5 ll:text-primary-foreground ll:tabular-nums"
            >
              {badge.count > 99 ? "99+" : badge.count}
            </span>
          </span>
        ) : (
          icon
        )
      }
      active={open}
      binding={binding}
      data-ll-window-toggle={windowId}
      onClick={() => toggleOpen(windowId)}
    />
  );
};
