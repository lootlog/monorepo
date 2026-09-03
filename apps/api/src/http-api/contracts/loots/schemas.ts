/** Transport schemas owned by the loots HTTP module. */
import * as Schema from "effect/Schema";
import {
  DateTimeWithOffsetString,
  DateTimeString,
  FiniteNumber,
} from "../scalars.js";

export type LootResponseDto = typeof LootResponseDto.Type;

export const LootResponseDto = Schema.Struct({
  id: FiniteNumber,
  uniqueId: Schema.String,
  world: Schema.String,
  source: Schema.Literals(["LOOTBOX", "DIALOG", "FIGHT"]),
  location: Schema.String,
  items: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      hid: Schema.String,
      name: Schema.String,
      icon: Schema.String,
      stat: Schema.String,
      type: Schema.Union([Schema.String, Schema.Null]),
      rarity: Schema.Union([
        Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
        Schema.Null,
      ]),
      lvl: FiniteNumber,
      prof: Schema.Array(
        Schema.Literals([
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ]),
      ),
    }),
  ),
  players: Schema.Array(
    Schema.Struct({
      id: Schema.Union([Schema.String, FiniteNumber]),
      name: Schema.String,
      lvl: Schema.Union([FiniteNumber, Schema.Null]),
      prof: Schema.Union([
        Schema.Literals([
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ]),
        Schema.Null,
      ]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      characterId: Schema.Union([FiniteNumber, Schema.Null]),
      accountId: Schema.Union([FiniteNumber, Schema.Null]),
      hpp: Schema.Union([FiniteNumber, Schema.Null]),
    }),
  ),
  npcs: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      name: Schema.String,
      wt: Schema.Union([FiniteNumber, Schema.Null]),
      lvl: Schema.Union([FiniteNumber, Schema.Null]),
      prof: Schema.Union([
        Schema.Literals([
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ]),
        Schema.Null,
      ]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      type: Schema.Union([
        Schema.Literals([
          "COMMON",
          "ELITE",
          "ELITE2",
          "ELITE3",
          "HERO",
          "EVENT_HERO",
          "TITAN",
          "COLOSSUS",
          "NPC",
        ]),
        Schema.Null,
      ]),
      margonemType: Schema.Union([FiniteNumber, Schema.Null]),
    }),
  ),
  lootShare: Schema.Record(Schema.String, Schema.Array(Schema.String)),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  submissions: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        guildId: Schema.String,
        memberId: FiniteNumber,
        lootId: FiniteNumber,
        member: Schema.Struct({
          name: Schema.String,
          avatar: Schema.optionalKey(
            Schema.Union([Schema.String, Schema.Null]),
          ),
          userId: Schema.String,
        }),
      }),
    ),
  ),
  commentsCount: FiniteNumber,
}).annotate({ identifier: "LootResponseDto" });

export type LootStatsResponseDto_Output =
  typeof LootStatsResponseDto_Output.Type;

