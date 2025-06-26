const regex = /<@([A-Z0-9]+),([^()]+)\(([^)]+)\)>/;

export const decomposeChatMessage = (message: string) => {
  const match = message.match(regex);

  return {
    baseMessage: message,
    npcType: match?.[1] as string,
    npcName: match?.[2]?.trim() || "",
    npcLvl: match?.[3] || "",
  };
};
