/** Transport schemas owned by the loots HTTP module. */
import * as Schema from "effect/Schema";

export type LootResponseDto = {
  readonly id: number;
  readonly uniqueId: string;
  readonly world: string;
  readonly source: "LOOTBOX" | "DIALOG" | "FIGHT";
  readonly location: string;
  readonly items: ReadonlyArray<{
    readonly id: number;
    readonly hid: string;
    readonly name: string;
    readonly icon: string;
    readonly stat: string;
    readonly type: string | null;
    readonly rarity: "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED" | null;
    readonly lvl: number;
    readonly prof: ReadonlyArray<
      "WARRIOR" | "PALADIN" | "HUNTER" | "MAGE" | "BLADE_DANCER" | "TRACKER"
    >;
  }>;
  readonly players: ReadonlyArray<{
    readonly id: string | number;
    readonly name: string;
    readonly lvl: number | null;
    readonly prof:
      | "WARRIOR"
      | "PALADIN"
      | "HUNTER"
      | "MAGE"
      | "BLADE_DANCER"
      | "TRACKER"
      | null;
    readonly icon: string | null;
    readonly characterId: number | null;
    readonly accountId: number | null;
    readonly hpp: number | null;
  }>;
  readonly npcs: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly wt: number | null;
    readonly lvl: number | null;
    readonly prof:
      | "WARRIOR"
      | "PALADIN"
      | "HUNTER"
      | "MAGE"
      | "BLADE_DANCER"
      | "TRACKER"
      | null;
    readonly icon: string | null;
    readonly type:
      | "COMMON"
      | "ELITE"
      | "ELITE2"
      | "ELITE3"
      | "HERO"
      | "EVENT_HERO"
      | "TITAN"
      | "COLOSSUS"
      | "NPC"
      | null;
    readonly margonemType: number | null;
  }>;
  readonly lootShare: { readonly [x: string]: ReadonlyArray<string> };
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submissions?: ReadonlyArray<{
    readonly guildId: string;
    readonly memberId: number;
    readonly lootId: number;
    readonly member: {
      readonly name: string;
      readonly avatar?: string | null;
      readonly userId: string;
    };
  }>;
  readonly commentsCount: number;
};

export const LootResponseDto = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  uniqueId: Schema.String,
  world: Schema.String,
  source: Schema.Literals(["LOOTBOX", "DIALOG", "FIGHT"]),
  location: Schema.String,
  items: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      hid: Schema.String,
      name: Schema.String,
      icon: Schema.String,
      stat: Schema.String,
      type: Schema.Union([Schema.String, Schema.Null]),
      rarity: Schema.Union([
        Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
        Schema.Null,
      ]),
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      id: Schema.Union([
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ]),
      name: Schema.String,
      lvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
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
      characterId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      accountId: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      hpp: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
    }),
  ),
  npcs: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      name: Schema.String,
      wt: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      lvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
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
      margonemType: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
    }),
  ),
  lootShare: Schema.Record(Schema.String, Schema.Array(Schema.String)),
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  updatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  submissions: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        guildId: Schema.String,
        memberId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        lootId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
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
  commentsCount: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "LootResponseDto" });

export type LootStatsResponseDto_Output = {
  readonly overview: {
    readonly totalLoots: number;
    readonly totalItems: number;
    readonly legendaryItems: number;
    readonly heroicItems: number;
    readonly avgItemLevel: number;
  };
  readonly byRarity: {
    readonly [x: string]: {
      readonly count: number;
      readonly percentage: number;
    };
  };
  readonly timeline: ReadonlyArray<{
    readonly date: string;
    readonly total: number;
    readonly byRarity: { readonly [x: string]: number };
  }>;
  readonly topNpcs: ReadonlyArray<{
    readonly npcId: number;
    readonly name: string;
    readonly type:
      | "COMMON"
      | "ELITE"
      | "ELITE2"
      | "ELITE3"
      | "HERO"
      | "EVENT_HERO"
      | "TITAN"
      | "COLOSSUS"
      | "NPC"
      | null;
    readonly lvl: number | null;
    readonly icon: string | null;
    readonly count: number;
    readonly byRarity: { readonly [x: string]: number };
  }>;
  readonly topContributors: ReadonlyArray<{
    readonly memberId: number;
    readonly name: string;
    readonly avatar: string | null;
    readonly userId: string;
    readonly count: number;
    readonly byRarity: { readonly [x: string]: number };
  }>;
  readonly topItems: ReadonlyArray<{
    readonly itemId: number;
    readonly hid: string;
    readonly name: string;
    readonly icon: string;
    readonly rarity: "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED";
    readonly lvl: number;
    readonly count: number;
  }>;
};