export const LootStatsResponseDto_Output = Schema.Struct({
  overview: Schema.Struct({
    totalLoots: FiniteNumber,
    totalItems: FiniteNumber,
    legendaryItems: FiniteNumber,
    heroicItems: FiniteNumber,
    avgItemLevel: FiniteNumber,
  }),
  byRarity: Schema.Record(
    Schema.String,
    Schema.Struct({
      count: FiniteNumber,
      percentage: FiniteNumber,
    }),
  ),
  timeline: Schema.Array(
    Schema.Struct({
      date: Schema.String,
      total: FiniteNumber,
      byRarity: Schema.Record(Schema.String, FiniteNumber),
    }),
  ),
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: FiniteNumber,
      name: Schema.String,
      type: Schema.Union([
        Schema.Literals([
          "COMMON",
          "ELITE",
          "ELITE2",
          "ELITE3",
          "HERO",
          "EVENT_HERO",
          "TITAN",
          "COLOSSUS",
          "NPC",
        ]),
        Schema.Null,
      ]),
      lvl: Schema.Union([FiniteNumber, Schema.Null]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      count: FiniteNumber,
      byRarity: Schema.Record(Schema.String, FiniteNumber),
    }),
  ),
  topContributors: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      name: Schema.String,
      avatar: Schema.Union([Schema.String, Schema.Null]),
      userId: Schema.String,
      count: FiniteNumber,
      byRarity: Schema.Record(Schema.String, FiniteNumber),
    }),
  ),
  topItems: Schema.Array(
    Schema.Struct({
      itemId: FiniteNumber,
      hid: Schema.String,
      name: Schema.String,
      icon: Schema.String,
      rarity: Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
      lvl: FiniteNumber,
      count: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "LootStatsResponseDto_Output" });

export type CountResponseDto_Output = typeof CountResponseDto_Output.Type;

export const CountResponseDto_Output = Schema.Struct({
  count: FiniteNumber,
}).annotate({ identifier: "CountResponseDto_Output" });

export type NullableLootItemResponseDto_Output =
  typeof NullableLootItemResponseDto_Output.Type;

export const NullableLootItemResponseDto_Output = Schema.Struct({
  id: FiniteNumber,
  hid: Schema.String,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  type: Schema.Union([Schema.String, Schema.Null]),
  rarity: Schema.Union([
    Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
    Schema.Null,
  ]),
  lvl: FiniteNumber,
  prof: Schema.Array(
    Schema.Literals([
      "WARRIOR",
      "PALADIN",
      "HUNTER",
      "MAGE",
      "BLADE_DANCER",
      "TRACKER",
    ]),
  ),
}).annotate({ identifier: "NullableLootItemResponseDto_Output" });

export type NullableLootResponseDto = typeof NullableLootResponseDto.Type;

export const NullableLootResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: FiniteNumber,
      uniqueId: Schema.String,
      world: Schema.String,
      source: Schema.Literals(["LOOTBOX", "DIALOG", "FIGHT"]),
      location: Schema.String,
      items: Schema.Array(
        Schema.Struct({
          id: FiniteNumber,
          hid: Schema.String,
          name: Schema.String,
          icon: Schema.String,
          stat: Schema.String,
          type: Schema.Union([Schema.String, Schema.Null]),
          rarity: Schema.Union([
            Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
            Schema.Null,
          ]),
          lvl: FiniteNumber,
          prof: Schema.Array(
            Schema.Literals([
              "WARRIOR",
              "PALADIN",
              "HUNTER",
              "MAGE",
              "BLADE_DANCER",
              "TRACKER",
            ]),
          ),
        }),
      ),
      players: Schema.Array(
        Schema.Struct({
          id: Schema.Union([Schema.String, FiniteNumber]),
          name: Schema.String,
          lvl: Schema.Union([FiniteNumber, Schema.Null]),
          prof: Schema.Union([
            Schema.Literals([
              "WARRIOR",
              "PALADIN",
              "HUNTER",
              "MAGE",
              "BLADE_DANCER",
              "TRACKER",
            ]),
            Schema.Null,
          ]),
          icon: Schema.Union([Schema.String, Schema.Null]),
          characterId: Schema.Union([FiniteNumber, Schema.Null]),
          accountId: Schema.Union([FiniteNumber, Schema.Null]),
          hpp: Schema.Union([FiniteNumber, Schema.Null]),
        }),
      ),
      npcs: Schema.Array(
        Schema.Struct({
          id: FiniteNumber,
          name: Schema.String,
          wt: Schema.Union([FiniteNumber, Schema.Null]),
          lvl: Schema.Union([FiniteNumber, Schema.Null]),
          prof: Schema.Union([
            Schema.Literals([
              "WARRIOR",
              "PALADIN",
              "HUNTER",
              "MAGE",
              "BLADE_DANCER",
              "TRACKER",
            ]),
            Schema.Null,
          ]),
          icon: Schema.Union([Schema.String, Schema.Null]),
          type: Schema.Union([
            Schema.Literals([
              "COMMON",
              "ELITE",
              "ELITE2",
              "ELITE3",
              "HERO",
              "EVENT_HERO",
              "TITAN",
              "COLOSSUS",
              "NPC",
            ]),
            Schema.Null,
          ]),
          margonemType: Schema.Union([FiniteNumber, Schema.Null]),
        }),
      ),
      lootShare: Schema.Record(Schema.String, Schema.Array(Schema.String)),
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
      submissions: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({
            guildId: Schema.String,
            memberId: FiniteNumber,
            lootId: FiniteNumber,
            member: Schema.Struct({
              name: Schema.String,
              avatar: Schema.optionalKey(
                Schema.Union([Schema.String, Schema.Null]),
              ),
              userId: Schema.String,
            }),
          }),
        ),
      ),
      commentsCount: FiniteNumber,
    }),
    [
      Schema.Record(
        Schema.String,
        Schema.Json.annotate({ expected: "JSON value" }),
      ),
    ],
  ),
  Schema.Null,
]).annotate({ identifier: "NullableLootResponseDto" });

export type CreateLootDto = typeof CreateLootDto.Type;

export const CreateLootDto = Schema.Struct({
  loots: Schema.Array(
    Schema.Struct({
      hid: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      pr: FiniteNumber,
      prc: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      stat: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      id: FiniteNumber,
      cl: FiniteNumber,
      own: Schema.optionalKey(FiniteNumber),
    }),
  )
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isMaxLength(10).annotate({
        expected: "a value with a length of at most 10",
      }),
    ),
  npcs: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      location: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      lvl: FiniteNumber,
      prof: Schema.optionalKey(Schema.String),
      wt: FiniteNumber,
      hpp: Schema.optionalKey(FiniteNumber),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: FiniteNumber,
      x: Schema.optionalKey(FiniteNumber),
      y: Schema.optionalKey(FiniteNumber),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  players: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      accountId: FiniteNumber,
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      lvl: FiniteNumber,
      prof: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      hpp: Schema.optionalKey(FiniteNumber),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  source: Schema.Literals(["LOOTBOX", "DIALOG", "FIGHT"]),
  location: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  accountId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  characterId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "CreateLootDto" });

