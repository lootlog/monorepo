import { db as prismaDb } from "#src/prisma/db";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];

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
    // Generate a deterministic hash from the name
    // Use a simple string hash that produces a stable negative number
    // (negative to avoid collision with real NPC IDs)
    // Normalize and bound the name length to avoid unbounded iteration
    const safeName = String(npcName ?? "");
    const MAX_NPC_NAME_LENGTH = 256;
    const length = Math.min(safeName.length, MAX_NPC_NAME_LENGTH);

    let hash = 0;
    for (let i = 0; i < length; i++) {
      const char = safeName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure it's negative and distinct from real IDs
    return -Math.abs(hash || 1);
  }
  return Math.abs(npcId);
};
