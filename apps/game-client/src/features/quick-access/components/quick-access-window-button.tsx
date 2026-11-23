import type { FC, ReactNode } from "react";
import { QuickAccessButton } from "@/features/quick-access/components/quick-access-button";
import { useCountBump } from "@/hooks/ui/use-count-bump";
import { useHotkeysStore, type HotkeyAction } from "@/store/hotkeys.store";
import { useWindowsStore, type WindowId } from "@/store/windows.store";

export type QuickAccessWindowButtonProps = {
  windowId: WindowId;
  label: string;
  icon: ReactNode;
  hotkeyAction?: HotkeyAction;
  badge?: { count: number; label: string };
};

export const QuickAccessWindowButton: FC<QuickAccessWindowButtonProps> = ({
  windowId,
  label,
  icon,
  hotkeyAction,
  badge,
}) => {
  const open = useWindowsStore((state) => state[windowId].open);
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);

  const badgeRef = useCountBump<HTMLSpanElement>(badge?.count ?? 0);

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
              ref={badgeRef}
              key={badge.count}
              aria-hidden
              className="ll:absolute ll:-top-1 ll:-right-2 ll:min-w-3.5 ll:rounded-full ll:bg-amber-400 ll:px-0.5 ll:text-center ll:text-[9px] ll:font-bold ll:leading-3.5 ll:text-amber-950 ll:tabular-nums ll:ring-1 ll:ring-black/80"
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
