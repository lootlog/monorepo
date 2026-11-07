/**
 * What the API publishes to the catalog service: observations of items and
 * NPCs from accepted loots, and the statistics it derives from them each
 * morning. Each message body is an array of one of these.
 */
import { GameVersionSchema } from "@lootlog/schema/game-version";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { Schema } from "effect";

/** When the API accepted the loot that made an observation. */
const ObservedAt = Schema.String;

/** The NPC a dialog or fight's items came from, in its catalog identity. */
export const CatalogDropSource = Schema.Struct({
  id: Schema.Number,
  identityNamespace: NpcIdentityNamespaceSchema,
  name: Schema.String,
  lvl: Schema.NullOr(Schema.Number),
  icon: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  margonemType: Schema.NullOr(Schema.Number),
  gameVersion: GameVersionSchema,
});

/** One item revision as loots observed it in some worlds. */
export const CatalogItemObservation = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  lvl: Schema.Number,
  rarity: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  worlds: Schema.Array(Schema.String),
  gameVersion: GameVersionSchema,
  observedAt: ObservedAt,
  // Absent for lootboxes and for dialogs and fights without one source.
  droppedBy: Schema.optionalKey(CatalogDropSource),
});

export type CatalogItemObservation = typeof CatalogItemObservation.Type;

/** One NPC revision as a loot in one world observed it. */
export const CatalogNpcObservation = Schema.Struct({
  id: Schema.Number,
  identityNamespace: NpcIdentityNamespaceSchema,
  prof: Schema.NullishOr(Schema.String),
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  wt: Schema.Number,
  type: Schema.String,
  margonemType: Schema.Number,
  world: Schema.String,
  gameVersion: GameVersionSchema,
  snapshotHash: Schema.optionalKey(Schema.String),
  /** The loot that observed it; loot ids order observations. */
  lootId: Schema.Number,
  observedAt: ObservedAt,
});

export type CatalogNpcObservation = typeof CatalogNpcObservation.Type;

/**
 * The items a monster no longer drops and how often its kills drop each
 * item; both lists are all of them.
 */
export const CatalogMonsterDrops = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  retiredItemIds: Schema.Array(Schema.Number),
  dropRates: Schema.Array(
    Schema.Struct({
      itemId: Schema.Number,
      drops: Schema.Number,
      kills: Schema.Number,
    }),
  ),
});

export type CatalogMonsterDrops = typeof CatalogMonsterDrops.Type;

/** A calendar day in Poland, as `YYYY-MM-DD`. */
const Day = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

/**
 * One change the game made to an item, between the day its old revision was
 * last looted and the day the new one was first looted.
 */
export const CatalogItemRevision = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  lvl: Schema.Number,
  stat: Schema.String,
  previousName: Schema.String,
  previousIcon: Schema.String,
  previousStat: Schema.String,
  changedAfter: Day,
  changedBy: Day,
});

/** An item's changes, oldest first; the list is all of them. */
export const CatalogItemRevisions = Schema.Struct({
  gameVersion: GameVersionSchema,
  id: Schema.Number,
  revisions: Schema.Array(CatalogItemRevision),
});

export type CatalogItemRevisions = typeof CatalogItemRevisions.Type;

/** A map a monster is fought on, with the share of its latest fights there. */
export const CatalogMonsterLocation = Schema.Struct({
  map: Schema.String,
  share: Schema.Number,
});

/** A level a monster had before, until the day its next version appeared. */
export const CatalogMonsterFormerLevel = Schema.Struct({
  lvl: Schema.Number,
  until: Schema.String,
});

/**
 * The maps a monster is fought on and the levels it had before; each list is
 * all of them.
 */
export const CatalogMonsterLocations = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  locations: Schema.Array(CatalogMonsterLocation),
  formerLevels: Schema.Array(CatalogMonsterFormerLevel),
});

export type CatalogMonsterLocations = typeof CatalogMonsterLocations.Type;
