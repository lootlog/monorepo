import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@lootlog/client/main";
import { MessageScroller } from "@shadcn/react/message-scroller";
import { memo } from "react";
import type { ChatMentionContext } from "../chat-mentions.helpers";
import {
  areChatRenderablesEqual,
  type ChatRenderableMessage,
} from "../chat.helpers";
import type { ChatTranscriptProps } from "./chat-transcript";
import { ChatDateDivider } from "./chat-date-divider";
import { ChatMessage } from "./chat-message";
import { ChatNpcMessage } from "./chat-npc-message";

type Props = Pick<ChatTranscriptProps, "appearance" | "npcTypeColors"> & {
  row: ChatRenderableMessage;
  highlighted?: boolean;
  all: boolean;
  guildName?: string;
  member?: GuildMember;
  mentionContext?: ChatMentionContext;
  isDeleting?: boolean;
  onReplyToMessage: (message: ChatMessageType, member?: GuildMember) => void;
  onDeleteMessage: (message: ChatMessageType) => void;
};

const areRowPropsEqual = (previous: Props, next: Props) =>
  areChatRenderablesEqual(previous.row, next.row) &&
  previous.highlighted === next.highlighted &&
  previous.appearance === next.appearance &&
  previous.npcTypeColors === next.npcTypeColors &&
  previous.all === next.all &&
  previous.guildName === next.guildName &&
  previous.member === next.member &&
  previous.mentionContext === next.mentionContext &&
  previous.isDeleting === next.isDeleting &&
  previous.onReplyToMessage === next.onReplyToMessage &&
  previous.onDeleteMessage === next.onDeleteMessage;

/**
 * Memoized on purpose: the transcript renders up to 500 rows and appends one
 * per incoming message. Without this every incoming message re-rendered every
 * row (measured: 502 row renders per message before, 1 after), so keep every
 * prop referentially stable across ingests.
 */
export const ChatTranscriptRow = memo(function ChatTranscriptRow({
  row,
  highlighted = false,
  appearance,
  npcTypeColors,
  all,
  guildName,
  member,
  mentionContext,
  isDeleting = false,
  onReplyToMessage,
  onDeleteMessage,
}: Props) {
  const messageGap = (appearance ?? CHAT_APPEARANCE_READABLE_PRESET)
    .messageGapPx;

  return (
    <MessageScroller.Item
      messageId={row.kind === "date-divider" ? undefined : row.message.id}
      data-chat-row-key={row.key}
      data-chat-highlighted={highlighted || undefined}
      role="listitem"
      style={{
        backgroundColor: highlighted ? "rgba(255, 255, 255, 0.18)" : undefined,
        paddingBlockStart:
          row.kind === "npc-group" ? messageGap : messageGap / 2,
        paddingBlockEnd: row.kind === "npc-group" ? 0 : messageGap / 2,
      }}
      className={`ll:min-w-0 ll:shrink-0 ll:pl-1.5 ll:pr-0.5 ll:odd:bg-white/5 ll:even:bg-black/25 ${row.kind !== "date-divider" ? "ll:odd:hover:bg-white/10 ll:even:hover:bg-white/10" : ""}`}
    >
      {row.kind === "date-divider" ? (
        <ChatDateDivider timestamp={row.timestamp} />
      ) : row.kind === "npc-group" ? (
        <ChatNpcMessage
          appearance={appearance}
          all={all}
          count={row.count}
          guildName={guildName}
          member={member}
          message={row.message}
          npcTypeColors={npcTypeColors}
        />
      ) : (
        <ChatMessage
          appearance={appearance}
          all={all}
          guildName={guildName}
          member={member}
          mentionContext={mentionContext}
          message={row.message}
          npcTypeColors={npcTypeColors}
          isDeleting={isDeleting}
          onReply={() => onReplyToMessage(row.message, member)}
          onDelete={() => onDeleteMessage(row.message)}
        />
      )}
    </MessageScroller.Item>
  );
}, areRowPropsEqual);
