import { cn } from "cn";
import { useEffect, type ReactNode } from "react";
import { MobilePanelNavContext } from "@/components/draggable-window/mobile-panel-nav-context";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import { MOBILE_ALERT_STACK_ID } from "@/lib/mobile-ui/mobile-alert-stack";
import type { MobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";
import { useMobileUiStore } from "@/store/mobile-ui.store";
import { MobilePanelNavBar } from "./mobile-panel-nav-bar";

const MOBILE_ROOT_CLASS_NAME = "ll-mobile";

const renderMobilePanelNav = (activePanel: MobilePanelWindowId) => (
  <MobilePanelNavBar activePanel={activePanel} />
);

export const MobileUiShell = ({ children }: { children?: ReactNode }) => {
  const { isMobile, orientation } = useMobileMode();
  const hasOpenPanel = useMobileUiStore((state) => state.activePanel !== null);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- toggles the ll-mobile class on the external #lootlog-root host element
  useEffect(() => {
    const root = document.getElementById("lootlog-root");

    if (!root) return;

    root.classList.toggle(MOBILE_ROOT_CLASS_NAME, isMobile);

    return () => {
      root.classList.remove(MOBILE_ROOT_CLASS_NAME);
    };
  }, [isMobile]);

  return (
    <MobilePanelNavContext.Provider value={renderMobilePanelNav}>
      {isMobile ? (
        <div
          id={MOBILE_ALERT_STACK_ID}
          data-ll-mobile-alert-stack=""
          className={cn(
            "ll:pointer-events-none ll:fixed ll:z-[420] ll:flex ll:flex-col ll:gap-1.5",
            orientation === "portrait"
              ? "ll:inset-x-2"
              : hasOpenPanel
                ? "ll:left-2 ll:right-[calc(min(380px,56dvw)+8px)]"
                : "ll:left-1/2 ll:w-[min(440px,calc(100dvw-16px))] ll:-translate-x-1/2",
          )}
          style={{
            top: "max(8px, env(safe-area-inset-top, 0px))",
          }}
        />
      ) : null}
      {children}
    </MobilePanelNavContext.Provider>
  );
};
