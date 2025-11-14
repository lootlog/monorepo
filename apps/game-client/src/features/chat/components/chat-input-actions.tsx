import { Megaphone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FC } from "react";

type ChatInputActionsProps = {
  notificationEnabled?: boolean;
  toggleNotificationEnabled: () => void;
};

export const ChatInputActions: FC<ChatInputActionsProps> = ({
  notificationEnabled,
  toggleNotificationEnabled,
}) => {
  return [
    <Tooltip key="color-filters-tooltip">
      <TooltipTrigger asChild>
        <Megaphone
          key="color-filters"
          className={`ll-custom-cursor-pointer ll:mt-0.5 ll:hover:stroke-gray-100 ll:transition-colors ${
            notificationEnabled
              ? "ll:stroke-blue-400 ll:fill-blue-400/20"
              : "ll:stroke-gray-300"
          }`}
          size="14"
          onClick={toggleNotificationEnabled}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        {notificationEnabled
          ? "Wyłącz wysłanie powiadomienia"
          : "Włącz wysłanie powiadomienia"}
      </TooltipContent>
    </Tooltip>,
  ];
};
