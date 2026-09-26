import { GripVertical } from "lucide-react";
import type { FC } from "react";
import { ConnectionStatus } from "@/features/quick-access/components/connection-status";
import { QuickAccessCollapseButton } from "@/features/quick-access/components/quick-access-collapse-button";
import { useWindowsStore } from "@/store/windows.store";

/**
 * The collapsed quick access bar: connection state and the expand button.
 * Both are buttons, so an unlocked bar leads with a grip to drag it by.
 */
export const QuickAccessCollapsedBar: FC = () => {
  const locked = useWindowsStore((state) => state["quick-access"].locked);

  return (
    <div className="ll:flex ll:items-center">
      {locked ? null : (
        <span
          aria-hidden="true"
          className="ll:flex ll:h-6 ll:w-4 ll:cursor-grab ll:items-center ll:justify-center ll:text-gray-400"
        >
          <GripVertical className="ll:size-4" />
        </span>
      )}
      <ConnectionStatus showPing={false} />
      <QuickAccessCollapseButton collapsed />
    </div>
  );
};
