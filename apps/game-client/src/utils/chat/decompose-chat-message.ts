const regex = /<@([A-Z0-9]+),\s*([^,>]+)(?:,([^>]+))?>/;

export const decomposeChatMessage = (message: string) => {
  const match = regex.exec(message);

  const result = {
    baseMessage: message,
    npc: null,
  };

  if (!match) {
    return result;
  }

  return {
    baseMessage: message,
    npc: {
      npcType: match[1],
      npcName: match[2].trim(),
      npcLocation: match[3]?.trim() ?? null,
    },
  };
};
