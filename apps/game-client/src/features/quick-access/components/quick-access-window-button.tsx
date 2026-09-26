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
};

/** Toggles one Lootlog window and lights up while that window is open. */
export const QuickAccessWindowButton: FC<QuickAccessWindowButtonProps> = ({
  windowId,
  label,
  icon,
  hotkeyAction,
}) => {
  const open = useWindowsStore((state) => state[windowId].open);
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);

  const binding = useHotkeysStore((state) =>
    hotkeyAction ? state.bindings[hotkeyAction] : undefined,
  );

  return (
    <QuickAccessButton
      label={label}
      icon={icon}
      active={open}
      binding={binding}
      data-ll-window-toggle={windowId}
      onClick={() => toggleOpen(windowId)}
    />
  );
};
