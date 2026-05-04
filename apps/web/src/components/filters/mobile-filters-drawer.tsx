import { Button } from "@lootlog/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { Filter } from "lucide-react";
import type { ReactNode } from "react";

type MobileFiltersDrawerProps = {
  title: string;
  closeLabel: string;
  children: ReactNode;
  trigger?: "floating" | "inline";
};

export const MobileFiltersDrawer = ({
  title,
  closeLabel,
  children,
  trigger = "inline",
}: MobileFiltersDrawerProps) => {
  const triggerClassName =
    trigger === "floating"
      ? "fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-20"
      : "shrink-0";
  const iconClassName = trigger === "floating" ? "h-5 w-5" : "h-4 w-4";

  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button
          variant={trigger === "inline" ? "outline" : undefined}
          size="icon"
          className={triggerClassName}
        >
          <Filter className={iconClassName} />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <DrawerHeader className="mb-4">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto">{children}</div>
        <div className="mt-6">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              {closeLabel}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
