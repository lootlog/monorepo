import type { BattleCharactersResponseDtoOutputCharactersItem } from "@lootlog/api-client/models/battlelog/battle-characters-response-dto-output-characters-item";
import type { BattleDurationStatsResponseDtoOutput } from "@lootlog/api-client/models/battlelog/battle-duration-stats-response-dto-output";
import type { BattleRawResponseDtoOutputRawData } from "@lootlog/api-client/models/battlelog/battle-raw-response-dto-output-raw-data";
import type { BattleRawResponseDtoOutputRawDataEventsItem } from "@lootlog/api-client/models/battlelog/battle-raw-response-dto-output-raw-data-events-item";
import type { BattleResponseDtoOutput } from "@lootlog/api-client/models/battlelog/battle-response-dto-output";
import type { BattleResponseDtoOutputWarriorsItem } from "@lootlog/api-client/models/battlelog/battle-response-dto-output-warriors-item";
import type { BattleWarriorsSearchResponseDtoOutputWarriorsItem } from "@lootlog/api-client/models/battlelog/battle-warriors-search-response-dto-output-warriors-item";
import type { BattlesControllerGetDashboardBattlesParams } from "@lootlog/api-client/models/battlelog/battles-controller-get-dashboard-battles-params";
import type { BattlesListResponseDtoOutput } from "@lootlog/api-client/models/battlelog/battles-list-response-dto-output";
import type { BattlesListResponseDtoOutputBattlesItem } from "@lootlog/api-client/models/battlelog/battles-list-response-dto-output-battles-item";
import type { BattlesListResponseDtoOutputBattlesItemWarriorsItem } from "@lootlog/api-client/models/battlelog/battles-list-response-dto-output-battles-item-warriors-item";
import type { AbyssSeasonResponseDtoOutput } from "@lootlog/api-client/models/battlelog/abyss-season-response-dto-output";
import type { HeadToHeadPaginatedResponseDtoOutputRecordsItem } from "@lootlog/api-client/models/battlelog/head-to-head-paginated-response-dto-output-records-item";
import type { PlayerVsPlayerPaginatedResponseDtoOutputBattlesItem } from "@lootlog/api-client/models/battlelog/player-vs-player-paginated-response-dto-output-battles-item";
import type { RatingDeltaByOpponentResponseDtoOutput } from "@lootlog/api-client/models/battlelog/rating-delta-by-opponent-response-dto-output";
import type { StreakResponseDtoOutput } from "@lootlog/api-client/models/battlelog/streak-response-dto-output";

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
