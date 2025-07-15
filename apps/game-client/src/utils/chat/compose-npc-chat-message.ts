import { NpcType } from "@/hooks/api/use-npcs";

export const composeNpcChatMessage = (
  npcType: NpcType,
  baseMessage: string,
  location?: string
): string => {
  return `<@${npcType},${baseMessage}${location ? `,${location}` : ""}>`;
};
