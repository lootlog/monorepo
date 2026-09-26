import { Bell, MessageSquare, Swords } from "lucide-react";
import type { FC } from "react";
import { cn } from "cn";
import { CHAT_COMMAND_COLOR_KEYS } from "@/features/chat/chat-command-prefix";
import { getCommandMode } from "@/features/command/command-mode.helpers";
import { getTextColor } from "@/utils/notifications-and-detector/background";

const MODE_ICONS = {
  message: MessageSquare,
  notification: Bell,
  party: Swords,
};

type ChatComposeModeIconProps = {
  message: string;
  className?: string;
};

/**
 * Shows beside a composer what Enter does with the typed entry: a message,
 * a notification (`!`) or a gathering (`/grp`).
 */
export const ChatComposeModeIcon: FC<ChatComposeModeIconProps> = ({
  message,
  className,
}) => {
  const mode = getCommandMode(message);
  const Icon = MODE_ICONS[mode];

  return (
    <Icon
      aria-hidden
      className={cn(
        "ll:shrink-0 ll:transition-colors",
        mode === "message" && "ll:text-muted-foreground",
        className,
      )}
      style={
        mode === "message"
          ? undefined
          : { color: getTextColor(CHAT_COMMAND_COLOR_KEYS[mode], true) }
      }
    />
  );
};
