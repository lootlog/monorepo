import { MessageScroller } from "@shadcn/react/message-scroller";
import type { ChatRenderableMessage } from "../chat.helpers";
import type { ChatTranscriptProps } from "./chat-transcript";
import { ChatDateDivider } from "./chat-date-divider";
import { ChatMessage } from "./chat-message";
import { ChatNpcMessage } from "./chat-npc-message";

type Props = Pick<
  ChatTranscriptProps,
  | "appearance"
  | "npcTypeColors"
  | "selectedGuildId"
  | "guildNamesById"
  | "membersByGuildId"
  | "mentionContextsByGuildId"
  | "onReplyToMessage"
  | "onMention"
> & { row: ChatRenderableMessage; continuation: boolean };

export function ChatTranscriptRow({
  row,
  appearance,
  npcTypeColors,
  selectedGuildId,
  guildNamesById,
  membersByGuildId,
  mentionContextsByGuildId,
  onReplyToMessage,
  onMention,
  continuation,
}: Props) {
  return (
    <MessageScroller.Item
      messageId={row.kind === "date-divider" ? undefined : row.message.id}
      data-chat-row-key={row.key}
      role="listitem"
      className="ll:min-w-0 ll:shrink-0 ll:odd:bg-white/15 ll:even:bg-black/25"
    >
      {row.kind === "date-divider" ? (
        <ChatDateDivider timestamp={row.timestamp} />
      ) : row.kind === "npc-group" ? (
        <ChatNpcMessage
          appearance={appearance}
          all={selectedGuildId === "all"}
          count={row.count}
          guildName={guildNamesById[row.message.guildId]}
          member={membersByGuildId[row.message.guildId]?.[row.message.senderId]}
          message={row.message}
          npcTypeColors={npcTypeColors}
          onMention={() => onMention?.(row.message)}
        />
      ) : (
        <ChatMessage
          appearance={appearance}
          all={selectedGuildId === "all"}
          guildName={guildNamesById[row.message.guildId]}
          member={membersByGuildId[row.message.guildId]?.[row.message.senderId]}
          mentionContext={mentionContextsByGuildId[row.message.guildId]}
          message={row.message}
          npcTypeColors={npcTypeColors}
          onReply={() => onReplyToMessage(row.message)}
          onMention={() => onMention?.(row.message)}
          isContinuation={continuation}
        />
      )}
    </MessageScroller.Item>
  );
}
