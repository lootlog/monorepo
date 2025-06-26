import { NPC_NAMES } from "@/constants/margonem";
import { NpcType } from "@/hooks/api/use-npcs";

export const composeNpcChatMessage = (
  npcType: NpcType,
  baseMessage: string
): string => {
  return `<@${npcType},${baseMessage}>`;
};
