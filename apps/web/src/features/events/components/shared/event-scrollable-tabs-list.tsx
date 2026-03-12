import type { ReactNode } from "react";
import { TabsList } from "@lootlog/ui/components/tabs";
import { cn } from "@lootlog/ui/lib/utils";

interface EventScrollableTabsListProps {
  children: ReactNode;
  className?: string;
}

export const EventScrollableTabsList = ({
  children,
  className,
}: EventScrollableTabsListProps) => (
  <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
    <TabsList
      className={cn(
        "h-auto min-w-max justify-start gap-1 bg-muted/50 p-1",
        className,
      )}
    >
      {children}
    </TabsList>
  </div>
);
