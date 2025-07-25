import { DraggableWindow } from "@/components/draggable-window";
import { LOOTLOG_APP_URL } from "@/config/app";
import {
  QuickAccessButton,
  QuickAccessButtonProps,
} from "@/features/quick-access/components/quick-access-button";
import {
  MessagesSquare,
  Settings,
  SquareArrowOutUpRight,
  Timer,
  Users,
} from "lucide-react";

const BUTTONS: QuickAccessButtonProps[] = [
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
    id: "settings",
    title: "Ustawienia",
    icon: <Settings size="16" />,
  },
  {
    id: "lootlog-app",
    title: "Strona Lootloga",
    icon: <SquareArrowOutUpRight size="16" />,
    href: `${LOOTLOG_APP_URL}/@me`,
  },
];

export const QuickAccess = () => {
  return (
    <DraggableWindow
      id="quick-access"
      title="Lootlog"
      minHeight={48}
      minWidth={184}
      closable={false}
    >
      <div className="ll-flex ll-gap-1 ll-px-1 ll-py-1">
        {BUTTONS.map((button) => (
          <QuickAccessButton
            key={button.id}
            id={button.id}
            title={button.title}
            icon={button.icon}
            href={button.href}
          />
        ))}
      </div>
    </DraggableWindow>
  );
};