export type CreateLootResponseDto_Output =
  typeof CreateLootResponseDto_Output.Type;

export const CreateLootResponseDto_Output = Schema.Struct({
  id: FiniteNumber,
  submittedGuilds: Schema.Array(
    Schema.Struct({ guildId: Schema.String, guildName: Schema.String }),
  ),
  rejectedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      guildName: Schema.String,
      reason: Schema.Literals([
        "NOT_ON_CHARACTER_WHITELIST",
        "MISSING_LOOTLOG_CONFIG",
        "LOOT_NOT_ACCEPTED_BY_CONFIG",
        "MISSING_MEMBER",
      ]),
    }),
  ),
}).annotate({ identifier: "CreateLootResponseDto_Output" });

export type LootCommentResponseDto = typeof LootCommentResponseDto.Type;

export const LootCommentResponseDto = Schema.Struct({
  id: FiniteNumber,
  lootId: FiniteNumber,
  guildId: Schema.String,
  content: Schema.String,
  member: Schema.Struct({
    name: Schema.String,
    avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
    userId: Schema.String,
    roles: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          color: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
        }),
      ),
    ),
  }),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "LootCommentResponseDto" });

export type CreateCommentDto = typeof CreateCommentDto.Type;

export const CreateCommentDto = Schema.Struct({
  content: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "CreateCommentDto" });

export type UpdateLootDto = typeof UpdateLootDto.Type;

export const UpdateLootDto = Schema.Struct({ msg: Schema.String }).annotate({
  identifier: "UpdateLootDto",
});

export type LootShareResponseDto_Output =
  typeof LootShareResponseDto_Output.Type;

export const LootShareResponseDto_Output = Schema.Record(
  Schema.String,
  Schema.Array(Schema.String),
).annotate({ identifier: "LootShareResponseDto_Output" });

export type LootsControllerFetchLootsByGuildIdPathParams =
  typeof LootsControllerFetchLootsByGuildIdPathParams.Type;

export const LootsControllerFetchLootsByGuildIdPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerFetchLootsByGuildIdQuery =
  typeof LootsControllerFetchLootsByGuildIdQuery.Type;

export const LootsControllerFetchLootsByGuildIdQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: "a value less than or equal to 100",
        }),
      ),
  ),
  cursor: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  npcs: Schema.optionalKey(Schema.Array(Schema.String)),
  players: Schema.optionalKey(Schema.Array(Schema.String)),
  rarities: Schema.optionalKey(Schema.Array(Schema.String)),
  professions: Schema.optionalKey(Schema.Array(Schema.String)),
  npcTypes: Schema.optionalKey(Schema.Array(Schema.String)),
  world: Schema.optionalKey(Schema.String),
  npcLevelMin: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  npcLevelMax: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  itemLevelMin: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  itemLevelMax: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  playerLevelMin: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  playerLevelMax: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  search: Schema.optionalKey(Schema.String),
  hid: Schema.optionalKey(Schema.String),
  itemNames: Schema.optionalKey(Schema.Array(Schema.String)),
  createdAtMin: Schema.optionalKey(DateTimeWithOffsetString),
  createdAtMax: Schema.optionalKey(DateTimeWithOffsetString),
});

export type LootsControllerFetchLootsByGuildId200 =
  typeof LootsControllerFetchLootsByGuildId200.Type;

export const LootsControllerFetchLootsByGuildId200 =
  Schema.Array(LootResponseDto);

export type LootsControllerGetLootStatsPathParams =
  typeof LootsControllerGetLootStatsPathParams.Type;

export const LootsControllerGetLootStatsPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerGetLootStatsQuery =
  typeof LootsControllerGetLootStatsQuery.Type;

export const LootsControllerGetLootStatsQuery = Schema.Struct({
  period: Schema.optionalKey(
    Schema.Literals([
      "24h",
      "3d",
      "7d",
      "14d",
      "30d",
      "90d",
      "180d",
      "all",
    ]).annotate({ default: "7d" }),
  ),
  world: Schema.optionalKey(Schema.String),
  npcTypes: Schema.optionalKey(Schema.String),
  excludeColossus: Schema.optionalKey(Schema.Boolean),
});

export type LootsControllerGetLootStats200 =
  typeof LootsControllerGetLootStats200.Type;

