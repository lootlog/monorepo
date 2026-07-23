import {
  type ChatMessage as ChatMessageType,
  MessageType,
} from "@/api/chat.api";
import type { ChatMessageResponseDtoOutputNpc as ChatNpc } from "@lootlog/api-client/models/main/chat-message-response-dto-output-npc";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { isYesterday } from "@/utils/local-date";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/api/npcs.api";

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

export const getChatNpcLocation = (npc: ChatNpc) => {
  const normalizedLocation = getChatNpcLocationName(npc);

  if (!normalizedLocation) {
    return "";
  }

  const coordinatesLabel = getChatNpcCoordinatesLabel(npc);

  if (!coordinatesLabel) {
    return normalizedLocation;
  }

  return `${normalizedLocation} ${coordinatesLabel}`;
};

export const getChatNpcLocationName = (npc: ChatNpc) => npc.location.trim();

export const getChatNpcCoordinatesLabel = (npc: ChatNpc) => {
  if (npc.x === undefined || npc.y === undefined) {
    return "";
  }

  return `(${npc.x}, ${npc.y})`;
};

export const getChatNpcTextColor = (npc: ChatNpc) => {
  const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);

  return getTextColor(npcType, true);
};

export const getChatMessageBody = (
  message: ChatMessageType,
): ChatMessageBody | null => {
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
