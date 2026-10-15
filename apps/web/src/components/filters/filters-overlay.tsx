import { FiltersPanel } from "./filters-panel";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { Sheet, SheetContent, SheetTitle } from "@lootlog/ui/components/sheet";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FiltersOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  activeFilterCount: number;
  /** Clears every filter from the header while any is active. */
  onClear?: () => void;
  children: ReactNode;
};

/**
 * The filters of a page too narrow to list them in its filter bar, styled
 * like the loot filters panel: a drawer from the bottom edge on phones and a
 * sheet from the right edge on wider screens.
 */
export const FiltersOverlay = ({
  open,
  onOpenChange,
  ...panelProps
}: FiltersOverlayProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[92dvh] flex-col overflow-hidden bg-sidebar p-0">
          <FiltersPanel
            {...panelProps}
            titleAs={DrawerTitle}
            hasCloseButton={false}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        closeLabel={t("common.close")}
        className="w-[min(400px,calc(100vw-12px))] gap-0 border-sidebar-border bg-sidebar p-0 sm:max-w-[400px]"
      >
        <FiltersPanel {...panelProps} titleAs={SheetTitle} hasCloseButton />
      </SheetContent>
    </Sheet>
  );
};
