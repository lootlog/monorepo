import { DraggableWindow } from "@/components/draggable-window";
import {
  QuickAccessButton,
  type QuickAccessButtonProps,
} from "@/features/quick-access/components/quick-access-button";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import { usePartyFinderStore } from "@/store/party-finder.store";
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
  const { t } = useTranslation("quick-access");
  const partyGathering = usePartyFinderStore((s) => s.partyGathering);
  const buttons: QuickAccessButtonProps[] = [
    {
      id: "create-party-gathering",
      title: t("quick-access.buttons.create-party-gathering"),
      icon: <Swords size="16" />,
    },
    {
      id: "timers",
      title: t("quick-access.buttons.timers"),
      icon: <Timer size="16" />,
    },
    {
      id: "online-players",
      title: t("quick-access.buttons.online-players"),
      icon: <Users size="16" />,
    },
    {
      id: "chat",
      title: t("quick-access.buttons.chat"),
      icon: <MessagesSquare size="16" />,
    },
    {
      id: "command",
      title: t("quick-access.buttons.command"),
      icon: <Terminal size="16" />,
    },
    {
      id: "settings",
      title: t("quick-access.buttons.settings"),
      icon: <Settings size="16" />,
    },
  ];

  return (
    <DraggableWindow
      id="quick-access"
      title={t("quick-access.window.title")}
      minHeight={56}
      minWidth={250}
      closable={false}
    >
      <div className="ll:flex ll:gap-1 ll:px-1 ll:py-1">
        {partyGathering && (
          <QuickAccessButton
            id="party-finder"
            title={t("quick-access.buttons.party-finder-active")}
            icon=<Swords size="16" className="ll:text-green-500" />
          />
        )}
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
    </DraggableWindow>
  );
};
