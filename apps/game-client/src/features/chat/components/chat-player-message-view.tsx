import { Message } from "@/components/ui/message";
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
  replyPreview?: ReactNode;
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
  replyPreview,
  className,
  guildName,
  isMsgYesterday,
  messageId,
  sender,
  timestamp,
  ...rootProps
}) => (
  <Message
    {...rootProps}
    className={cn(
      "ll:flow-root ll:cursor-text ll:select-text ll:outline-none",
      className,
    )}
    data-chat-message-id={messageId}
  >
    <span className="ll:min-w-0">
      <span
        className="ll:min-w-0 ll:flex-1 ll:select-text"
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
        {sender}{" "}
      </span>
    </span>
    {replyPreview}
    {body}
  </Message>
);
