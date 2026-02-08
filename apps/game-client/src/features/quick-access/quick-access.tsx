import { DraggableWindow } from "@/components/draggable-window";
import {
  QuickAccessButton,
  type QuickAccessButtonProps,
} from "@/features/quick-access/components/quick-access-button";
import { GuildListPopover } from "@/features/quick-access/components/guild-list-popover";
import { usePartyFinderStore } from "@/store/party-finder.store";
import {
  MessageSquareWarning,
  MessagesSquare,
  Settings,
  Swords,
  Timer,
  Users,
} from "lucide-react";

const BUTTONS: QuickAccessButtonProps[] = [
  {
    id: "create-party-gathering",
    title: "Party finder",
    icon: <Swords size="16" />,
  },
  {
    id: "timers",
    title: "Timery",
    icon: <Timer size="16" />,
  },
  {
    id: "online-players",
    title: "Gracze online",
    icon: <Users size="16" />,
  },
  {
    id: "chat",
    title: "Chat",
    icon: <MessagesSquare size="16" />,
  },
  {
    id: "chat-input",
    title: "Napisz wiadomość",
    icon: <MessageSquareWarning size="16" />,
  },
  {
    id: "settings",
    title: "Ustawienia",
    icon: <Settings size="16" />,
  },
];

export const QuickAccess = () => {
  const partyGathering = usePartyFinderStore((s) => s.partyGathering);

  return (
    <DraggableWindow
      id="quick-access"
      title="Lootlog"
      minHeight={56}
      minWidth={250}
      closable={false}
    >
      <div className="ll:flex ll:gap-1 ll:px-1 ll:py-1">
        {BUTTONS.map((button) => (
          <QuickAccessButton
            key={button.id}
            id={button.id}
            title={button.title}
            icon={button.icon}
            href={button.href}
          />
        ))}
        {partyGathering && (
          <QuickAccessButton
            id="party-finder"
            title="Aktywne zbieranie grupy"
            icon={<Users size="16" />}
          />
        )}
        <GuildListPopover />
      </div>
    </DraggableWindow>
  );
};
