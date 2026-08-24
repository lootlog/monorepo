import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  QuickAccessButton,
  type QuickAccessButtonProps,
} from "@/features/quick-access/components/quick-access-button";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import { usePartyFinderStore } from "@/store/party-finder.store";
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

export const QuickAccess = () => {
  const { t } = useTranslation("quickAccess");
  const hasActiveReadyRoom = usePartyFinderStore((state) =>
    Object.values(state.projections).some(
      (projection) => projection.status === "ACTIVE",
    ),
  );
  const open = useWindowsStore((state) => state["quick-access"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const buttons: QuickAccessButtonProps[] = [
    {
      id: "create-party-gathering",
      title: t("buttons.partyFinder"),
      icon: <Swords size="16" />,
    },
    {
      id: "timers",
      title: t("buttons.timers"),
      icon: <Timer size="16" />,
    },
    {
      id: "online-players",
      title: t("buttons.onlinePlayers"),
      icon: <Users size="16" />,
    },
    {
      id: "chat",
      title: t("buttons.chat"),
      icon: <MessagesSquare size="16" />,
    },
    {
      id: "command",
      title: t("buttons.command"),
      icon: <Terminal size="16" />,
    },
    {
      id: "settings",
      title: t("buttons.settings"),
      icon: <Settings size="16" />,
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
    >
      <ScrollArea
        className="ll:h-full ll:w-full"
        data-ll-quick-access-horizontal-scroll=""
        orientation="horizontal"
      >
        <div className="ll:flex ll:w-max ll:gap-1 ll:px-1 ll:py-1">
          {hasActiveReadyRoom ? (
            <QuickAccessButton
              id="party-finder"
              title={t("buttons.activePartyGathering")}
              icon=<Swords size="16" className="ll:text-green-500" />
            />
          ) : null}
          {buttons.map((button) => (
            <QuickAccessButton
              key={button.id}
              id={button.id}
              title={button.title}
              icon={button.icon}
              href={button.href}
            />
          ))}

          <GuildListPopover />
        </div>
      </ScrollArea>
    </DraggableWindow>
  );
};
