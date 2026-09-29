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

const GuildMemberRemoved = Schema.Struct({
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
