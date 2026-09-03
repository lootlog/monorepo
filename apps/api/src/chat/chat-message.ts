export const MessageType = {
  NORMAL: "NORMAL",
  NOTIFICATION: "NOTIFICATION",
  NPC: "NPC",
  PARTY_GATHERING: "PARTY_GATHERING",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];
