import { cn } from "cn";
import { Ellipsis, Swords } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  CONNECTION_STATUS_TONE,
  CONNECTION_TONE_DOT_CLASS_NAME,
  SIGNED_OUT_CONNECTION_TONE,
} from "@/components/connection-status-tone";
import { COUNT_BADGE_CLASS_NAME } from "@/components/count-badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSocket } from "@/contexts/socket-context";
import { useAccountOwnedReadyRoom } from "@/features/party-finder/hooks/use-ready-rooms";
import { ConnectionStatus } from "@/features/quick-access/components/connection-status";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import { useQuickAccessItems } from "@/features/quick-access/hooks/use-quick-access-items";
import { SetupChecklistButton } from "@/features/setup-checklist/components/setup-checklist-button";
import { useSignInRequired } from "@/hooks/auth/use-login-state";
import { useCountBump } from "@/hooks/ui/use-count-bump";
import type { MobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";
import { useWindowsStore, type WindowId } from "@/store/windows.store";

const SECONDARY_WINDOW_IDS = new Set<WindowId>([
  "online-players",
  "hero-sightings",
  "create-party-gathering",
  "global-chat",
  "settings",
]);

const SECONDARY_ORDER: readonly WindowId[] = [
  "online-players",
  "hero-sightings",
  "create-party-gathering",
  "global-chat",
  "settings",
];

type MobileMoreMenuProps = {
  activePanel: MobilePanelWindowId | null;
  triggerVariant: "pill" | "bar";
  label?: string;
};

const renderMenuBadge = (count: number): ReactNode =>
  count > 0 ? (
    <span
      aria-hidden="true"
      className={cn(COUNT_BADGE_CLASS_NAME, "ll:ml-auto")}
    >
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

export const MobileMoreMenu = ({
  activePanel,
  triggerVariant,
  label,
}: MobileMoreMenuProps) => {
  const { t } = useTranslation("quickAccess");
  const { t: tPartyFinder } = useTranslation("partyFinder");
  const [open, setOpen] = useState(false);
  const { status } = useSocket();
  const signedOut = useSignInRequired();
  const { buttons, totalBadgeCount } = useQuickAccessItems();
  const readyRoom = useAccountOwnedReadyRoom();
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const badgeRef = useCountBump<HTMLSpanElement>(totalBadgeCount);

  const secondaryButtons = SECONDARY_ORDER.flatMap((windowId) => {
    const match = buttons.find((button) => button.windowId === windowId);

    return match ? [match] : [];
  });

  const isSecondaryActive =
    activePanel !== null &&
    (activePanel === "party-finder" || SECONDARY_WINDOW_IDS.has(activePanel));

  const statusDotClassName =
    CONNECTION_TONE_DOT_CLASS_NAME[
      signedOut ? SIGNED_OUT_CONNECTION_TONE : CONNECTION_STATUS_TONE[status]
    ];

  const handleOpenWindow = (windowId: WindowId) => {
    setOpen(false);
    openAndFocus(windowId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="taskbar"
          size="sm"
          data-ll-draggable="false"
          aria-label={label ?? t("mobile.moreMenu")}
          aria-pressed={isSecondaryActive}
          className={
            triggerVariant === "bar"
              ? "ll:relative ll:h-10 ll:w-full ll:gap-1.5 ll:rounded-none ll:px-1.5 ll:text-xs ll:font-semibold"
              : "ll:relative ll:h-10 ll:w-10 ll:rounded-r-lg ll:rounded-l-none ll:px-0"
          }
        >
          <span className="ll:relative ll:flex ll:items-center">
            <Ellipsis aria-hidden="true" className="ll:size-4" />
            <span
              aria-hidden="true"
              className={cn(
                "ll:absolute ll:-top-1 ll:-left-1 ll:size-1.5 ll:rounded-full ll:ring-1 ll:ring-black",
                statusDotClassName,
              )}
            />
            {totalBadgeCount > 0 ? (
              <span
                ref={badgeRef}
                key={totalBadgeCount}
                aria-hidden="true"
                className={cn(
                  COUNT_BADGE_CLASS_NAME,
                  "ll:absolute ll:-top-1.5 ll:-right-2.5 ll:ring-1 ll:ring-black/80",
                )}
              >
                {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
              </span>
            ) : null}
          </span>
          {triggerVariant === "bar" ? (
            <span className="ll:truncate">{t("mobile.more")}</span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="ll-action-menu ll:w-56 ll:overflow-hidden ll:p-0"
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="ll:flex ll:items-center ll:justify-between ll:gap-1 ll:border-0 ll:border-b ll:border-solid ll:border-separator ll:bg-white/[0.03] ll:px-1.5 ll:py-1">
          <div className="ll:flex ll:items-center ll:gap-0.5">
            <ConnectionStatus />
            <SetupChecklistButton />
          </div>
          <GuildListPopover />
        </div>
        <div className="ll:flex ll:flex-col">
          {readyRoom ? (
            <Button
              type="button"
              size="xs"
              variant="menu"
              aria-pressed={activePanel === "party-finder"}
              data-ll-window-toggle="party-finder"
              className={cn(
                "ll:w-full ll:gap-2",
                activePanel === "party-finder" && "ll:text-selected",
              )}
              onClick={() => handleOpenWindow("party-finder")}
            >
              <Swords aria-hidden="true" className="ll:size-4" />
              <span className="ll:truncate">
                {tPartyFinder("window.title")}
              </span>
            </Button>
          ) : null}
          {secondaryButtons.map((button) => {
            const active = activePanel === button.windowId;

            return (
              <Button
                key={button.windowId}
                type="button"
                size="xs"
                variant="menu"
                aria-pressed={active}
                data-ll-window-toggle={button.windowId}
                className={cn(
                  "ll:w-full ll:gap-2",
                  active && "ll:text-selected",
                )}
                onClick={() => handleOpenWindow(button.windowId)}
              >
                {button.icon}
                <span className="ll:truncate">{button.label}</span>
                {button.badge ? renderMenuBadge(button.badge.count) : null}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
