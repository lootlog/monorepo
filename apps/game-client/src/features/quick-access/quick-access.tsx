import { DraggableWindow } from "@/components/draggable-window";
import {
  QuickAccessButton,
  QuickAccessButtonProps,
} from "@/features/quick-access/components/quick-access-button";
import { MessagesSquare, Settings, Timer, Users } from "lucide-react";

const BUTTONS: QuickAccessButtonProps[] = [
  {
    id: "timers",
    title: "Timery",
    icon: <Timer />,
  },
  {
    id: "online-players",
    title: "Gracze online",
    icon: <Users />,
  },
  {
    id: "chat",
    title: "Czat",
    icon: <MessagesSquare />,
  },
  {
    id: "settings",
    title: "Ustawienia",
    icon: <Settings />,
  },
];

export const QuickAccess = () => {
  return (
    <DraggableWindow
      id="quick-access"
      title="Lootlog"
      minHeight={48}
      minWidth={222}
      closable={false}
      disableTitle
    >
      <div className="ll-flex ll-gap-1 ll-px-1 ll-py-1">
        {BUTTONS.map((button) => (
          <QuickAccessButton
            key={button.id}
            id={button.id}
            title={button.title}
            icon={button.icon}
          />
        ))}
      </div>
    </DraggableWindow>
  );
};
