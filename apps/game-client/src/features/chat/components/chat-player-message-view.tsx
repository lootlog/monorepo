import { cn } from "cn";
import { format } from "@/utils/local-date";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";
import type { ComponentPropsWithRef, FC, ReactNode } from "react";

type ChatPlayerMessageViewProps = ComponentPropsWithRef<"div"> & {
  all: boolean;
  appearance?: ChatAppearanceSettings;
  body: ReactNode;
  guildName: string;
  isMsgYesterday: boolean;
  messageId: string;
  sender: ReactNode;
  timestamp: string;
};

export const ChatPlayerMessageView: FC<ChatPlayerMessageViewProps> = ({
  all,
  appearance = CHAT_APPEARANCE_READABLE_PRESET,
  body,
  className,
  guildName,
  isMsgYesterday,
  messageId,
  sender,
  timestamp,
  ...rootProps
}) => (
  <div
    {...rootProps}
    className={cn(
      "ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:cursor-text ll:select-text ll:rounded-sm ll:text-[length:var(--ll-chat-font-size)] ll:leading-[var(--ll-chat-line-height)] ll:text-white ll:transition-colors ll:hover:bg-gray-500/20",
      className,
    )}
    data-chat-message-id={messageId}
  >
    <span
      className="ll:inline-block ll:max-w-full ll:select-text"
      style={{ overflowWrap: "anywhere" }}
    >
      {appearance.showTimestamp ? (
        <span
          className={cn(
            "ll:select-text ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)]",
            { "ll:opacity-50": isMsgYesterday },
          )}
        >
          [{format(new Date(timestamp), "HH:mm")}]
        </span>
      ) : null}{" "}
      {all && appearance.showGuildLabel ? (
        <span
          className={cn("ll:mr-0.5 ll:select-text ll:font-bold", {
            "ll:opacity-50": isMsgYesterday,
          })}
        >
          [{guildName}]{" "}
        </span>
      ) : null}
      {sender}
    </span>{" "}
    {body}
  </div>
);
