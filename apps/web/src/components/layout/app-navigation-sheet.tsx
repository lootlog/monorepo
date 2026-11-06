import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type AppNavigationSheetProps = {
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * The phone navigation behind the tab bar's "More": a sheet that rises from
 * the bar it was opened from and swipes back down, as iOS sheets do, instead
 * of a drawer from the opposite edge.
 */
export const AppNavigationSheet = ({
  children,
  footer,
}: AppNavigationSheetProps) => {
  const { t } = useTranslation();
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <Drawer open={openMobile} onOpenChange={setOpenMobile}>
      <DrawerContent
        data-sidebar="sidebar"
        data-mobile="true"
        // Recedes while the account sheet is stacked over it.
        className="bg-sidebar text-sidebar-foreground data-nested-drawer-open:brightness-60"
      >
        <DrawerTitle className="sr-only">
          {t("layout.navigation.tabBar.more")}
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          {t("common.uiLabels.sidebarDescription")}
        </DrawerDescription>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
            {footer}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
