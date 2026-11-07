/** Transport schemas owned by the public catalog HTTP module. */
import * as Schema from "effect/Schema";
import { GameVersionSchema } from "@lootlog/schema/game-version";
import { FiniteNumber, SafeInteger } from "@lootlog/schema/http-scalars";
import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";

// When Lootlog first saw an item or a boss tells when that boss was killed,
// and so when it respawns; the public catalog never serves or orders by it.
// Margonem numbers items in the order it adds them, so `id:desc` lists the
// game's newest items without dating anyone's drop.
const CatalogItemSort = Schema.Literals([
  "relevance",
  "id:desc",
  "changedOn:desc",
  "lvl:asc",
  "lvl:desc",
  "name:asc",
  "name:desc",
  "attackSpeed:desc",
  "upgradedAttackSpeed:desc",
]).annotate({
  description:
    "`id:desc` lists the items Margonem added most recently first. `changedOn:desc` lists first the items the game changed most recently, by the day their latest revision was first looted; items without a change follow. `attackSpeed:desc` lists first the items that add the most attack speed to a character with at least 100 agility: their own attack speed plus 0.002 for each point of agility or all attributes. `upgradedAttackSpeed:desc` ranks the same attack speed with each item upgraded to +5 and given the +5 bonus that adds the most of it: attack speed on weapons, agility or all attributes on other pieces.",
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
  // The events an item belongs to, such as `Wakacje 2026 r.`.
  "etiquette",
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
  retired: Schema.Boolean.annotate({
    description:
      "Whether the NPC no longer drops the item: Lootlog has recorded its loot far too often since the item's last drop for the gap to be chance.",
  }),
  dropRate: Schema.Union([
    Schema.Struct({
      drops: FiniteNumber.annotate({
        description: "Kills that dropped the item.",
      }),
      kills: FiniteNumber.annotate({
        description: "Kills that could have recorded the drop.",
      }),
    }),
    Schema.Null,
  ]).annotate({
    description:
      "How often the boss's kills drop the item, counted by the Organizations whose loot settings keep its rarity, from their hourly kill counts on. Lootlog recomputes it daily and gives none for other NPCs or under 100 such kills.",
  }),
}).annotate({
  description: "An NPC an item drops from",
  identifier: "CatalogDropSourceDto_Output",
});

export const CatalogItemRevisionDto_Output = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  lvl: FiniteNumber.annotate({
    description:
      "The level both revisions have; an elastic item's change is shown at one of its levels.",
  }),
  stat: Schema.String,
  previousName: Schema.String,
  previousIcon: Schema.String,
  previousStat: Schema.String,
  changedAfter: Schema.String.annotate({
    description:
      "The day in Poland, as `YYYY-MM-DD`, the old revision was last looted: the game changed the item after it.",
  }),
  changedBy: Schema.String.annotate({
    description:
      "The day in Poland, as `YYYY-MM-DD`, the new revision was first looted: the game changed the item by then.",
  }),
}).annotate({
  description: "A change the game made to an item",
  identifier: "CatalogItemRevisionDto_Output",
});

