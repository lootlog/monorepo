import { ActivityLogCreated } from "@lootlog/protocol/rabbit/events";
import { Function, Schema } from "effect";
import {
  ActivitySource,
  ActivityType,
  type ActivitySource as ActivitySourceValue,
  type ActivityType as ActivityTypeValue,
} from "#src/database/schema";

export type CreateActivity = ActivityLogCreated;

const decodeBase = Schema.decodeUnknownSync(ActivityLogCreated);

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
