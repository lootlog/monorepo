import { Function, Schema } from "effect";
import {
  ActivitySource,
  ActivityType,
  type ActivitySource as ActivitySourceValue,
  type ActivityType as ActivityTypeValue,
} from "#src/database/schema";

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
export type ActorSnapshotInput = typeof ActorSnapshot.Type;
export type CreateActivity = typeof BaseActivity.Type;
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

export const decodeCreateActivity = Function.compose(decodeBase, (value) => {
  if (
    (value.type === ActivityType.CONNECT_EVENT ||
      value.type === ActivityType.DISCONNECT_EVENT) &&
    !Schema.is(Schema.NonEmptyString)(value.details?.sessionId)
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
});

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
  const type = Schema.decodeUnknownOption(
    Schema.UndefinedOr(
      Schema.Array(Schema.Literals(Object.values(ActivityType))),
    ),
  )(types);
  const source = Schema.decodeUnknownOption(
    Schema.UndefinedOr(
      Schema.Array(Schema.Literals(Object.values(ActivitySource))),
    ),
  )(sources);
  if (type._tag === "None" || source._tag === "None") {
    throw new Error("Invalid activity filter");
  }
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  if (
    (startDate && !Number.isFinite(Date.parse(startDate))) ||
    (endDate && !Number.isFinite(Date.parse(endDate)))
  )
    throw new Error("Invalid date filter");
  return {
    type: type.value ? [...type.value] : undefined,
    source: source.value ? [...source.value] : undefined,
    playerName: url.searchParams.get("playerName") ?? undefined,
    clanName: url.searchParams.get("clanName") ?? undefined,
    world: url.searchParams.get("world") ?? undefined,
    startDate,
    endDate,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit,
  };
};
