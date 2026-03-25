import { NpcType } from "prisma/generated/client";
import { simpleStringHash } from "./simple-string-hash";

const MAX_NPC_NAME_LENGTH = 256;

/**
 * For COLOSSUS type monsters, generates a stable ID from the name
 * because COLOSSUS spawn IDs are unique per instance.
 * For other NPC types, returns the original ID.
 */
export const getStableNpcId = (
  npcId: number,
  npcName: string,
  npcType: NpcType,
): number => {
  if (npcType === NpcType.COLOSSUS) {
    const safeName = String(npcName ?? "").substring(0, MAX_NPC_NAME_LENGTH);
    return -Math.abs(simpleStringHash(safeName) || 1);
  }
  return Math.abs(npcId);
};
