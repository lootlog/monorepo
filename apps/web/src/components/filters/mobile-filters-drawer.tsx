import { Button } from "@lootlog/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Filter } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@lootlog/ui/lib/utils";

type MobileFiltersDrawerProps = {
  title: string;
  closeLabel?: string;
  children: ReactNode;
  trigger?: "floating" | "inline" | ReactElement | null;
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
  childrenClassName?: string;
};

export const MobileFiltersDrawer = ({
  title,
  closeLabel,
  children,
  trigger = "inline",
  footer,
  open,
  onOpenChange,
  contentClassName,
  childrenClassName,
}: MobileFiltersDrawerProps) => {
  const isPresetTrigger = trigger === "floating" || trigger === "inline";
  const triggerClassName =
    trigger === "floating"
      ? "fixed bottom-4 right-4 size-14 rounded-full shadow-lg z-20"
      : "shrink-0";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger !== null ? (
        <DrawerTrigger
          render={
            isPresetTrigger ? (
              <Button
                variant={trigger === "inline" ? "outline" : undefined}
                size="icon"
                className={triggerClassName}
              >
                <Filter />
              </Button>
            ) : (
              trigger
            )
          }
        />
      ) : null}
      <DrawerContent
        className={cn(
          "flex max-h-[85vh] flex-col overflow-hidden p-0",
          contentClassName,
        )}
      >
        <DrawerHeader className="shrink-0 border-b px-4 py-3">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className={cn("flex flex-col gap-4 p-4", childrenClassName)}>
            {children}
          </div>
        </ScrollArea>
        {footer ? (
          <div className="shrink-0 border-t p-4">{footer}</div>
        ) : closeLabel ? (
          <div className="shrink-0 border-t p-4">
            <DrawerClose
              render={
                <Button variant="outline" className="w-full">
                  {closeLabel}
                </Button>
              }
            />
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
};
