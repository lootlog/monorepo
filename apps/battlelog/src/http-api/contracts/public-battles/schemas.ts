/** Transport schemas owned by the public-battles HTTP module. */
import * as Schema from "effect/Schema";
import {
  BattleRawResponseDto_Output,
  BattleResponseDto_Output,
  BattleTimelineResponseDto_Output,
} from "../shared.js";

export type PublicBattlesControllerGetPublicBattlePathParams =
  typeof PublicBattlesControllerGetPublicBattlePathParams.Type;

export const PublicBattlesControllerGetPublicBattlePathParams = Schema.Struct({
  battleId: Schema.String,
});

export type PublicBattlesControllerGetPublicBattle200 =
  typeof PublicBattlesControllerGetPublicBattle200.Type;

export const PublicBattlesControllerGetPublicBattle200 =
  BattleResponseDto_Output;

export type PublicBattlesControllerGetPublicBattleRawPathParams =
  typeof PublicBattlesControllerGetPublicBattleRawPathParams.Type;

export const PublicBattlesControllerGetPublicBattleRawPathParams =
  Schema.Struct({ battleId: Schema.String });

export type PublicBattlesControllerGetPublicBattleRaw200 =
  typeof PublicBattlesControllerGetPublicBattleRaw200.Type;

export const PublicBattlesControllerGetPublicBattleRaw200 =
  BattleRawResponseDto_Output;

export type PublicBattlesControllerGetPublicBattleTimelinePathParams =
  typeof PublicBattlesControllerGetPublicBattleTimelinePathParams.Type;

export const PublicBattlesControllerGetPublicBattleTimelinePathParams =
  Schema.Struct({ battleId: Schema.String });

export type PublicBattlesControllerGetPublicBattleTimeline200 =
  typeof PublicBattlesControllerGetPublicBattleTimeline200.Type;

export const PublicBattlesControllerGetPublicBattleTimeline200 =
  BattleTimelineResponseDto_Output;
