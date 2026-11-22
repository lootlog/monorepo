import { GameVersionSchema } from "@lootlog/schema/game-version";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { Schema } from "effect";

const ObservedAt = Schema.String;

const CatalogDropSource = Schema.Struct({
  id: Schema.Finite,
  identityNamespace: NpcIdentityNamespaceSchema,
  name: Schema.String,
  lvl: Schema.NullOr(Schema.Finite),
  icon: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  margonemType: Schema.NullOr(Schema.Finite),
  gameVersion: GameVersionSchema,
});

export const CatalogItemObservation = Schema.Struct({
  id: Schema.Finite,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  lvl: Schema.Finite,
  rarity: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  worlds: Schema.Array(Schema.String),
  gameVersion: GameVersionSchema,
  observedAt: ObservedAt,
  droppedBy: Schema.optionalKey(CatalogDropSource),
});

export type CatalogItemObservation = typeof CatalogItemObservation.Type;

export const CatalogNpcObservation = Schema.Struct({
  id: Schema.Finite,
  identityNamespace: NpcIdentityNamespaceSchema,
  prof: Schema.NullishOr(Schema.String),
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Finite,
  wt: Schema.Finite,
  type: Schema.String,
  margonemType: Schema.Finite,
  world: Schema.String,
  gameVersion: GameVersionSchema,
  snapshotHash: Schema.optionalKey(Schema.String),
  lootId: Schema.Finite,
  observedAt: ObservedAt,
});

export type CatalogNpcObservation = typeof CatalogNpcObservation.Type;

const CatalogLootMode = Schema.Literals(["SHARED", "PERSONAL"]);

const CatalogLootRollsBasis = Schema.Literals(["PARTY", "LOOTS"]);

export const CatalogMonsterDrops = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  retiredItemIds: Schema.Array(Schema.Finite),
  lootMode: CatalogLootMode,
  dropRates: Schema.Array(
    Schema.Struct({
      itemId: Schema.Finite,
      drops: Schema.Finite,
      kills: Schema.Finite,
      rolls: Schema.Finite,
      basis: CatalogLootRollsBasis,
    }),
  ),
});

export type CatalogMonsterDrops = typeof CatalogMonsterDrops.Type;

const Day = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

const CatalogItemRevision = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  lvl: Schema.Finite,
  stat: Schema.String,
  previousName: Schema.String,
  previousIcon: Schema.String,
  previousStat: Schema.String,
  changedAfter: Day,
  changedBy: Day,
});

export const CatalogItemRevisions = Schema.Struct({
  gameVersion: GameVersionSchema,
  id: Schema.Finite,
  revisions: Schema.Array(CatalogItemRevision),
});

export type CatalogItemRevisions = typeof CatalogItemRevisions.Type;

const CatalogMonsterSpawnTile = Schema.Struct({
  x: Schema.Finite,
  y: Schema.Finite,
});

export const CatalogMonsterLocation = Schema.Struct({
  map: Schema.String,
  share: Schema.Finite,
  tiles: Schema.optionalKey(Schema.Array(CatalogMonsterSpawnTile)),
});

export const CatalogMonsterFormerLevel = Schema.Struct({
  lvl: Schema.Finite,
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
