import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import type { ReactNode } from "react";

type BattlePanelMobileFiltersDrawerProps = {
  children: ReactNode;
  contentClassName?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export const BattlePanelMobileFiltersDrawer = ({
  children,
  contentClassName,
  onOpenChange,
  open,
  title,
}: BattlePanelMobileFiltersDrawerProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex h-[85vh] max-h-[85vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="shrink-0 border-b px-4 py-3">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className={cn("p-4", contentClassName)}>{children}</div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
