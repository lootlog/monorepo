import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Schema } from "effect";
import type { Member, PlayerSnapshot, Timer } from "#src/timers/timers.types";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";

const NPC_TYPE_VALUES = new Set<string>(Object.values(NpcType));
export type TimerProjection = Timer & {
  readonly member?: Member | null;
  readonly actorCharacter?: PlayerSnapshot | null;
};

const CachedTimerMember = Schema.Struct({
  id: Schema.Number,
  userId: Schema.String,
  guildId: Schema.String,
  type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
  name: Schema.String,
  avatar: Schema.NullOr(Schema.String),
  banner: Schema.NullOr(Schema.String),
  active: Schema.Boolean,
  globalUserId: Schema.NullOr(Schema.String),
  lastDiscordSyncAt: nullableIsoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

const CachedTimerCharacter = Schema.Struct({
  name: Schema.String,
  prof: Schema.NullOr(Schema.String),
  icon: Schema.NullOr(Schema.String),
  characterId: Schema.Number,
  accountId: Schema.Number,
});

export const CachedTimerProjectionSchema = Schema.Struct({
  guildId: Schema.String,
  npcId: Schema.Number,
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  npc: Schema.Unknown,
  wasReset: Schema.Boolean,
  actorCharacterLvl: Schema.NullOr(Schema.Number),
  deletedAt: nullableIsoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  member: Schema.optionalKey(Schema.NullOr(CachedTimerMember)),
  actorCharacter: Schema.optionalKey(Schema.NullOr(CachedTimerCharacter)),
});
export type CachedTimerProjection = typeof CachedTimerProjectionSchema.Type;

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

export const parseTimerNpc = (
  npc: unknown,
): { readonly lvl: number; readonly type: NpcType } | null => {
  let value = npc;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const mapped = mapTimerNpc(value);
  return mapped === null ? null : { lvl: mapped.lvl, type: mapped.type };
};

export const toTimerDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

export const mapTimerCharacter = (
  character: CachedTimerProjection["actorCharacter"],
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

export const mapTimerMember = (member: CachedTimerProjection["member"]) =>
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

export const mapTimerResponse = (timer: CachedTimerProjection) => {
  const member = mapTimerMember(timer.member);
  const actorCharacter = mapTimerCharacter(
    timer.actorCharacter,
    timer.actorCharacterLvl,
  );

  return {
    guildId: timer.guildId,
    npcId: timer.npcId,
    timerKey: timer.timerKey,
    world: timer.world,
    minSpawnTime: toTimerDate(timer.minSpawnTime) ?? new Date(),
    maxSpawnTime: toTimerDate(timer.maxSpawnTime) ?? new Date(),
    npc: mapTimerNpc(timer.npc),
    wasReset: timer.wasReset,
    ...(member === undefined ? {} : { member }),
    ...(actorCharacter === undefined ? {} : { actorCharacter }),
    deletedAt: toTimerDate(timer.deletedAt),
    updatedAt: toTimerDate(timer.updatedAt) ?? new Date(),
  };
};
