import { Schema } from "effect";
import type { NpcTypeEnum } from "./npc-type.js";

export const NpcRoutingTierSchema = Schema.Literals([
  "base",
  "titans",
  "heroes",
]);

export type NpcRoutingTier = typeof NpcRoutingTierSchema.Type;

const NPC_ROUTING_TIER_BY_TYPE: Record<NpcTypeEnum, NpcRoutingTier> = {
  COMMON: "base",
  ELITE: "base",
  ELITE2: "base",
  ELITE3: "base",
  HERO: "heroes",
  EVENT_HERO: "heroes",
  COLOSSUS: "base",
  TITAN: "titans",
  HERO_TRACKER: "heroes",
  NPC: "base",
};

/** The permission tier that gates timers, chat and notifications of an NPC type. */
export const getNpcTypeRoutingTier = (npcType: NpcTypeEnum): NpcRoutingTier =>
  NPC_ROUTING_TIER_BY_TYPE[npcType];

export const NpcRoutingDataSchema = Schema.Struct({
  prof: Schema.optionalKey(Schema.NullOr(Schema.String)),
  type: Schema.optionalKey(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
  wt: Schema.optionalKey(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
  icon: Schema.optionalKey(Schema.NullOr(Schema.String)),
  isHeroFromEvent: Schema.optionalKey(Schema.Boolean),
  /** Only the name identifies a Hero Tracker; its template has no weight or profession. */
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

export type NpcRoutingData = typeof NpcRoutingDataSchema.Type;
