import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { Member, PlayerSnapshot, Timer } from "#src/timers/timers.types";

const NPC_TYPE_VALUES = new Set<string>(Object.values(NpcType));

export type TimerProjection = Timer & {
  readonly member?: Member | null;
  readonly actorCharacter?: PlayerSnapshot | null;
};

export const parseTimerNpc = (
  npc: unknown,
): { readonly lvl: number; readonly type: NpcType } | null => {
  if (!npc) return null;
  return (typeof npc === "string" ? JSON.parse(npc) : npc) as {
    readonly lvl: number;
    readonly type: NpcType;
  };
};

export const mapTimerNpc = (npc: unknown) => {
  if (!npc || typeof npc !== "object" || Array.isArray(npc)) return null;
  const value = npc as Record<string, unknown>;
  const rawType =
    typeof value.type === "string" ? value.type.toUpperCase() : null;
  const type =
    rawType && NPC_TYPE_VALUES.has(rawType)
      ? (rawType as NpcType)
      : NpcType.NPC;
  return {
    id: typeof value.id === "number" ? value.id : 0,
    name: typeof value.name === "string" ? value.name : "",
    prof: typeof value.prof === "string" ? value.prof : "",
    location: typeof value.location === "string" ? value.location : "",
    wt: typeof value.wt === "string" ? value.wt : String(value.wt ?? ""),
    lvl: typeof value.lvl === "number" ? value.lvl : 0,
    type,
    icon: typeof value.icon === "string" ? value.icon : null,
    margonemType:
      typeof value.margonemType === "string"
        ? value.margonemType
        : String(value.margonemType ?? ""),
  };
};

export const toTimerDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

export const mapTimerCharacter = (
  character: PlayerSnapshot | null | undefined,
  level: number | null | undefined,
) =>
  character
    ? {
        name: character.name,
        prof: character.prof,
        icon: character.icon,
        lvl: level ?? null,
        characterId: character.characterId,
        accountId: character.accountId,
      }
    : undefined;

export const mapTimerMember = (member: Member | null | undefined) =>
  member
    ? {
        id: member.id,
        userId: member.userId,
        guildId: member.guildId,
        type: member.type,
        name: member.name,
        avatar: member.avatar,
        banner: member.banner,
        active: member.active,
        roles: [],
        globalUserId: member.globalUserId,
        lastDiscordSyncAt: toTimerDate(member.lastDiscordSyncAt),
        updatedAt: toTimerDate(member.updatedAt) ?? new Date(),
      }
    : undefined;

export const mapTimerResponse = (timer: TimerProjection) => ({
  guildId: timer.guildId,
  npcId: timer.npcId,
  timerKey: timer.timerKey,
  world: timer.world,
  minSpawnTime: toTimerDate(timer.minSpawnTime) ?? new Date(),
  maxSpawnTime: toTimerDate(timer.maxSpawnTime) ?? new Date(),
  npc: mapTimerNpc(timer.npc),
  wasReset: timer.wasReset,
  member: mapTimerMember(timer.member),
  actorCharacter: mapTimerCharacter(
    timer.actorCharacter,
    timer.actorCharacterLvl,
  ),
  deletedAt: toTimerDate(timer.deletedAt),
  updatedAt: toTimerDate(timer.updatedAt) ?? new Date(),
});
