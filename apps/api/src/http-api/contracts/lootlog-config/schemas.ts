/** Transport schemas owned by the lootlog-config HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type NullableLootlogConfigResponseDto_Output =
  typeof NullableLootlogConfigResponseDto_Output.Type;

export const NullableLootlogConfigResponseDto_Output = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.String,
      npcs: Schema.Array(
        Schema.Struct({
          id: FiniteNumber,
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

export type UpdateLootlogConfigNpcDto = typeof UpdateLootlogConfigNpcDto.Type;

export const UpdateLootlogConfigNpcDto = Schema.Struct({
  allowedRarities: Schema.Array(
    Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
  ),
}).annotate({ identifier: "UpdateLootlogConfigNpcDto" });

export type LootlogConfigNpcResponseDto_Output =
  typeof LootlogConfigNpcResponseDto_Output.Type;

export const LootlogConfigNpcResponseDto_Output = Schema.Struct({
  id: FiniteNumber,
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

export type LootlogConfigControllerGetLootlogConfigPathParams =
  typeof LootlogConfigControllerGetLootlogConfigPathParams.Type;

export const LootlogConfigControllerGetLootlogConfigPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootlogConfigControllerGetLootlogConfig200 =
  typeof LootlogConfigControllerGetLootlogConfig200.Type;

export const LootlogConfigControllerGetLootlogConfig200 =
  NullableLootlogConfigResponseDto_Output;

export type LootlogConfigControllerUpdateNpcPathParams =
  typeof LootlogConfigControllerUpdateNpcPathParams.Type;

export const LootlogConfigControllerUpdateNpcPathParams = Schema.Struct({
  npcId: Schema.String.annotate({ examples: ["1"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type LootlogConfigControllerUpdateNpcRequestJson =
  typeof LootlogConfigControllerUpdateNpcRequestJson.Type;

export const LootlogConfigControllerUpdateNpcRequestJson =
  UpdateLootlogConfigNpcDto;

export type LootlogConfigControllerUpdateNpc200 =
  typeof LootlogConfigControllerUpdateNpc200.Type;

export const LootlogConfigControllerUpdateNpc200 =
  LootlogConfigNpcResponseDto_Output;
