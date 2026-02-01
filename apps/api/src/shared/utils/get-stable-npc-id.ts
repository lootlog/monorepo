import { NpcType } from 'generated/client';

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
    let hash = 0;
    for (let i = 0; i < npcName.length; i++) {
      const char = npcName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure it's negative and distinct from real IDs
    return -Math.abs(hash || 1);
  }
  return Math.abs(npcId);
};
