/** Transport schemas owned by the maps HTTP module. */
import * as Schema from "effect/Schema";

export type GameMapResponseDto_Output = {
  readonly id: number;
  readonly name: string;
};

export const GameMapResponseDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  name: Schema.String,
}).annotate({ identifier: "GameMapResponseDto_Output" });

export type MapsControllerGetMaps200 = ReadonlyArray<GameMapResponseDto_Output>;

export const MapsControllerGetMaps200 = Schema.Array(GameMapResponseDto_Output);
