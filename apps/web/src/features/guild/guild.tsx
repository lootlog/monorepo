import { useState } from "react";
import { Timers } from "@/features/guild/components/timers/timers";
import { LootsFilters } from "@/features/guild/components/loots-filters/loots-filters";
import { Filter, TimerIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { LootsList } from "@/features/guild/components/loots-list/loots-list";
import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { Button } from "@lootlog/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@lootlog/ui/components/sheet";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLg } from "@/hooks/ui/use-lg";

export const Guild: React.FC = () => {
  const [timersVisible, setTimersVisible] = useState(false);
  const isMobile = useIsMobile();
  const isLg = useLg();

  const toggleTimers = () => {
    setTimersVisible((prev) => !prev);
  };

  const getTooltipContent = () => {
    return timersVisible ? "Ukryj timery" : "Pokaż timery";
  };

  return (
    <div className="w-full flex flex-row overflow-x-hidden h-full">
      <div className="w-full flex flex-col relative h-full">
        <div className="flex justify-end w-full p-2 items-center gap-4 border-b">
          <WorldSwitcher />
          <span onClick={toggleTimers} className="cursor-pointer">
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <TimerIcon />
                </TooltipTrigger>
                <TooltipContent side="left">
                  {getTooltipContent()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </div>

        {isMobile && (
          <Drawer>
            <DrawerTrigger className="w-full" asChild>
              <div className="p-2 w-full border-b">
                <Button className="w-full">
                  <Filter /> Filtry
                </Button>
              </div>
            </DrawerTrigger>
            <DrawerContent className="">
              <DrawerTitle className="px-4 pt-4 flex items-center justify-center">
                Filtry
              </DrawerTitle>
              <div className="pb-4">
                <LootsFilters />
              </div>
              <DrawerFooter>
                <DrawerClose className="w-full" asChild>
                  <Button variant="default" className="w-full">
                    Zapisz
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
        {!isMobile && <LootsFilters />}
        <LootsList />
      </div>

      {!isLg && (
        <div
          className={cn("w-72 min-w-72 border-l hidden lg:block", {
            "w-0 min-w-0": !timersVisible,
          })}
        >
          {timersVisible && <Timers />}
        </div>
      )}

      {isLg && (
        <Sheet onOpenChange={setTimersVisible} open={timersVisible}>
          <SheetContent className="w-72 p-0">
            <SheetHeader className="p-4">
              <SheetTitle>Timery</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <Timers />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};
