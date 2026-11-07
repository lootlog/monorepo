interface KillDedupKeyData {
  world: string;
  npcId: number;
}

function buildKillDedupKey(
  scope: "user" | "guild",
  ownerId: string,
  data: KillDedupKeyData,
): string {
  return `kill:dedup:${scope}:${ownerId}:${data.world}:${data.npcId}`;
}

export function buildUserKillDedupKey(
  userId: string,
  data: KillDedupKeyData,
): string {
  return buildKillDedupKey("user", userId, data);
}

export function buildGuildKillDedupKey(
  guildId: string,
  data: KillDedupKeyData,
): string {
  return buildKillDedupKey("guild", guildId, data);
}

export function buildMemberKillDedupKey(
  guildId: string,
  memberId: number,
  data: KillDedupKeyData,
): string {
  return `${buildGuildKillDedupKey(guildId, data)}:member:${memberId}`;
}

/** One boss kill across Organizations: every report of it holds its time. */
export function buildBossKillDedupKey(data: KillDedupKeyData): string {
  return `kill:dedup:boss:${data.world}:${data.npcId}`;
}
