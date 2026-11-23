import { ActivityLogCreated } from "@lootlog/protocol/rabbit/events";
import { Schema } from "effect";
import type {
  ActivitySource as ActivitySourceValue,
  ActivityType as ActivityTypeValue,
} from "#src/database/schema";
import type { ActivityCursorPosition } from "./activity-cursor.js";

const StoredActorSnapshot = Schema.Struct({
  accountId: Schema.Finite,
  characterId: Schema.Finite,
  name: Schema.String,
  clanName: Schema.optional(Schema.String),
  clanId: Schema.optional(Schema.Finite),
  icon: Schema.String,
  lvl: Schema.Finite,
  prof: Schema.String,
});

const GameActorSnapshot = Schema.Struct({
  ...StoredActorSnapshot.fields,
  clanName: Schema.String,
  clanId: Schema.Finite,
});

const SessionDetails = Schema.StructWithRest(
  Schema.Struct({ sessionId: Schema.NonEmptyString }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

const CreateActivity = Schema.Union([
  Schema.Struct({
    ...ActivityLogCreated.fields,
    source: Schema.Literal("GAME"),
    details: SessionDetails,
    actorSnapshot: GameActorSnapshot,
  }),
  Schema.Struct({
    ...ActivityLogCreated.fields,
    source: Schema.Literal("WEB_APP"),
    details: SessionDetails,
    actorSnapshot: Schema.optional(StoredActorSnapshot),
  }),
]);

export type CreateActivity = typeof CreateActivity.Type;

export const decodeCreateActivity = Schema.decodeUnknownSync(CreateActivity);

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
  readonly cursor?: ActivityCursorPosition;
  readonly limit: number;
}
