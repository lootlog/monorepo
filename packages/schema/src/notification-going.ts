import { Schema } from "effect";
import { NpcRoutingDataSchema } from "./npc-routing.js";

/** A player who answered an NPC notification with "I'm going". */
export const NotificationGoingPlayerSchema = Schema.Struct({
  discordId: Schema.String,
  characterId: Schema.String,
  nick: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  clan: Schema.optionalKey(
    Schema.Struct({
      id: Schema.optionalKey(Schema.Number),
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
  reporterDiscordId: Schema.String,
  npcName: Schema.String,
  npc: Schema.Struct({ ...NpcRoutingDataSchema.fields, lvl: Schema.Number }),
  going: Schema.Array(NotificationGoingPlayerSchema),
});

export type NotificationGoingUpdate = typeof NotificationGoingUpdateSchema.Type;
