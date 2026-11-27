import { MessageSquareText, MessagesSquare, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { MobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";
import { useWindowsStore } from "@/store/windows.store";
import { MobileMoreMenu } from "./mobile-more-menu";
import { MOBILE_NAV_BUTTON_CLASS_NAME } from "./mobile-nav-button";

type MobilePanelNavBarProps = {
  activePanel: MobilePanelWindowId;
};

export const MobilePanelNavBar = ({ activePanel }: MobilePanelNavBarProps) => {
  const { t } = useTranslation("quickAccess");
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);

  return (
    <nav
      aria-label={t("mobile.navigation")}
      className="ll:grid ll:shrink-0 ll:grid-cols-4 ll:border-0 ll:border-t ll:border-solid ll:border-separator ll:bg-black"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Button
        type="button"
        variant="taskbar"
        size="sm"
        aria-pressed={activePanel === "timers"}
        data-ll-window-toggle="timers"
        className={MOBILE_NAV_BUTTON_CLASS_NAME}
        onClick={() => toggleOpen("timers")}
      >
        <Timer aria-hidden="true" className="ll:size-5" />
        <span className="ll:truncate">{t("mobile.nav.timers")}</span>
      </Button>
      <Button
        type="button"
        variant="taskbar"
        size="sm"
        aria-pressed={activePanel === "chat"}
        data-ll-window-toggle="chat"
        className={MOBILE_NAV_BUTTON_CLASS_NAME}
        onClick={() => toggleOpen("chat")}
      >
        <MessagesSquare aria-hidden="true" className="ll:size-5" />
        <span className="ll:truncate">{t("mobile.nav.chat")}</span>
      </Button>
      <Button
        type="button"
        variant="taskbar"
        size="sm"
        data-ll-window-toggle="command"
        className={MOBILE_NAV_BUTTON_CLASS_NAME}
        onClick={() => toggleOpen("command")}
      >
        <MessageSquareText aria-hidden="true" className="ll:size-5" />
        <span className="ll:truncate">{t("mobile.nav.command")}</span>
      </Button>
      <MobileMoreMenu activePanel={activePanel} triggerVariant="bar" />
    </nav>
  );
};
