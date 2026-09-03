/** Transport schemas owned by the public-battles HTTP module. */
import * as Schema from "effect/Schema";
import {
  BattleRawResponseDto_Output,
  BattleResponseDto_Output,
  BattleTimelineResponseDto_Output,
} from "../shared.js";

export type PublicBattlesControllerGetPublicBattlePathParams = {
  readonly battleId: string;
};

export const PublicBattlesControllerGetPublicBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});

export type PublicBattlesControllerGetPublicBattle200 =
  BattleResponseDto_Output;

export const PublicBattlesControllerGetPublicBattle200 =
  BattleResponseDto_Output;

export type PublicBattlesControllerGetPublicBattleRawPathParams = {
  readonly battleId: string;
};

export const PublicBattlesControllerGetPublicBattleRawPathParams =
  Schema.Struct({ battleId: Schema.String });

export type PublicBattlesControllerGetPublicBattleRaw200 =
  BattleRawResponseDto_Output;

export const PublicBattlesControllerGetPublicBattleRaw200 =
  BattleRawResponseDto_Output;

export type PublicBattlesControllerGetPublicBattleTimelinePathParams = {
  readonly battleId: string;
};

export const PublicBattlesControllerGetPublicBattleTimelinePathParams =
  Schema.Struct({ battleId: Schema.String });

export type PublicBattlesControllerGetPublicBattleTimeline200 =
  BattleTimelineResponseDto_Output;

export const PublicBattlesControllerGetPublicBattleTimeline200 =
  BattleTimelineResponseDto_Output;
