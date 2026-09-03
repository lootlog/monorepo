import { Schema } from "effect";
import {
  ActivitySource,
  ActivityType,
  type ActivitySource as ActivitySourceValue,
  type ActivityType as ActivityTypeValue,
} from "#src/database/schema";

export interface ActorSnapshotInput {
  readonly accountId?: number;
  readonly characterId?: number;
  readonly name?: string;
  readonly clanName?: string;
  readonly clanId?: number;
  readonly icon?: string;
  readonly lvl?: number;
  readonly prof?: string;
}
export interface CreateActivity {
  readonly userId: string;
  readonly guildId: string;
  readonly discordId: string;
  readonly type: ActivityTypeValue;
  readonly source: ActivitySourceValue;
  readonly world?: string;
  readonly details?: Record<string, unknown>;
  readonly actorSnapshot?: ActorSnapshotInput;
  readonly idempotencyKey: string;
}

const ActorSnapshot = Schema.Struct({
  accountId: Schema.optional(Schema.Number),
  characterId: Schema.optional(Schema.Number),
  name: Schema.optional(Schema.String),
  clanName: Schema.optional(Schema.String),
  clanId: Schema.optional(Schema.Number),
  icon: Schema.optional(Schema.String),
  lvl: Schema.optional(Schema.Number),
  prof: Schema.optional(Schema.String),
});
const BaseActivity = Schema.Struct({
  userId: Schema.NonEmptyString,
  guildId: Schema.NonEmptyString,
  discordId: Schema.NonEmptyString,
  type: Schema.Literals(Object.values(ActivityType)),
  source: Schema.Literals(Object.values(ActivitySource)),
  world: Schema.optional(Schema.String),
  details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  actorSnapshot: Schema.optional(ActorSnapshot),
  idempotencyKey: Schema.NonEmptyString,
});
const decodeBase = Schema.decodeUnknownSync(BaseActivity);
const requiredGameFields = [
  "accountId",
  "characterId",
  "clanName",
  "clanId",
  "icon",
  "lvl",
  "prof",
] as const;

export const decodeCreateActivity = (input: unknown): CreateActivity => {
  const value = decodeBase(input) as CreateActivity;
  if (
    (value.type === ActivityType.CONNECT_EVENT ||
      value.type === ActivityType.DISCONNECT_EVENT) &&
    (typeof value.details?.sessionId !== "string" ||
      value.details.sessionId.length === 0)
  )
    throw new Error("details.sessionId is required for session activity");
  if (
    value.source === ActivitySource.GAME &&
    (!value.actorSnapshot ||
      requiredGameFields.some(
        (field) => value.actorSnapshot?.[field] === undefined,
      ))
  )
    throw new Error("actorSnapshot is missing required fields for GAME source");
  return value;
};

export const GuildMemberRemoved = Schema.Struct({
  discordId: Schema.NonEmptyString,
  guildId: Schema.NonEmptyString,
  userId: Schema.optional(Schema.String),
  id: Schema.optional(Schema.String),
});
export const decodeGuildMemberRemoved =
  Schema.decodeUnknownSync(GuildMemberRemoved);

export interface QueryActivities {
  readonly userId?: string;
  readonly guildId?: string;
  readonly type?: ActivityTypeValue[];
  readonly source?: ActivitySourceValue[];
  readonly playerName?: string;
  readonly clanName?: string;
  readonly world?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly cursor?: string;
  readonly limit: number;
}

const list = (url: URL, name: string): string[] | undefined => {
  const values = url.searchParams
    .getAll(name)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
};
export const parseActivityQuery = (url: URL): QueryActivities => {
  const limit = Number(url.searchParams.get("limit") ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Invalid limit");
  const types = list(url, "type");
  const sources = list(url, "source");
  if (
    types?.some(
      (value) =>
        !Object.values(ActivityType).includes(value as ActivityTypeValue),
    ) ||
    sources?.some(
      (value) =>
        !Object.values(ActivitySource).includes(value as ActivitySourceValue),
    )
  )
    throw new Error("Invalid activity filter");
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  if (
    (startDate && !Number.isFinite(Date.parse(startDate))) ||
    (endDate && !Number.isFinite(Date.parse(endDate)))
  )
    throw new Error("Invalid date filter");
  return {
    type: types as ActivityTypeValue[] | undefined,
    source: sources as ActivitySourceValue[] | undefined,
    playerName: url.searchParams.get("playerName") ?? undefined,
    clanName: url.searchParams.get("clanName") ?? undefined,
    world: url.searchParams.get("world") ?? undefined,
    startDate,
    endDate,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit,
  };
};
