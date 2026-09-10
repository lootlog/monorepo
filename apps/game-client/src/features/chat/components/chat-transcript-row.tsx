import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { MessageScroller } from "@shadcn/react/message-scroller";
import type { ChatRenderableMessage } from "../chat.helpers";
import type { ChatTranscriptProps } from "./chat-transcript";
import { ChatDateDivider } from "./chat-date-divider";
import { ChatMessage } from "./chat-message";
import { ChatNpcMessage } from "./chat-npc-message";
import { getPartyGatheringBackgroundColor } from "@/utils/notifications-and-detector/background";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import { NpcType } from "@/api/npcs.api";
import { MessageType } from "@/api/chat.api";

type Props = Pick<
  ChatTranscriptProps,
  | "appearance"
  | "npcTypeColors"
  | "selectedGuildId"
  | "guildNamesById"
  | "membersByGuildId"
  | "mentionContextsByGuildId"
  | "onReplyToMessage"
> & { row: ChatRenderableMessage; highlighted?: boolean };

export function ChatTranscriptRow({
  row,
  highlighted = false,
  appearance,
  npcTypeColors,
  selectedGuildId,
  guildNamesById,
  membersByGuildId,
  mentionContextsByGuildId,
  onReplyToMessage,
}: Props) {
  const messageGap = (appearance ?? CHAT_APPEARANCE_READABLE_PRESET)
    .messageGapPx;
  const gatheringMessage =
    row.kind === "message" &&
    row.message.type === MessageType.PARTY_GATHERING &&
    row.message.partyGathering
      ? row.message
      : undefined;
  const npc = gatheringMessage?.npc;
  const gatheringBackground = gatheringMessage
    ? getPartyGatheringBackgroundColor(
        npc ? getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type) : undefined,
        npcTypeColors,
      )
    : undefined;

  return (
    <MessageScroller.Item
      messageId={row.kind === "date-divider" ? undefined : row.message.id}
      data-chat-row-key={row.key}
      data-chat-highlighted={highlighted || undefined}
      role="listitem"
      style={{
        backgroundColor: highlighted
          ? "rgba(255, 255, 255, 0.18)"
          : gatheringBackground,
        paddingBlockStart:
          row.kind === "npc-group" ? messageGap : messageGap / 2,
        paddingBlockEnd: row.kind === "npc-group" ? 0 : messageGap / 2,
      }}
      className={`ll:min-w-0 ll:shrink-0 ll:pl-1.5 ll:pr-0.5 ll:box-border ll:odd:bg-white/5 ll:even:bg-black/25 ${row.kind !== "date-divider" ? "ll:odd:hover:bg-white/10 ll:even:hover:bg-white/10" : ""}`}
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
        />
      )}
    </MessageScroller.Item>
  );
}
