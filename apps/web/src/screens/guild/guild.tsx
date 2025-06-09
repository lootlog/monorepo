import { PageHeader } from "@/components/layout/page-header";
import { useState } from "react";
import { Timers } from "@/screens/guild/components/timers/timers";
import { LootsFilters } from "@/screens/guild/components/loots-filters/loots-filters";
import { Filter, TimerIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LootsList } from "@/screens/guild/components/loots-list/loots-list";
import { useTimers } from "@/hooks/api/use-timers";
import { noop } from "lodash";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@/hooks/use-mobile";
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
} from "@/components/ui/sheet";
import { useLg } from "@/hooks/use-lg";

export const Guild: React.FC = () => {
  const [timersVisible, setTimersVisible] = useState(false);
  const { data: timers } = useTimers();
  const isMobile = useIsMobile();
  const isLg = useLg();

  const toggleTimers = () => {
    setTimersVisible((prev) => !prev);
  };

  const getTooltipContent = () => {
    if (timersVisible && timers?.length) {
      return "Ukryj timery";
    }
    if (!timersVisible && timers?.length) {
      return "Pokaż timery";
    }

    return "Brak timerów";
  };

  return (
    <div className="flex flex-col">
      <PageHeader>
        <SidebarTrigger />
        <div className="flex justify-between w-full pl-2 items-center">
          <div className="flex flex-row items-center gap-4">
            <h1 className="font-semibold text-xl p-0">Lootlog</h1>
            <WorldSwitcher />
          </div>
          <div className="flex flex-row gap-4 items-center justify-end">
            <span
              onClick={timers?.length ? toggleTimers : noop}
              className="cursor-pointer"
            >
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
        </div>
      </PageHeader>
      <div className="w-full flex flex-row overflow-x-hidden">
        <div className="w-full h-[calc(100dvh_-_64px)] flex flex-col relative">
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
              "w-0 min-w-0": !timersVisible || !timers?.length,
            })}
          >
            {timersVisible && timers?.length && <Timers />}
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
    </div>
  );
};
