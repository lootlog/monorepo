import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toolbarStripDividerClassName } from "@/components/ui/toolbar-strip";
import { MobileQuickAccessPill } from "@/features/mobile-ui/mobile-quick-access-pill";
import { ConnectionStatus } from "@/features/quick-access/components/connection-status";
import { QuickAccessCollapseButton } from "@/features/quick-access/components/quick-access-collapse-button";
import { QuickAccessCollapsedBar } from "@/features/quick-access/components/quick-access-collapsed-bar";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import { SetupChecklistButton } from "@/features/setup-checklist/components/setup-checklist-button";
import { WhatsNewQuickAccessButton } from "@/features/settings/components/whats-new/whats-new-quick-access-button";
import { QuickAccessWindowButton } from "@/features/quick-access/components/quick-access-window-button";
import { useQuickAccessItems } from "@/features/quick-access/hooks/use-quick-access-items";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import { useWindowsStore } from "@/store/windows.store";
import { useTranslation } from "react-i18next";

export const QuickAccess = () => {
  const { t } = useTranslation("quickAccess");
  const { isMobile } = useMobileMode();
  const open = useWindowsStore((state) => state["quick-access"].open);

  const collapsed = useWindowsStore(
    (state) => state["quick-access"].collapsed ?? false,
  );

  const setOpen = useWindowsStore((state) => state.setOpen);
  const { buttons } = useQuickAccessItems();

  if (isMobile) {
    return open ? <MobileQuickAccessPill /> : null;
  }

  if (collapsed) {
    return (
      <DraggableWindow
        isOpen={open}
        id="quick-access"
        title={t("window.title")}
        closable={false}
        collapsed
        disableTitle
        draggableContent
      >
        <QuickAccessCollapsedBar />
      </DraggableWindow>
    );
  }

  return (
    <DraggableWindow
      isOpen={open}
      id="quick-access"
      title={t("window.title")}
      minHeight={56}
      minWidth={250}
      onClose={() => setOpen("quick-access", false)}
      closable={false}
      actions={
        <>
          <ConnectionStatus />
          <QuickAccessCollapseButton collapsed={false} />
        </>
      }
    >
      <ScrollArea
        className="ll:h-full ll:w-full"
        data-ll-quick-access-horizontal-scroll=""
        orientation="horizontal"
      >
        <div className="ll:flex ll:h-full ll:w-max ll:min-w-full ll:items-center ll:gap-0.5 ll:px-0.5">
          <SetupChecklistButton />
          <WhatsNewQuickAccessButton />
          {buttons.map((button) => (
            <QuickAccessWindowButton key={button.windowId} {...button} />
          ))}
          <div
            aria-hidden="true"
            className={`${toolbarStripDividerClassName} ll:mx-1 ll:h-4`}
          />
          <GuildListPopover />
        </div>
      </ScrollArea>
    </DraggableWindow>
  );
};
