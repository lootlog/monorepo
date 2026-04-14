import { NPC_NAMES } from "@/constants/margonem";
import type { ChatMessage as ChatMessageType } from "@/hooks/api/use-chat-messages";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { isYesterday } from "date-fns";
import { getNpcTypeByWt } from "@lootlog/types";
import { MessageType } from "@/hooks/api/use-send-chat-message";
import { NpcType } from "@/hooks/api/use-npcs";
import { NPCS_WITH_LOCATION } from "@/features/npc-detector/components/npc-list-item";

export const isChatMessageYesterdayOrOlder = (
  timestamp: string,
  now = new Date(),
) => {
  const messageDate = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return isYesterday(messageDate) || messageDate < todayStart;
};

type ChatMessageBody = {
  color?: string;
  text: string;
};

export const getChatMessageBody = (
  message: ChatMessageType,
): ChatMessageBody | null => {
  if (message.type === MessageType.NPC) {
    const npc = message.npc;
    if (!npc) return null;

    const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
    const shortname = NPC_NAMES[npcType]?.shortname;
    const color = getTextColor(npcType, true);
    const location = NPCS_WITH_LOCATION.includes(npcType)
      ? `${npc.location} (${npc.x}, ${npc.y})`
      : npc.location;

    return {
      color,
      text: `[${shortname}] ${npc.name} (${npc.lvl}${npc.prof ?? ""})${location ? ` - ${location}` : ""}`,
    };
  }

  if (message.type === MessageType.NOTIFICATION) {
    return {
      color: getTextColor("message", true),
      text: `[P] ${message.message}`,
    };
  }

  return {
    text: message.message,
  };
};
