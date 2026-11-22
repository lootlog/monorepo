import { GameVersionSchema } from "@lootlog/schema/game-version";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { Schema } from "effect";

const ObservedAt = Schema.String;

const CatalogDropSource = Schema.Struct({
  id: Schema.Number,
  identityNamespace: NpcIdentityNamespaceSchema,
  name: Schema.String,
  lvl: Schema.NullOr(Schema.Number),
  icon: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  margonemType: Schema.NullOr(Schema.Number),
  gameVersion: GameVersionSchema,
});

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
  droppedBy: Schema.optionalKey(CatalogDropSource),
});

export type CatalogItemObservation = typeof CatalogItemObservation.Type;

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
  lootId: Schema.Number,
  observedAt: ObservedAt,
});

export type CatalogNpcObservation = typeof CatalogNpcObservation.Type;

const CatalogLootMode = Schema.Literals(["SHARED", "PERSONAL"]);

const CatalogLootRollsBasis = Schema.Literals(["PARTY", "LOOTS"]);

export const CatalogMonsterDrops = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  retiredItemIds: Schema.Array(Schema.Number),
  lootMode: CatalogLootMode,
  dropRates: Schema.Array(
    Schema.Struct({
      itemId: Schema.Number,
      drops: Schema.Number,
      kills: Schema.Number,
      rolls: Schema.Number,
      basis: CatalogLootRollsBasis,
    }),
  ),
});

export type CatalogMonsterDrops = typeof CatalogMonsterDrops.Type;

const Day = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

const CatalogItemRevision = Schema.Struct({
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

export const CatalogItemRevisions = Schema.Struct({
  gameVersion: GameVersionSchema,
  id: Schema.Number,
  revisions: Schema.Array(CatalogItemRevision),
});

export type CatalogItemRevisions = typeof CatalogItemRevisions.Type;

const CatalogMonsterSpawnTile = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
});

export const CatalogMonsterLocation = Schema.Struct({
  map: Schema.String,
  share: Schema.Number,
  tiles: Schema.optionalKey(Schema.Array(CatalogMonsterSpawnTile)),
});

export const CatalogMonsterFormerLevel = Schema.Struct({
  lvl: Schema.Number,
  until: Schema.String,
});

export const CatalogMonsterLocations = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  locations: Schema.Array(CatalogMonsterLocation),
  formerLevels: Schema.Array(CatalogMonsterFormerLevel),
});

export type CatalogMonsterLocations = typeof CatalogMonsterLocations.Type;