export const LootsControllerGetLootStats200 = LootStatsResponseDto_Output;

export type LootsControllerCountLootsByGuildIdPathParams =
  typeof LootsControllerCountLootsByGuildIdPathParams.Type;

export const LootsControllerCountLootsByGuildIdPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerCountLootsByGuildIdQuery =
  typeof LootsControllerCountLootsByGuildIdQuery.Type;

export const LootsControllerCountLootsByGuildIdQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: "a value less than or equal to 100",
        }),
      ),
  ),
  cursor: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  npcs: Schema.optionalKey(Schema.Array(Schema.String)),
  players: Schema.optionalKey(Schema.Array(Schema.String)),
  rarities: Schema.optionalKey(Schema.Array(Schema.String)),
  professions: Schema.optionalKey(Schema.Array(Schema.String)),
  npcTypes: Schema.optionalKey(Schema.Array(Schema.String)),
  world: Schema.optionalKey(Schema.String),
  npcLevelMin: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  npcLevelMax: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  itemLevelMin: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  itemLevelMax: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  playerLevelMin: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  playerLevelMax: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  search: Schema.optionalKey(Schema.String),
  hid: Schema.optionalKey(Schema.String),
  itemNames: Schema.optionalKey(Schema.Array(Schema.String)),
  createdAtMin: Schema.optionalKey(DateTimeWithOffsetString),
  createdAtMax: Schema.optionalKey(DateTimeWithOffsetString),
});

export type LootsControllerCountLootsByGuildId200 =
  typeof LootsControllerCountLootsByGuildId200.Type;

export const LootsControllerCountLootsByGuildId200 = CountResponseDto_Output;

export type LootsControllerResolveLootItemByHidPathParams =
  typeof LootsControllerResolveLootItemByHidPathParams.Type;

export const LootsControllerResolveLootItemByHidPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerResolveLootItemByHidQuery =
  typeof LootsControllerResolveLootItemByHidQuery.Type;

export const LootsControllerResolveLootItemByHidQuery = Schema.Struct({
  hid: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  world: Schema.optionalKey(Schema.String),
});

export type LootsControllerResolveLootItemByHid200 =
  typeof LootsControllerResolveLootItemByHid200.Type;

export const LootsControllerResolveLootItemByHid200 =
  NullableLootItemResponseDto_Output;

export type LootsControllerFetchLootByIdPathParams =
  typeof LootsControllerFetchLootByIdPathParams.Type;

export const LootsControllerFetchLootByIdPathParams = Schema.Struct({
  lootId: FiniteNumber,
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerFetchLootById200 =
  typeof LootsControllerFetchLootById200.Type;

export const LootsControllerFetchLootById200 = NullableLootResponseDto;

export type LootsControllerDeleteLootPathParams =
  typeof LootsControllerDeleteLootPathParams.Type;

export const LootsControllerDeleteLootPathParams = Schema.Struct({
  lootId: FiniteNumber,
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerCreateLootRequestJson =
  typeof LootsControllerCreateLootRequestJson.Type;

export const LootsControllerCreateLootRequestJson = CreateLootDto;

export type LootsControllerCreateLoot201 =
  typeof LootsControllerCreateLoot201.Type;

export const LootsControllerCreateLoot201 = CreateLootResponseDto_Output;

export type LootsControllerGetCommentsPathParams =
  typeof LootsControllerGetCommentsPathParams.Type;

export const LootsControllerGetCommentsPathParams = Schema.Struct({
  lootId: FiniteNumber,
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerGetComments200 =
  typeof LootsControllerGetComments200.Type;

export const LootsControllerGetComments200 = Schema.Array(
  LootCommentResponseDto,
);

export type LootsControllerCreateCommentPathParams =
  typeof LootsControllerCreateCommentPathParams.Type;

export const LootsControllerCreateCommentPathParams = Schema.Struct({
  lootId: FiniteNumber,
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerCreateCommentRequestJson =
  typeof LootsControllerCreateCommentRequestJson.Type;

export const LootsControllerCreateCommentRequestJson = CreateCommentDto;

export type LootsControllerCreateComment201 =
  typeof LootsControllerCreateComment201.Type;

export const LootsControllerCreateComment201 = LootCommentResponseDto;

export type LootsControllerUpdateLootPathParams =
  typeof LootsControllerUpdateLootPathParams.Type;

export const LootsControllerUpdateLootPathParams = Schema.Struct({
  id: FiniteNumber,
});

export type LootsControllerUpdateLootRequestJson =
  typeof LootsControllerUpdateLootRequestJson.Type;

export const LootsControllerUpdateLootRequestJson = UpdateLootDto;

export type LootsControllerUpdateLoot200 =
  typeof LootsControllerUpdateLoot200.Type;

export const LootsControllerUpdateLoot200 = LootShareResponseDto_Output;
