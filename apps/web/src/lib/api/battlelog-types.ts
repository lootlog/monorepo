import type { BattleCharactersResponseDtoOutputCharactersItem } from "@lootlog/client/battlelog";
import type { BattleDurationStatsResponseDtoOutput } from "@lootlog/client/battlelog";
import type { BattleRawResponseDtoOutputRawData } from "@lootlog/client/battlelog";
import type { BattleRawResponseDtoOutputRawDataEventsItem } from "@lootlog/client/battlelog";
import type { BattleResponseDtoOutput } from "@lootlog/client/battlelog";
import type { BattleResponseDtoOutputWarriorsItem } from "@lootlog/client/battlelog";
import type { BattleWarriorsSearchResponseDtoOutputWarriorsItem } from "@lootlog/client/battlelog";
import type { BattlesControllerGetDashboardBattlesParams } from "@lootlog/client/battlelog";
import type { BattlesListResponseDtoOutput } from "@lootlog/client/battlelog";
import type { BattlesListResponseDtoOutputBattlesItem } from "@lootlog/client/battlelog";
import type { BattlesListResponseDtoOutputBattlesItemWarriorsItem } from "@lootlog/client/battlelog";
import type { AbyssSeasonResponseDtoOutput } from "@lootlog/client/battlelog";
import type { HeadToHeadPaginatedResponseDtoOutputRecordsItem } from "@lootlog/client/battlelog";
import type { PlayerVsPlayerPaginatedResponseDtoOutputBattlesItem } from "@lootlog/client/battlelog";
import type { RatingDeltaByOpponentResponseDtoOutput } from "@lootlog/client/battlelog";
import type { StreakResponseDtoOutput } from "@lootlog/client/battlelog";

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
