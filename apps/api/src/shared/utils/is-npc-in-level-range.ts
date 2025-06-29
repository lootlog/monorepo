export function isNpcInLevelRanges(
  npc: any,
  ranges: { from: number; to: number }[],
): boolean {
  const npcLevel = npc.lvl || 0;
  if (npcLevel === 0) return true;
  if (!ranges.length) return false;
  return ranges.some((range) => npcLevel >= range.from && npcLevel <= range.to);
}
