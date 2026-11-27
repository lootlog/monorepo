import { cn } from "cn";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COUNT_BADGE_CLASS_NAME } from "@/components/count-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toolbarStripDividerClassName } from "@/components/ui/toolbar-strip";
import { useAccountOwnedReadyRoom } from "@/features/party-finder/hooks/use-ready-rooms";
import { ConnectionStatus } from "@/features/quick-access/components/connection-status";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import { useQuickAccessItems } from "@/features/quick-access/hooks/use-quick-access-items";
import { SetupChecklistButton } from "@/features/setup-checklist/components/setup-checklist-button";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import type { MobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";

type MobilePanelNavBarProps = {
  activePanel: MobilePanelWindowId;
};

const MOBILE_NAV_LABELS: Partial<Record<WindowId, string>> = {
  timers: "mobile.nav.timers",
  chat: "mobile.nav.chat",
  "online-players": "mobile.nav.onlinePlayers",
  "create-party-gathering": "mobile.nav.partyFinder",
  "hero-sightings": "mobile.nav.heroSightings",
  "global-chat": "mobile.nav.globalChat",
  command: "mobile.nav.command",
  settings: "mobile.nav.settings",
};

export const MobilePanelNavBar = ({ activePanel }: MobilePanelNavBarProps) => {
  const { t } = useTranslation("quickAccess");
  const { t: tPartyFinder } = useTranslation("partyFinder");
  const { buttons } = useQuickAccessItems();
  const readyRoom = useAccountOwnedReadyRoom();
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);

  return (
    <nav
      aria-label={t("mobile.navigation")}
      className="ll:shrink-0 ll:border-0 ll:border-t ll:border-solid ll:border-separator ll:bg-black"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ScrollArea className="ll:w-full" orientation="horizontal">
        <div className="ll:flex ll:w-max ll:min-w-full ll:items-center ll:gap-0.5 ll:px-1 ll:py-1">
          <ConnectionStatus />
          <SetupChecklistButton />
          {readyRoom ? (
            <Button
              type="button"
              variant="taskbar"
              size="sm"
              aria-pressed={activePanel === "party-finder"}
              data-ll-window-toggle="party-finder"
              className="ll:h-9 ll:gap-1.5 ll:px-2.5 ll:text-xs ll:font-semibold"
              onClick={() => toggleOpen("party-finder")}
            >
              <Swords aria-hidden="true" className="ll:size-4" />
              <span>{tPartyFinder("window.title")}</span>
            </Button>
          ) : null}
          {buttons.map((button) => {
            const active = activePanel === button.windowId;
            const shortLabelKey = MOBILE_NAV_LABELS[button.windowId];
            const label = shortLabelKey ? t(shortLabelKey) : button.label;

            return (
              <Button
                key={button.windowId}
                type="button"
                variant="taskbar"
                size="sm"
                aria-label={
                  button.badge
                    ? `${button.label}. ${button.badge.label}`
                    : button.label
                }
                aria-pressed={active}
                data-ll-window-toggle={button.windowId}
                className="ll:relative ll:h-9 ll:gap-1.5 ll:px-2.5 ll:text-xs ll:font-semibold"
                onClick={() => toggleOpen(button.windowId)}
              >
                <span className="ll:relative ll:flex ll:items-center">
                  {button.icon}
                  {button.badge ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        COUNT_BADGE_CLASS_NAME,
                        "ll:absolute ll:-top-1.5 ll:-right-2 ll:ring-1 ll:ring-black/80",
                      )}
                    >
                      {button.badge.count > 99 ? "99+" : button.badge.count}
                    </span>
                  ) : null}
                </span>
                <span>{label}</span>
              </Button>
            );
          })}
          <div
            aria-hidden="true"
            className={`${toolbarStripDividerClassName} ll:mx-1 ll:h-4`}
          />
          <GuildListPopover />
        </div>
      </ScrollArea>
    </nav>
  );
};
