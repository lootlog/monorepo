/** Shared input and output schemas for the maps feature. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "#src/contracts/scalars";

export type GameMapResponse = typeof GameMapResponse.Type;

export const GameMapResponse = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
}).annotate({ identifier: "GameMapResponseDto_Output" });

export type GameMapsResponse = typeof GameMapsResponse.Type;

export const GameMapsResponse = Schema.Array(GameMapResponse);
