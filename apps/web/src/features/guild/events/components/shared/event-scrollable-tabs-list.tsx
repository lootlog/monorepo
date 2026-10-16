import { useRef, type ComponentProps, type ReactNode } from "react";
import { useHorizontalWheelScroll } from "@lootlog/ui/hooks/use-horizontal-wheel-scroll";
import { TabsList } from "@lootlog/ui/components/tabs";
import { useInFilterBar } from "@lootlog/ui/components/filter-bar-context";

interface EventScrollableTabsListProps {
  ariaLabel: string;
  size: ComponentProps<typeof TabsList>["size"];
  variant?: ComponentProps<typeof TabsList>["variant"];
  children: ReactNode;
}

export const EventScrollableTabsList = ({
  ariaLabel,
  size,
  variant,
  children,
}: EventScrollableTabsListProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const inFilterBar = useInFilterBar();
  useHorizontalWheelScroll(viewportRef);

  return (
    <TabsList
      ref={viewportRef}
      aria-label={ariaLabel}
      size={size}
      variant={variant}
      // Chips in a filter bar keep their own width; a strip shares the row.
      className={
        inFilterBar
          ? undefined
          : "grid w-full grid-flow-col auto-cols-[minmax(max-content,1fr)]"
      }
    >
      {children}
    </TabsList>
  );
};
