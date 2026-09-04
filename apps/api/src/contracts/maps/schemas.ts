/** Shared input and output schemas for the maps feature. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "#src/contracts/scalars";

export type GameMapResponseDto_Output = typeof GameMapResponseDto_Output.Type;

export const GameMapResponseDto_Output = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
}).annotate({ identifier: "GameMapResponseDto_Output" });

export type MapsControllerGetMaps200 = typeof MapsControllerGetMaps200.Type;

export const MapsControllerGetMaps200 = Schema.Array(GameMapResponseDto_Output);
