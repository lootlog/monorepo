import type { FC, ReactNode } from "react";
import { QuickAccessButton } from "@/features/quick-access/components/quick-access-button";
import { useWindowsStore, type WindowId } from "@/store/windows.store";

type QuickAccessReopenButtonProps = {
  windowId: WindowId;
  /** Names the window and the entry count, which the badge only shows. */
  label: string;
  icon: ReactNode;
  count: number;
};

const MAX_BADGE_COUNT = 99;

/**
 * The way back to a window that keeps its entries after the player closed it
 * (the NPC detector, notifications). Rendered only while that window is
 * closed; shows nothing once the entries are gone.
 */
export const QuickAccessReopenButton: FC<QuickAccessReopenButtonProps> = ({
  windowId,
  label,
  icon,
  count,
}) => {
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);

  if (count === 0) return null;

  return (
    <QuickAccessButton
      label={label}
      className="ll:relative"
      icon=<>
        {icon}
        <span
          aria-hidden="true"
          className="ll:absolute ll:-top-0.5 ll:-right-0.5 ll:flex ll:h-3.5 ll:min-w-3.5 ll:items-center ll:justify-center ll:rounded-full ll:bg-red-600 ll:px-0.5 ll:text-[10px] ll:font-bold ll:leading-none ll:text-white ll:tabular-nums"
        >
          {count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count}
        </span>
      </>
      onClick={() => openAndFocus(windowId)}
    />
  );
};
