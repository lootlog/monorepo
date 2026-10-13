import { useRef, type ComponentProps, type ReactNode } from "react";
import { useHorizontalWheelScroll } from "@lootlog/ui/hooks/use-horizontal-wheel-scroll";
import { TabsList } from "@lootlog/ui/components/tabs";

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
  useHorizontalWheelScroll(viewportRef);

  return (
    <TabsList
      ref={viewportRef}
      aria-label={ariaLabel}
      size={size}
      variant={variant}
      className="grid w-full grid-flow-col auto-cols-[minmax(max-content,1fr)]"
    >
      {children}
    </TabsList>
  );
};
