import type { ReactNode } from "react";
import { cn } from "@lootlog/ui/lib/utils";

interface AppLayoutFrameProps {
  children: ReactNode;
  className?: string;
  dataSlot?: string;
}

export const AppLayoutFrame = ({
  children,
  className,
  dataSlot = "app-layout-frame",
}: AppLayoutFrameProps) => (
  <div
    data-slot={dataSlot}
    className={cn(
      "flex h-full min-h-0 min-w-0 max-h-full flex-row overflow-hidden",
      className,
    )}
  >
    {children}
  </div>
);
