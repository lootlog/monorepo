import type { ReactNode, WheelEvent } from "react";
import { TabsList } from "@lootlog/ui/components/tabs";
import { cn } from "cn";

interface EventScrollableTabsListProps {
  children: ReactNode;
  className?: string;
}

export const EventScrollableTabsList = ({
  children,
  className,
}: EventScrollableTabsListProps) => {
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      return;
    }

    const scrollContainer = event.currentTarget;
    const hasHorizontalOverflow =
      scrollContainer.scrollWidth > scrollContainer.clientWidth;

    if (!hasHorizontalOverflow) {
      return;
    }

    const horizontalDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (horizontalDelta === 0) {
      return;
    }

    scrollContainer.scrollLeft += horizontalDelta;
    event.preventDefault();
  };

  return (
    <div
      className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      onWheel={handleWheel}
    >
      <TabsList
        className={cn(
          "grid h-auto min-w-full w-max grid-flow-col auto-cols-[minmax(max-content,1fr)] gap-1 bg-muted/50 p-1",
          className,
        )}
      >
        {children}
      </TabsList>
    </div>
  );
};
