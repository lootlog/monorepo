import { IsoDateTime } from "@lootlog/schema/primitives";
import {
  NpcTypeEnum as NpcType,
  NpcTypeSchema,
} from "@lootlog/schema/npc-type";
import { Option, Schema, Predicate } from "effect";
import {
  NpcRoutingDataSchema,
  type NpcRoutingData,
} from "@lootlog/schema/npc-routing";
import { nullableIsoDatetimeCodec } from "#src/shared/schema/response-codecs";

const isNpcType = Schema.is(NpcTypeSchema);

const CachedTimerMember = Schema.Struct({
  id: Schema.Finite,
  userId: Schema.String,
  guildId: Schema.String,
  type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
  name: Schema.String,
  avatar: Schema.NullOr(Schema.String),
  banner: Schema.NullOr(Schema.String),
  active: Schema.Boolean,
  globalUserId: Schema.NullOr(Schema.String),
  lastDiscordSyncAt: nullableIsoDatetimeCodec,
  updatedAt: IsoDateTime,
});

const CachedTimerCharacter = Schema.Struct({
  name: Schema.String,
  prof: Schema.NullOr(Schema.String),
  icon: Schema.NullOr(Schema.String),
  characterId: Schema.Finite,
  accountId: Schema.Finite,
});

export const CachedTimerProjectionSchema = Schema.Struct({
  guildId: Schema.String,
  npcId: Schema.Finite,
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: IsoDateTime,
  maxSpawnTime: IsoDateTime,
  npc: Schema.Unknown,
  wasReset: Schema.Boolean,
  actorCharacterLvl: Schema.NullOr(Schema.Finite),
  deletedAt: nullableIsoDatetimeCodec,
  entranceClosesAt: Schema.optionalKey(nullableIsoDatetimeCodec),
  updatedAt: IsoDateTime,
  member: Schema.optionalKey(Schema.NullOr(CachedTimerMember)),
  actorCharacter: Schema.optionalKey(Schema.NullOr(CachedTimerCharacter)),
});

export type CachedTimerProjection = typeof CachedTimerProjectionSchema.Type;

export const timerNpcField = (npc: unknown, key: string) =>
  Predicate.isObject(npc) ? npc[key] : undefined;

const decodeTimerNpcRouting = Schema.decodeUnknownOption(NpcRoutingDataSchema);

export const parseTimerNpcRouting = (npc: unknown): NpcRoutingData | null =>
  Option.getOrNull(decodeTimerNpcRouting(npc));

const isPositiveSafeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export type TimerNpcIdentity = {
  readonly npcId: number;
  readonly templateId: number | null;
};

export const timerNpcTemplateId = (npc: unknown): number | null => {
  const templateId = timerNpcField(npc, "templateId");

  return isPositiveSafeInteger(templateId) ? templateId : null;
};

export const timerNpcIdentity = (timer: {
  readonly npcId: number;
  readonly npc?: unknown;
}): TimerNpcIdentity => ({
  npcId: timer.npcId,
  templateId: timerNpcTemplateId(timer.npc),
});

export const mapTimerNpc = (npc: unknown) => {
  if (!Predicate.isObject(npc)) return null;
  const value = npc;

  const rawType =
    typeof value.type === "string" ? value.type.toUpperCase() : null;

  const type = isNpcType(rawType) ? rawType : NpcType.NPC;

  return {
    id: typeof value.id === "number" ? value.id : 0,
    templateId: timerNpcTemplateId(value),
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

const toTimerDate = (value: Date | string | null | undefined) => {
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

type TimerAssociations = {
  member?: NonNullable<ReturnType<typeof mapTimerMember>>;
  actorCharacter?: NonNullable<ReturnType<typeof mapTimerCharacter>>;
};

export const mapTimerResponse = (timer: CachedTimerProjection) => {
  const member = mapTimerMember(timer.member);

  const actorCharacter = mapTimerCharacter(
    timer.actorCharacter,
    timer.actorCharacterLvl,
  );

  const associations: TimerAssociations = {};

  if (member !== undefined) associations.member = member;

  if (actorCharacter !== undefined)
    associations.actorCharacter = actorCharacter;

  return {
    ...associations,
    guildId: timer.guildId,
    npcId: timer.npcId,
    timerKey: timer.timerKey,
    world: timer.world,
    minSpawnTime: toTimerDate(timer.minSpawnTime) ?? new Date(),
    maxSpawnTime: toTimerDate(timer.maxSpawnTime) ?? new Date(),
    npc: mapTimerNpc(timer.npc),
    wasReset: timer.wasReset,
    deletedAt: toTimerDate(timer.deletedAt),
    entranceClosesAt: toTimerDate(timer.entranceClosesAt),
    updatedAt: toTimerDate(timer.updatedAt) ?? new Date(),
  };
};

export const toTimerEvent = (
  response: ReturnType<typeof mapTimerResponse>,
) => ({
  ...response,
  minSpawnTime: response.minSpawnTime.toISOString(),
  maxSpawnTime: response.maxSpawnTime.toISOString(),
});
