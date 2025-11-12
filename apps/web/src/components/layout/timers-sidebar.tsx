import { Timers } from "@/features/guild/components/timers/timers";
import { Sheet, SheetContent } from "@lootlog/ui/components/sheet";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "@/utils/cn";
import type { FC } from "react";

interface TimersSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TimersSidebar: FC<TimersSidebarProps> = ({
  open,
  onOpenChange,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <div className="h-14 border-b flex items-center justify-center text-sm font-semibold shrink-0">
            Timery
          </div>
          <ScrollArea className="flex-1 h-0">
            <Timers />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <div
        className={cn(
          "w-80 transition-[width] duration-200 ease-linear shrink-0",
          !open && "w-0",
        )}
      />
      <div
        className={cn(
          "fixed right-0 top-0 h-screen w-80 bg-background border-l transition-[right] duration-200 ease-linear z-10 flex flex-col",
          !open && "right-[-320px]",
        )}
      >
        <div className="h-14 border-b flex items-center justify-center text-sm font-semibold shrink-0">
          Timery
        </div>
        <ScrollArea className="flex-1 h-0">
          <Timers />
        </ScrollArea>
      </div>
    </>
  );
};