export const LootStatsResponseDto_Output = Schema.Struct({
  overview: Schema.Struct({
    totalLoots: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalItems: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    legendaryItems: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    heroicItems: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    avgItemLevel: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  }),
  byRarity: Schema.Record(
    Schema.String,
    Schema.Struct({
      count: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      percentage: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  timeline: Schema.Array(
    Schema.Struct({
      date: Schema.String,
      total: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      byRarity: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  ),
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      lvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      count: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      byRarity: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  ),
  topContributors: Schema.Array(
    Schema.Struct({
      memberId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      name: Schema.String,
      avatar: Schema.Union([Schema.String, Schema.Null]),
      userId: Schema.String,
      count: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      byRarity: Schema.Record(
        Schema.String,
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  ),
  topItems: Schema.Array(
    Schema.Struct({
      itemId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      hid: Schema.String,
      name: Schema.String,
      icon: Schema.String,
      rarity: Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      count: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "LootStatsResponseDto_Output" });

export type CountResponseDto_Output = { readonly count: number };

export const CountResponseDto_Output = Schema.Struct({
  count: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
}).annotate({ identifier: "CountResponseDto_Output" });

export type NullableLootItemResponseDto_Output = {
  readonly id: number;
  readonly hid: string;
  readonly name: string;
  readonly icon: string;
  readonly stat: string;
  readonly type: string | null;
  readonly rarity: "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED" | null;
  readonly lvl: number;
  readonly prof: ReadonlyArray<
    "WARRIOR" | "PALADIN" | "HUNTER" | "MAGE" | "BLADE_DANCER" | "TRACKER"
  >;
};

export const NullableLootItemResponseDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  hid: Schema.String,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  type: Schema.Union([Schema.String, Schema.Null]),
  rarity: Schema.Union([
    Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
    Schema.Null,
  ]),
  lvl: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
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

export type NullableLootResponseDto =
  | ({
      readonly id: number;
      readonly uniqueId: string;
      readonly world: string;
      readonly source: "LOOTBOX" | "DIALOG" | "FIGHT";
      readonly location: string;
      readonly items: ReadonlyArray<{
        readonly id: number;
        readonly hid: string;
        readonly name: string;
        readonly icon: string;
        readonly stat: string;
        readonly type: string | null;
        readonly rarity: "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED" | null;
        readonly lvl: number;
        readonly prof: ReadonlyArray<
          "WARRIOR" | "PALADIN" | "HUNTER" | "MAGE" | "BLADE_DANCER" | "TRACKER"
        >;
      }>;
      readonly players: ReadonlyArray<{
        readonly id: string | number;
        readonly name: string;
        readonly lvl: number | null;
        readonly prof:
          | "WARRIOR"
          | "PALADIN"
          | "HUNTER"
          | "MAGE"
          | "BLADE_DANCER"
          | "TRACKER"
          | null;
        readonly icon: string | null;
        readonly characterId: number | null;
        readonly accountId: number | null;
        readonly hpp: number | null;
      }>;
      readonly npcs: ReadonlyArray<{
        readonly id: number;
        readonly name: string;
        readonly wt: number | null;
        readonly lvl: number | null;
        readonly prof:
          | "WARRIOR"
          | "PALADIN"
          | "HUNTER"
          | "MAGE"
          | "BLADE_DANCER"
          | "TRACKER"
          | null;
        readonly icon: string | null;
        readonly type:
          | "COMMON"
          | "ELITE"
          | "ELITE2"
          | "ELITE3"
          | "HERO"
          | "EVENT_HERO"
          | "TITAN"
          | "COLOSSUS"
          | "NPC"
          | null;
        readonly margonemType: number | null;
      }>;
      readonly lootShare: { readonly [x: string]: ReadonlyArray<string> };
      readonly createdAt: string;
      readonly updatedAt: string;
      readonly submissions?: ReadonlyArray<{
        readonly guildId: string;
        readonly memberId: number;
        readonly lootId: number;
        readonly member: {
          readonly name: string;
          readonly avatar?: string | null;
          readonly userId: string;
        };
      }>;
      readonly commentsCount: number;
    } & { readonly [x: string]: Schema.Json })
  | null;

export const NullableLootResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      uniqueId: Schema.String,
      world: Schema.String,
      source: Schema.Literals(["LOOTBOX", "DIALOG", "FIGHT"]),
      location: Schema.String,
      items: Schema.Array(
        Schema.Struct({
          id: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          hid: Schema.String,
          name: Schema.String,
          icon: Schema.String,
          stat: Schema.String,
          type: Schema.Union([Schema.String, Schema.Null]),
          rarity: Schema.Union([
            Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
            Schema.Null,
          ]),
          lvl: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          id: Schema.Union([
            Schema.String,
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ]),
          name: Schema.String,
          lvl: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
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
          characterId: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
          accountId: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
          hpp: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
        }),
      ),
      npcs: Schema.Array(
        Schema.Struct({
          id: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          name: Schema.String,
          wt: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
          lvl: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
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
          margonemType: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
        }),
      ),
      lootShare: Schema.Record(Schema.String, Schema.Array(Schema.String)),
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      updatedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      submissions: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({
            guildId: Schema.String,
            memberId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            lootId: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
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
      commentsCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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

export type CreateLootDto = {
  readonly loots: ReadonlyArray<{
    readonly hid: string;
    readonly name: string;
    readonly icon: string;
    readonly pr: number;
    readonly prc: string;
    readonly stat: string;
    readonly id: number;
    readonly cl: number;
    readonly own?: number;
  }>;
  readonly npcs: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly location: string;
    readonly lvl: number;
    readonly prof?: string;
    readonly wt: number;
    readonly hpp?: number;
    readonly icon: string;
    readonly type: number;
    readonly x?: number;
    readonly y?: number;
  }>;
  readonly players: ReadonlyArray<{
    readonly id: number;
    readonly accountId: number;
    readonly name: string;
    readonly lvl: number;
    readonly prof: string;
    readonly icon: string;
    readonly hpp?: number;
  }>;
  readonly world: string;
  readonly source: "LOOTBOX" | "DIALOG" | "FIGHT";
  readonly location: string;
  readonly accountId: string;
  readonly characterId: string;
};

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
      pr: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      cl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      own: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
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
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.optionalKey(Schema.String),
      wt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      hpp: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      x: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      y: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  players: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      accountId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      hpp: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
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

export type CreateLootResponseDto_Output = {
  readonly id: number;
  readonly submittedGuilds: ReadonlyArray<{
    readonly guildId: string;
    readonly guildName: string;
  }>;
  readonly rejectedGuilds: ReadonlyArray<{
    readonly guildId: string;
    readonly guildName: string;
    readonly reason:
      | "NOT_ON_CHARACTER_WHITELIST"
      | "MISSING_LOOTLOG_CONFIG"
      | "LOOT_NOT_ACCEPTED_BY_CONFIG"
      | "MISSING_MEMBER";
  }>;
};

export const CreateLootResponseDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
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

export type LootCommentResponseDto = {
  readonly id: number;
  readonly lootId: number;
  readonly guildId: string;
  readonly content: string;
  readonly member: {
    readonly name: string;
    readonly avatar?: string | null;
    readonly userId: string;
    readonly roles?: ReadonlyArray<{ readonly color?: number | null }>;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const LootCommentResponseDto = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  lootId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.String,
  content: Schema.String,
  member: Schema.Struct({
    name: Schema.String,
    avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
    userId: Schema.String,
    roles: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          color: Schema.optionalKey(
            Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
          ),
        }),
      ),
    ),
  }),
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  updatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
}).annotate({ identifier: "LootCommentResponseDto" });

export type CreateCommentDto = { readonly content: string };

export const CreateCommentDto = Schema.Struct({
  content: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "CreateCommentDto" });

export type UpdateLootDto = { readonly msg: string };

export const UpdateLootDto = Schema.Struct({ msg: Schema.String }).annotate({
  identifier: "UpdateLootDto",
});

export type LootShareResponseDto_Output = {
  readonly [x: string]: ReadonlyArray<string>;
};

export const LootShareResponseDto_Output = Schema.Record(
  Schema.String,
  Schema.Array(Schema.String),
).annotate({ identifier: "LootShareResponseDto_Output" });

export type LootsControllerFetchLootsByGuildIdPathParams = {
  readonly guildId: Schema.Json;
};

export const LootsControllerFetchLootsByGuildIdPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerFetchLootsByGuildIdQuery = {
  readonly limit?: number;
  readonly cursor?: number;
  readonly npcs?: ReadonlyArray<string>;
  readonly players?: ReadonlyArray<string>;
  readonly rarities?: ReadonlyArray<string>;
  readonly professions?: ReadonlyArray<string>;
  readonly npcTypes?: ReadonlyArray<string>;
  readonly world?: string;
  readonly npcLevelMin?: number;
  readonly npcLevelMax?: number;
  readonly itemLevelMin?: number;
  readonly itemLevelMax?: number;
  readonly playerLevelMin?: number;
  readonly playerLevelMax?: number;
  readonly search?: string;
  readonly hid?: string;
  readonly itemNames?: ReadonlyArray<string>;
  readonly createdAtMin?: string;
  readonly createdAtMax?: string;
};

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
  createdAtMin: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  createdAtMax: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
});

export type LootsControllerFetchLootsByGuildId200 =
  ReadonlyArray<LootResponseDto>;

export const LootsControllerFetchLootsByGuildId200 =
  Schema.Array(LootResponseDto);

export type LootsControllerGetLootStatsPathParams = {
  readonly guildId: Schema.Json;
};

export const LootsControllerGetLootStatsPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerGetLootStatsQuery = {
  readonly period?:
    | "24h"
    | "3d"
    | "7d"
    | "14d"
    | "30d"
    | "90d"
    | "180d"
    | "all";
  readonly world?: string;
  readonly npcTypes?: string;
  readonly excludeColossus?: boolean;
};

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

export type LootsControllerGetLootStats200 = LootStatsResponseDto_Output;

export const LootsControllerGetLootStats200 = LootStatsResponseDto_Output;

export type LootsControllerCountLootsByGuildIdPathParams = {
  readonly guildId: Schema.Json;
};

export const LootsControllerCountLootsByGuildIdPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerCountLootsByGuildIdQuery = {
  readonly limit?: number;
  readonly cursor?: number;
  readonly npcs?: ReadonlyArray<string>;
  readonly players?: ReadonlyArray<string>;
  readonly rarities?: ReadonlyArray<string>;
  readonly professions?: ReadonlyArray<string>;
  readonly npcTypes?: ReadonlyArray<string>;
  readonly world?: string;
  readonly npcLevelMin?: number;
  readonly npcLevelMax?: number;
  readonly itemLevelMin?: number;
  readonly itemLevelMax?: number;
  readonly playerLevelMin?: number;
  readonly playerLevelMax?: number;
  readonly search?: string;
  readonly hid?: string;
  readonly itemNames?: ReadonlyArray<string>;
  readonly createdAtMin?: string;
  readonly createdAtMax?: string;
};

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
  createdAtMin: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  createdAtMax: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
});

export type LootsControllerCountLootsByGuildId200 = CountResponseDto_Output;

export const LootsControllerCountLootsByGuildId200 = CountResponseDto_Output;

export type LootsControllerResolveLootItemByHidPathParams = {
  readonly guildId: Schema.Json;
};

export const LootsControllerResolveLootItemByHidPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerResolveLootItemByHidQuery = {
  readonly hid: string;
  readonly world?: string;
};

export const LootsControllerResolveLootItemByHidQuery = Schema.Struct({
  hid: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  world: Schema.optionalKey(Schema.String),
});

export type LootsControllerResolveLootItemByHid200 =
  NullableLootItemResponseDto_Output;

export const LootsControllerResolveLootItemByHid200 =
  NullableLootItemResponseDto_Output;

export type LootsControllerFetchLootByIdPathParams = {
  readonly lootId: number;
  readonly guildId: Schema.Json;
};

export const LootsControllerFetchLootByIdPathParams = Schema.Struct({
  lootId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerFetchLootById200 = NullableLootResponseDto;

export const LootsControllerFetchLootById200 = NullableLootResponseDto;

export type LootsControllerDeleteLootPathParams = {
  readonly lootId: number;
  readonly guildId: Schema.Json;
};

export const LootsControllerDeleteLootPathParams = Schema.Struct({
  lootId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerCreateLootRequestJson = CreateLootDto;

export const LootsControllerCreateLootRequestJson = CreateLootDto;

export type LootsControllerCreateLoot201 = CreateLootResponseDto_Output;

export const LootsControllerCreateLoot201 = CreateLootResponseDto_Output;

export type LootsControllerGetCommentsPathParams = {
  readonly lootId: number;
  readonly guildId: Schema.Json;
};

export const LootsControllerGetCommentsPathParams = Schema.Struct({
  lootId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerGetComments200 =
  ReadonlyArray<LootCommentResponseDto>;

export const LootsControllerGetComments200 = Schema.Array(
  LootCommentResponseDto,
);

export type LootsControllerCreateCommentPathParams = {
  readonly lootId: number;
  readonly guildId: Schema.Json;
};

export const LootsControllerCreateCommentPathParams = Schema.Struct({
  lootId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootsControllerCreateCommentRequestJson = CreateCommentDto;

export const LootsControllerCreateCommentRequestJson = CreateCommentDto;

export type LootsControllerCreateComment201 = LootCommentResponseDto;

export const LootsControllerCreateComment201 = LootCommentResponseDto;

export type LootsControllerUpdateLootPathParams = { readonly id: number };

export const LootsControllerUpdateLootPathParams = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
});

export type LootsControllerUpdateLootRequestJson = UpdateLootDto;

export const LootsControllerUpdateLootRequestJson = UpdateLootDto;

export type LootsControllerUpdateLoot200 = LootShareResponseDto_Output;

export const LootsControllerUpdateLoot200 = LootShareResponseDto_Output;
