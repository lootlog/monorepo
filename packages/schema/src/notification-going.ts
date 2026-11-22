import { Schema } from "effect";
import { FiniteNumber } from "./http-scalars.js";
import { NpcRoutingDataSchema } from "./npc-routing.js";

export const NotificationGoingPlayerSchema = Schema.Struct({
  userId: Schema.String,
  characterId: Schema.String,
  nick: Schema.String,
  lvl: FiniteNumber,
  prof: Schema.String,
  icon: Schema.String,
  clan: Schema.optionalKey(
    Schema.Struct({
      id: Schema.optionalKey(FiniteNumber),
      name: Schema.optionalKey(Schema.String),
    }),
  ),
});

export type NotificationGoingPlayer = typeof NotificationGoingPlayerSchema.Type;

export const NotificationGoingUpdateSchema = Schema.Struct({
  guildId: Schema.String,
  world: Schema.String,
  notificationId: Schema.String,
  reporterUserId: Schema.String,
  npcName: Schema.String,
  npcId: Schema.optionalKey(FiniteNumber),
  npc: Schema.Struct({ ...NpcRoutingDataSchema.fields, lvl: Schema.Number }),
  going: Schema.Array(NotificationGoingPlayerSchema),
});

export type NotificationGoingUpdate = typeof NotificationGoingUpdateSchema.Type;
