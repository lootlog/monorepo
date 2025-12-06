import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useSelectorPanel } from "./selector-panel-context";

export type SelectorPanelProps<T> = {
  header?: ReactNode;
  searchBar?: ReactNode;
  listContent: ReactNode;
  panelContent: ReactNode;
  emptyState?: ReactNode;
  mobileDrawerTitle?: (item: T) => ReactNode;
  listClassName?: string;
  panelClassName?: string;
};

export function SelectorPanel<T>({
  header,
  searchBar,
  listContent,
  panelContent,
  emptyState,
  mobileDrawerTitle,
  listClassName,
  panelClassName,
}: SelectorPanelProps<T>) {
  const {
    selectedItem,
    setSelectedItem,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    isMobile,
  } = useSelectorPanel<T>();

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileDrawerOpen}
          onOpenChange={(open) => {
            setIsMobileDrawerOpen(open);
            if (!open) setSelectedItem(null);
          }}
          shouldScaleBackground={false}
        >
          <DrawerContent className="p-0 h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
            <DrawerHeader className="border-b px-4 py-3 pt-5 shrink-0">
              <DrawerTitle className="flex items-center justify-center gap-3">
                {selectedItem && mobileDrawerTitle?.(selectedItem)}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              {selectedItem && panelContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        {header}
        {searchBar}

        <div className="flex-1 flex min-h-0 overflow-hidden bg-background/50">
          <div
            className={cn(
              "flex flex-col h-full min-w-0 overflow-hidden",
              !isMobile && selectedItem
                ? "w-1/3 min-w-[220px] max-w-[350px] border-r"
                : "flex-1",
              listClassName,
            )}
          >
            <ScrollArea className="flex-1 h-full">
              <div className="p-3 space-y-1.5">
                {listContent}
                {emptyState}
              </div>
            </ScrollArea>
          </div>

          {!isMobile && selectedItem && (
            <div className={cn("h-full flex-1 min-w-0", panelClassName)}>
              <div className="h-full min-w-[400px]">{panelContent}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
