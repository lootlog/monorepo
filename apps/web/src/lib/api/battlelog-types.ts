import type {
  BattleCharactersResponseDtoOutputCharactersItem,
  BattleDurationStatsResponseDtoOutput,
  BattleRawResponseDtoOutputRawData,
  BattleRawResponseDtoOutputRawDataEventsItem,
  BattleResponseDtoOutput,
  BattleResponseDtoOutputWarriorsItem,
  BattleWarriorsSearchResponseDtoOutputWarriorsItem,
  BattlesControllerGetDashboardBattlesParams,
  BattlesListResponseDtoOutput,
  BattlesListResponseDtoOutputBattlesItem,
  BattlesListResponseDtoOutputBattlesItemWarriorsItem,
  AbyssSeasonResponseDtoOutput,
  HeadToHeadPaginatedResponseDtoOutputRecordsItem,
  PlayerVsPlayerPaginatedResponseDtoOutputBattlesItem,
  RatingDeltaByOpponentResponseDtoOutput,
  StreakResponseDtoOutput,
} from "@/lib/api/generated/battlelog/model";

export type Battle =
  | BattleResponseDtoOutput
  | BattlesListResponseDtoOutputBattlesItem;
export type BattleWarrior =
  | BattleResponseDtoOutputWarriorsItem
  | BattlesListResponseDtoOutputBattlesItemWarriorsItem;
export type BattleListResponse = BattlesListResponseDtoOutput;
export type BattleListParams = BattlesControllerGetDashboardBattlesParams;
export type BattleCharacter = BattleCharactersResponseDtoOutputCharactersItem;
export type AbyssSeason = AbyssSeasonResponseDtoOutput;
export type BattleDurationStats = BattleDurationStatsResponseDtoOutput;
export type HeadToHeadRecord = HeadToHeadPaginatedResponseDtoOutputRecordsItem;
export type PlayerVsPlayerBattle =
  PlayerVsPlayerPaginatedResponseDtoOutputBattlesItem;
export type RatingDeltaByOpponentRecord =
  RatingDeltaByOpponentResponseDtoOutput;
export type RawBattle = BattleRawResponseDtoOutputRawData;
export type RawBattleParsedEvent = BattleRawResponseDtoOutputRawDataEventsItem;
export type SearchWarrior = BattleWarriorsSearchResponseDtoOutputWarriorsItem;
export type Streak = StreakResponseDtoOutput;
