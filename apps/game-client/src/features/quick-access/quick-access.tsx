import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toolbarStripDividerClassName } from "@/components/ui/toolbar-strip";
import { ConnectionStatus } from "@/features/quick-access/components/connection-status";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import {
  QuickAccessWindowButton,
  type QuickAccessWindowButtonProps,
} from "@/features/quick-access/components/quick-access-window-button";
import { useWindowsStore } from "@/store/windows.store";
import {
  MessagesSquare,
  Settings,
  Swords,
  Terminal,
  Timer,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const ICON_CLASS_NAME = "ll:size-4";

/**
 * Lootlog's "start bar": one tile per window, lit while that window is open.
 * Players tuck it under Margonem's top bar, so the default height stays at
 * one row of tiles and only the width grows with the tile count.
 */
export const QuickAccess = () => {
  const { t } = useTranslation("quickAccess");
  const open = useWindowsStore((state) => state["quick-access"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  const buttons: QuickAccessWindowButtonProps[] = [
    {
      windowId: "create-party-gathering",
      label: t("buttons.partyFinder"),
      icon: <Swords aria-hidden="true" className={ICON_CLASS_NAME} />,
      hotkeyAction: "create-party-gathering",
    },
    {
      windowId: "timers",
      label: t("buttons.timers"),
      icon: <Timer aria-hidden="true" className={ICON_CLASS_NAME} />,
      hotkeyAction: "toggle-timers",
    },
    {
      windowId: "online-players",
      label: t("buttons.onlinePlayers"),
      icon: <Users aria-hidden="true" className={ICON_CLASS_NAME} />,
      hotkeyAction: "toggle-online-players",
    },
    {
      windowId: "chat",
      label: t("buttons.chat"),
      icon: <MessagesSquare aria-hidden="true" className={ICON_CLASS_NAME} />,
      hotkeyAction: "toggle-chat",
    },
    {
      windowId: "command",
      label: t("buttons.command"),
      icon: <Terminal aria-hidden="true" className={ICON_CLASS_NAME} />,
      hotkeyAction: "toggle-command",
    },
    {
      windowId: "settings",
      label: t("buttons.settings"),
      icon: <Settings aria-hidden="true" className={ICON_CLASS_NAME} />,
      hotkeyAction: "toggle-settings",
    },
  ];

  return (
    <DraggableWindow
      isOpen={open}
      id="quick-access"
      title={t("window.title")}
      minHeight={56}
      minWidth={250}
      onClose={() => setOpen("quick-access", false)}
      closable={false}
      actions=<ConnectionStatus />
    >
      <ScrollArea
        className="ll:h-full ll:w-full"
        data-ll-quick-access-horizontal-scroll=""
        orientation="horizontal"
      >
        <div className="ll:flex ll:h-full ll:w-max ll:min-w-full ll:items-center ll:gap-0.5 ll:px-0.5">
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
