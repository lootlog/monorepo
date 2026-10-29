/** Transport schemas owned by the public catalog HTTP module. */
import * as Schema from "effect/Schema";
import { GameVersionSchema } from "@lootlog/schema/game-version";
import { FiniteNumber, SafeInteger } from "@lootlog/schema/http-scalars";
import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";

const FirstSeenOn = Schema.Union([Schema.String, Schema.Null]).annotate({
  description:
    "The day Lootlog first observed it, `YYYY-MM-DD` in Polish time; null when unknown.",
});

const CatalogSort = Schema.Literals(["relevance", "newest"]).annotate({
  description: "`newest` orders by the first observation, latest first.",
});

const CatalogItemSort = Schema.Literals([
  "relevance",
  "newest",
  "lvl:asc",
  "lvl:desc",
  "name:asc",
  "name:desc",
]).annotate({
  description: "`newest` orders by the first observation, latest first.",
});

const Profession = Schema.Literals(["w", "p", "h", "m", "b", "t"]);

/** Stats a public search may require; the rest stay out of the filter. */
export const CATALOG_STAT_KEYS = [
  "legbon",
  "hp",
  "crit",
  "critval",
  "evade",
  "sa",
  "pierce",
  "blok",
  "absorb",
  "heal",
  "energybon",
  "manabon",
] as const;

const CatalogStatKey = Schema.Literals(CATALOG_STAT_KEYS);

/** Legendary bonuses Margonem items carry, by their stat names. */
export const CATALOG_LEGENDARY_BONUSES = [
  "anguish",
  "cleanse",
  "critred",
  "curse",
  "dmgred",
  "facade",
  "frenzy",
  "glare",
  "holytouch",
  "lastheal",
  "puncture",
  "pushback",
  "resgain",
  "retaliation",
  "verycrit",
] as const;

const CatalogLegendaryBonus = Schema.Literals(CATALOG_LEGENDARY_BONUSES);

export const CatalogDropSourceDto_Output = Schema.Struct({
  key: Schema.String.annotate({
    description: "The NPC's catalog key, as `CatalogNpcDto_Output.key`.",
  }),
  id: FiniteNumber,
  name: Schema.String,
  lvl: Schema.Union([FiniteNumber, Schema.Null]),
  icon: Schema.Union([Schema.String, Schema.Null]),
  type: Schema.Union([Schema.String, Schema.Null]),
}).annotate({
  description: "An NPC an item drops from",
  identifier: "CatalogDropSourceDto_Output",
});

export const CatalogItemDto_Output = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  lvl: FiniteNumber,
  rarity: Schema.Union([Schema.String, Schema.Null]),
  type: Schema.Union([Schema.String, Schema.Null]),
  firstSeenOn: FirstSeenOn,
  droppedBy: Schema.Array(CatalogDropSourceDto_Output),
}).annotate({
  description: "A Margonem item in the public catalog",
  identifier: "CatalogItemDto_Output",
});

export type CatalogItemsResponseDto_Output =
  typeof CatalogItemsResponseDto_Output.Type;

export const CatalogItemsResponseDto_Output = Schema.Struct({
  hits: Schema.Array(CatalogItemDto_Output),
  estimatedTotalHits: FiniteNumber,
}).annotate({
  description: "Public catalog items",
  identifier: "CatalogItemsResponseDto_Output",
});

export type CatalogControllerGetItemsQuery =
  typeof CatalogControllerGetItemsQuery.Type;

const CatalogGameVersion = GameVersionSchema.annotate({
  description: "Only entries of this game edition.",
});

export const CatalogControllerGetItemsQuery = Schema.Struct({
  search: Schema.optionalKey(Schema.String),
  gameVersion: Schema.optionalKey(CatalogGameVersion),
  ids: Schema.optionalKey(Schema.Array(SafeInteger)),
  rarities: Schema.optionalKey(Schema.Array(ItemRaritySchema)),
  types: Schema.optionalKey(
    Schema.Array(Schema.String).annotate({
      description: "Item types, such as `ONE_HAND_WEAPON`.",
    }),
  ),
  professions: Schema.optionalKey(
    Schema.Array(Profession).annotate({
      description: "Items any of these professions can use.",
    }),
  ),
  minLevel: Schema.optionalKey(FiniteNumber),
  maxLevel: Schema.optionalKey(FiniteNumber),
  statKeys: Schema.optionalKey(
    Schema.Array(CatalogStatKey).annotate({
      description: "Items that have every one of these stats.",
    }),
  ),
  legendaryBonuses: Schema.optionalKey(
    Schema.Array(CatalogLegendaryBonus).annotate({
      description: "Items with any of these legendary bonuses.",
    }),
  ),
  dropSourceTypes: Schema.optionalKey(
    Schema.Array(NpcTypeSchema).annotate({
      description: "Items that drop from an NPC of any of these types.",
    }),
  ),
  firstSeenWithinDays: Schema.optionalKey(
    FiniteNumber.annotate({
      description: "Items Lootlog first observed in this many past days.",
    }),
  ),
  droppedBy: Schema.optionalKey(
    Schema.String.annotate({
      description: "Items that drop from the NPC with this catalog key.",
    }),
  ),
  sort: Schema.optionalKey(CatalogItemSort),
  limit: Schema.optionalKey(FiniteNumber.annotate({ default: 24 })),
  offset: Schema.optionalKey(FiniteNumber.annotate({ default: 0 })),
});

export const CatalogNpcDto_Output = Schema.Struct({
  key: Schema.String.annotate({
    description: "Stable catalog key of the NPC, used to link its page.",
  }),
  id: FiniteNumber,
  name: Schema.String,
  icon: Schema.String,
  lvl: FiniteNumber,
  type: NpcTypeSchema,
  gameVersion: GameVersionSchema,
  firstSeenOn: FirstSeenOn,
}).annotate({
  description: "A Margonem NPC in the public catalog",
  identifier: "CatalogNpcDto_Output",
});

export type CatalogNpcsResponseDto_Output =
  typeof CatalogNpcsResponseDto_Output.Type;

export const CatalogNpcsResponseDto_Output = Schema.Struct({
  hits: Schema.Array(CatalogNpcDto_Output),
  estimatedTotalHits: FiniteNumber,
}).annotate({
  description: "Public catalog NPCs",
  identifier: "CatalogNpcsResponseDto_Output",
});

export type CatalogControllerGetNpcsQuery =
  typeof CatalogControllerGetNpcsQuery.Type;

export const CatalogControllerGetNpcsQuery = Schema.Struct({
  search: Schema.optionalKey(Schema.String),
  gameVersion: Schema.optionalKey(CatalogGameVersion),
  ids: Schema.optionalKey(
    Schema.Array(SafeInteger).annotate({
      description: "NPC ids, as `CatalogNpcDto_Output.id`.",
    }),
  ),
  keys: Schema.optionalKey(Schema.Array(Schema.String)),
  types: Schema.optionalKey(Schema.Array(NpcTypeSchema)),
  sort: Schema.optionalKey(CatalogSort),
  limit: Schema.optionalKey(FiniteNumber.annotate({ default: 24 })),
  offset: Schema.optionalKey(FiniteNumber.annotate({ default: 0 })),
});
