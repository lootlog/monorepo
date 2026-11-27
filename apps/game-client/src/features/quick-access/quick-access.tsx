import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toolbarStripDividerClassName } from "@/components/ui/toolbar-strip";
import { ConnectionStatus } from "@/features/quick-access/components/connection-status";
import { QuickAccessCollapseButton } from "@/features/quick-access/components/quick-access-collapse-button";
import { QuickAccessCollapsedBar } from "@/features/quick-access/components/quick-access-collapsed-bar";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import { useHeroSightingRows } from "@/features/hero-sightings/hooks/use-hero-sighting-rows";
import { SetupChecklistButton } from "@/features/setup-checklist/components/setup-checklist-button";
import {
  QuickAccessWindowButton,
  type QuickAccessWindowButtonProps,
} from "@/features/quick-access/components/quick-access-window-button";
import { useWhatsNew } from "@/features/settings/components/whats-new/use-whats-new";
import { useGlobalChatStore } from "@/store/global-chat.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  Globe,
  Grid3x3,
  MessageSquareText,
  MessagesSquare,
  Radar,
  Settings,
  Swords,
  Timer,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const ICON_CLASS_NAME = "ll:size-4";

export const QuickAccess = () => {
  const { t } = useTranslation("quickAccess");
  const open = useWindowsStore((state) => state["quick-access"].open);

  const collapsed = useWindowsStore(
    (state) => state["quick-access"].collapsed ?? false,
  );

  const setOpen = useWindowsStore((state) => state.setOpen);
  const globalChatUnread = useGlobalChatStore((state) => state.unread);
  const whatsNewUnread = useWhatsNew().unreadIds.length;

  const heroSightingCount = useHeroSightingRows().rows.filter(
    (row) => row.isCurrent,
  ).length;

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
      windowId: "hero-sightings",
      label: t("buttons.heroSightings"),
      icon: <Radar aria-hidden="true" className={ICON_CLASS_NAME} />,
      badge:
        heroSightingCount > 0
          ? {
              count: heroSightingCount,
              label: t("quickAccess.count", {
                ns: "heroSightings",
                count: heroSightingCount,
              }),
            }
          : undefined,
    },
    {
      windowId: "bingo",
      label: t("buttons.bingo"),
      icon: <Grid3x3 aria-hidden="true" className={ICON_CLASS_NAME} />,
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
      windowId: "global-chat",
      label: t("buttons.globalChat"),
      icon: <Globe aria-hidden="true" className={ICON_CLASS_NAME} />,
      badge:
        globalChatUnread > 0
          ? {
              count: globalChatUnread,
              label: t("quickAccess.unread", {
                ns: "globalChat",
                count: globalChatUnread,
              }),
            }
          : undefined,
    },
    {
      windowId: "command",
      label: t("buttons.command"),
      icon: (
        <MessageSquareText aria-hidden="true" className={ICON_CLASS_NAME} />
      ),
      hotkeyAction: "toggle-command",
    },
    {
      windowId: "settings",
      label: t("buttons.settings"),
      icon: <Settings aria-hidden="true" className={ICON_CLASS_NAME} />,
      hotkeyAction: "toggle-settings",
      badge:
        whatsNewUnread > 0
          ? {
              count: whatsNewUnread,
              label: t("settings.whatsNew.badge", {
                ns: "translation",
                count: whatsNewUnread,
              }),
            }
          : undefined,
    },
  ];

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
