/** Shared input and output schemas for the lootlog-config feature. */
import * as Schema from "effect/Schema";
import { JsonValue, FiniteNumber } from "#src/contracts/scalars";

const npcLootlogConfigFields = {
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
};

export type LootlogConfigResponse = typeof LootlogConfigResponse.Type;

export const LootlogConfigResponse = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.String,
      npcs: Schema.Array(Schema.Struct(npcLootlogConfigFields)),
    }),
    [Schema.Record(Schema.String, JsonValue)],
  ),
  Schema.Null,
]).annotate({ identifier: "NullableLootlogConfigResponseDto_Output" });

export type UpdateNpcLootlogConfigRequest =
  typeof UpdateNpcLootlogConfigRequest.Type;

export const UpdateNpcLootlogConfigRequest = Schema.Struct({
  allowedRarities: Schema.Array(
    Schema.Literals(["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"]),
  ),
}).annotate({ identifier: "UpdateLootlogConfigNpcDto" });

export type NpcLootlogConfigResponse = typeof NpcLootlogConfigResponse.Type;

export const NpcLootlogConfigResponse = Schema.Struct(
  npcLootlogConfigFields,
).annotate({ identifier: "LootlogConfigNpcResponseDto_Output" });

export type LootlogConfigOrganizationPath =
  typeof LootlogConfigOrganizationPath.Type;

export const LootlogConfigOrganizationPath = Schema.Struct({
  guildId: JsonValue,
});

export type NpcLootlogConfigPath = typeof NpcLootlogConfigPath.Type;

export const NpcLootlogConfigPath = Schema.Struct({
  npcId: Schema.String.annotate({ examples: ["1"] }),
  guildId: JsonValue,
});
