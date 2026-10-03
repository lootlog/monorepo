import { useRef, type ReactNode } from "react";
import { useHorizontalWheelScroll } from "@lootlog/ui/hooks/use-horizontal-wheel-scroll";
import { TabsList } from "@lootlog/ui/components/tabs";

interface EventScrollableTabsListProps {
  ariaLabel: string;
  children: ReactNode;
}

export const EventScrollableTabsList = ({
  ariaLabel,
  children,
}: EventScrollableTabsListProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(viewportRef);

  return (
    <div
      className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      ref={viewportRef}
    >
      <TabsList
        aria-label={ariaLabel}
        className="grid h-auto min-w-full w-max grid-flow-col auto-cols-[minmax(max-content,1fr)] gap-1 bg-muted/50 p-1"
      >
        {children}
      </TabsList>
    </div>
  );
};
