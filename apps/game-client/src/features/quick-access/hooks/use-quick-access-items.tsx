import { useHeroSightingRows } from "@/features/hero-sightings/hooks/use-hero-sighting-rows";
import type { QuickAccessWindowButtonProps } from "@/features/quick-access/components/quick-access-window-button";
import { useWhatsNew } from "@/features/settings/components/whats-new/use-whats-new";
import { useGlobalChatStore } from "@/store/global-chat.store";
import {
  Globe,
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

export const useQuickAccessItems = () => {
  const { t } = useTranslation("quickAccess");
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
    },
  ];

  return {
    buttons,
    totalBadgeCount: heroSightingCount + globalChatUnread + whatsNewUnread,
  };
};
