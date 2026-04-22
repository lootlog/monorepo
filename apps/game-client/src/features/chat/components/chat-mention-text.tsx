import { cn } from "@/lib/utils";
import type { ChatMentionSegment } from "@/features/chat/chat-mentions.helpers";
import { Fragment, type FC } from "react";

type ChatMentionTextProps = {
  segments: ChatMentionSegment[];
  plainTextClassName?: string;
  plainTextAsTextNode?: boolean;
};

export const ChatMentionText: FC<ChatMentionTextProps> = ({
  segments,
  plainTextClassName,
  plainTextAsTextNode,
}) => {
  return segments.map((segment, index) => {
    if (!segment.isMention) {
      if (plainTextAsTextNode) {
        return <Fragment key={index}>{segment.text}</Fragment>;
      }

      return (
        <span key={index} className={plainTextClassName}>
          {segment.text}
        </span>
      );
    }

    return (
      <span
        key={index}
        className={cn(
          "ll:rounded-sm ll:px-0.5 ll:font-semibold ll:bg-white/10",
          segment.isCurrentUserTarget &&
            "ll:bg-white/14 ll:ring-1 ll:ring-white/20",
        )}
        style={
          segment.color
            ? {
                color: `#${segment.color}`,
              }
            : undefined
        }
      >
        {segment.text}
      </span>
    );
  });
};