export const CatalogItemDto_Output = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  lvl: FiniteNumber,
  rarity: Schema.Union([Schema.String, Schema.Null]),
  type: Schema.Union([Schema.String, Schema.Null]),
  droppedBy: Schema.Array(CatalogDropSourceDto_Output),
  revisions: Schema.Array(CatalogItemRevisionDto_Output).annotate({
    description:
      "The changes the game made to the item, oldest first, as Lootlog saw them in loots. Revisions looted side by side, as variants are, are no history and are left out. Lootlog recomputes them daily.",
  }),
  elasticLevel: Schema.Boolean.annotate({
    description:
      "Whether the item takes the level of the character who loots it, so `lvl` and `stat` describe one of its levels.",
  }),
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
  minLevel: Schema.optionalKey(
    FiniteNumber.annotate({
      description:
        "Items of at least this level; elastic items match any range reaching into levels 40 to 300.",
    }),
  ),
  maxLevel: Schema.optionalKey(
    FiniteNumber.annotate({
      description:
        "Items of at most this level; elastic items match any range reaching into levels 40 to 300.",
    }),
  ),
  statKeys: Schema.optionalKey(
    Schema.Array(CatalogStatKey).annotate({
      description: "Items that have every one of these stats.",
    }),
  ),
  excludedStatKeys: Schema.optionalKey(
    Schema.Array(CatalogStatKey).annotate({
      description:
        "Items that have none of these stats; `etiquette` leaves out event items.",
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
  event: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "Items of the event with this slug: its name and year, such as `wakacje-2026`.",
    }),
  ),
  droppedBy: Schema.optionalKey(
    Schema.String.annotate({
      description: "Items that drop from the NPC with this catalog key.",
    }),
  ),
  availableSince: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u)).annotate({
      description:
        "Items a character on a world opened on this day (`YYYY-MM-DD`) can get: every item of no event, and event items of an edition that ended after it. Events end in the morning and worlds open later in the day, so an edition ending on the opening day is left out. An event without a year comes back, so its items stay.",
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
  locations: Schema.Array(
    Schema.Struct({
      map: Schema.String.annotate({ description: "The map's name." }),
      share: FiniteNumber.annotate({
        description:
          "The share of the NPC's latest recorded fights on the map, from 0 to 1, rounded to a hundredth.",
      }),
    }),
  ).annotate({
    description:
      "Maps the NPC is fought on, most fought first, from its latest 1000 recorded fights; maps under 1% of them are left out. Lootlog recomputes them daily, so an NPC first seen today may have none yet.",
  }),
  formerLevels: Schema.Array(
    Schema.Struct({
      lvl: FiniteNumber.annotate({ description: "The level it had." }),
      until: Schema.String.annotate({
        description:
          "The UTC day, as `YYYY-MM-DD`, its next level was first recorded.",
      }),
    }),
  ).annotate({
    description:
      "Levels the NPC had before the game changed it, oldest first. Lootlog recomputes them daily from recorded fights and leaves out NPCs whose level follows the player's.",
  }),
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
  keys: Schema.optionalKey(
    Schema.Array(Schema.String).annotate({
      description:
        "Catalog keys, as `CatalogNpcDto_Output.key`. A lookup by key ignores `search`.",
    }),
  ),
  types: Schema.optionalKey(Schema.Array(NpcTypeSchema)),
  limit: Schema.optionalKey(FiniteNumber.annotate({ default: 24 })),
  offset: Schema.optionalKey(FiniteNumber.annotate({ default: 0 })),
});

export const CatalogEventDto_Output = Schema.Struct({
  slug: Schema.String.annotate({
    description:
      "The event's slug, its name and year, such as `halloween-2026`; `CatalogControllerGetItemsQuery.event` lists its items.",
  }),
  name: Schema.String.annotate({
    description:
      "The event as the game writes it, such as `Halloween 2026 r.`.",
  }),
  year: Schema.Union([FiniteNumber, Schema.Null]).annotate({
    description: "The year its name gives; none for an event without one.",
  }),
  itemCount: FiniteNumber.annotate({
    description: "How many catalog items belong to the event.",
  }),
  boss: Schema.Union([
    Schema.Struct({
      name: Schema.String,
      icon: Schema.Union([Schema.String, Schema.Null]),
    }),
    Schema.Null,
  ]).annotate({
    description:
      "The strongest monster its highest-level item drops from, which pictures the event; none when Lootlog has not seen that item drop.",
  }),
}).annotate({
  description: "A Margonem event whose items are in the public catalog",
  identifier: "CatalogEventDto_Output",
});

export type CatalogEventsResponseDto_Output =
  typeof CatalogEventsResponseDto_Output.Type;

export const CatalogEventsResponseDto_Output = Schema.Struct({
  events: Schema.Array(CatalogEventDto_Output).annotate({
    description: "The latest year first, then by name.",
  }),
}).annotate({
  description: "Public catalog events",
  identifier: "CatalogEventsResponseDto_Output",
});

export type CatalogControllerGetEventsQuery =
  typeof CatalogControllerGetEventsQuery.Type;

export const CatalogControllerGetEventsQuery = Schema.Struct({
  gameVersion: Schema.optionalKey(CatalogGameVersion),
});

const CatalogIndexEntryDto_Output = Schema.Struct({
  id: SafeInteger,
  name: Schema.String,
}).annotate({
  description:
    "A catalog entry by the id and name its links carry, such as `/items/41392-odzienie-dominujacego-czaru` on the wiki.",
  identifier: "CatalogIndexEntryDto_Output",
});

export type CatalogIndexResponseDto_Output =
  typeof CatalogIndexResponseDto_Output.Type;

export const CatalogIndexResponseDto_Output = Schema.Struct({
  items: Schema.Array(CatalogIndexEntryDto_Output).annotate({
    description: "Every item, by id.",
  }),
  npcs: Schema.Array(CatalogIndexEntryDto_Output).annotate({
    description:
      "Every NPC as it is now, once per monster, as `CatalogControllerGetNpcs` lists it; by id.",
  }),
}).annotate({
  description:
    "Every item and NPC of the public catalog, unlike its searches, which stop at 1000 hits",
  identifier: "CatalogIndexResponseDto_Output",
});

export type CatalogControllerGetIndexQuery =
  typeof CatalogControllerGetIndexQuery.Type;

export const CatalogControllerGetIndexQuery = Schema.Struct({
  gameVersion: Schema.optionalKey(CatalogGameVersion),
});
