/** Transport schemas owned by the lootlog-config HTTP module. */
import * as Schema from "effect/Schema";

export type NullableLootlogConfigResponseDto_Output =
  | ({
      readonly id: string;
      readonly npcs: ReadonlyArray<{
        readonly id: number;
        readonly npcType:
          | "COMMON"
          | "ELITE"
          | "ELITE2"
          | "ELITE3"
          | "HERO"
          | "EVENT_HERO"
          | "TITAN"
          | "COLOSSUS"
          | "NPC";
        readonly allowedRarities: ReadonlyArray<
          "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED"
        >;
      }>;
    } & { readonly [x: string]: Schema.Json })
  | null;

export const NullableLootlogConfigResponseDto_Output = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.String,
      npcs: Schema.Array(
        Schema.Struct({
          id: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          npcType: Schema.Literals([
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
          allowedRarities: Schema.Array(
            Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
          ),
        }),
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
]).annotate({ identifier: "NullableLootlogConfigResponseDto_Output" });

export type UpdateLootlogConfigNpcDto = {
  readonly allowedRarities: ReadonlyArray<
    "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED"
  >;
};

export const UpdateLootlogConfigNpcDto = Schema.Struct({
  allowedRarities: Schema.Array(
    Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
  ),
}).annotate({ identifier: "UpdateLootlogConfigNpcDto" });

export type LootlogConfigNpcResponseDto_Output = {
  readonly id: number;
  readonly npcType:
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "TITAN"
    | "COLOSSUS"
    | "NPC";
  readonly allowedRarities: ReadonlyArray<
    "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED"
  >;
};

export const LootlogConfigNpcResponseDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  npcType: Schema.Literals([
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
  allowedRarities: Schema.Array(
    Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
  ),
}).annotate({ identifier: "LootlogConfigNpcResponseDto_Output" });

export type LootlogConfigControllerGetLootlogConfigPathParams = {
  readonly guildId: Schema.Json;
};

export const LootlogConfigControllerGetLootlogConfigPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootlogConfigControllerGetLootlogConfig200 =
  NullableLootlogConfigResponseDto_Output;

export const LootlogConfigControllerGetLootlogConfig200 =
  NullableLootlogConfigResponseDto_Output;

export type LootlogConfigControllerUpdateNpcPathParams = {
  readonly npcId: string;
  readonly guildId: Schema.Json;
};

export const LootlogConfigControllerUpdateNpcPathParams = Schema.Struct({
  npcId: Schema.String.annotate({ examples: ["1"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootlogConfigControllerUpdateNpcRequestJson =
  UpdateLootlogConfigNpcDto;

export const LootlogConfigControllerUpdateNpcRequestJson =
  UpdateLootlogConfigNpcDto;

export type LootlogConfigControllerUpdateNpc200 =
  LootlogConfigNpcResponseDto_Output;

export const LootlogConfigControllerUpdateNpc200 =
  LootlogConfigNpcResponseDto_Output;
