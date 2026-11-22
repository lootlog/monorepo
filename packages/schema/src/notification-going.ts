import { Schema } from "effect";
import { FiniteNumber } from "./http-scalars.js";
import { NpcRoutingDataSchema } from "./npc-routing.js";

/** A player who answered an NPC notification with "I'm going". */
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

/**
 * Everyone of one Lootlog going to the NPC of a notification. It is scoped to
 * a single Lootlog: a member's answer never reaches another Organization that
 * received the same notification.
 */
export const NotificationGoingUpdateSchema = Schema.Struct({
  guildId: Schema.String,
  world: Schema.String,
  notificationId: Schema.String,
  // Who reported the NPC: they never see their own notification, so their
  // client tells them who answered.
  reporterUserId: Schema.String,
  npcName: Schema.String,
  // The NPC's game id: reports of one NPC share its answers, so each client
  // lists them under whichever report it shows. An update of a notification
  // stored before this field existed leaves it out.
  npcId: Schema.optionalKey(FiniteNumber),
  npc: Schema.Struct({ ...NpcRoutingDataSchema.fields, lvl: Schema.Finite }),
  going: Schema.Array(NotificationGoingPlayerSchema),
});

export type NotificationGoingUpdate = typeof NotificationGoingUpdateSchema.Type;
