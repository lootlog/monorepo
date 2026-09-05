import { BattleResponseFields, BattlePagination } from "../shared.js";
/** catalog transport definitions for battles. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "@lootlog/schema/http-scalars";

export type BattlesListResponseDto_Output =
  typeof BattlesListResponseDto_Output.Type;

export const BattlesListResponseDto_Output = Schema.Struct({
  battles: Schema.Array(Schema.Struct(BattleResponseFields)),
  pagination: BattlePagination,
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: FiniteNumber,
      countTime: Schema.optionalKey(FiniteNumber),
      totalItems: Schema.optionalKey(FiniteNumber),
      estimatedTotal: Schema.optionalKey(Schema.Boolean),
    }),
  }),
}).annotate({ identifier: "BattlesListResponseDto_Output" });

export type BattleCharactersResponseDto_Output =
  typeof BattleCharactersResponseDto_Output.Type;

export const BattleCharactersResponseDto_Output = Schema.Struct({
  characters: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      world: Schema.String,
      icon: Schema.String,
    }),
  ),
}).annotate({ identifier: "BattleCharactersResponseDto_Output" });
