import type {
  EventKillHistoryResponseDto,
  EventKillHistoryResponseDtoDataItem,
  EventKillHistoryResponseDtoDataItemHeroNpc,
  EventKillHistoryResponseDtoDataItemPointsItem,
  EventKillHistoryResponseDtoDataItemPointsItemMapDataItem,
  EventKillHistoryResponseDtoDataItemPointsItemMember,
} from "@lootlog/client/main";

export type KillParticipantMember =
  EventKillHistoryResponseDtoDataItemPointsItemMember;

export type ParticipantMapData =
  EventKillHistoryResponseDtoDataItemPointsItemMapDataItem;

export type KillParticipant = EventKillHistoryResponseDtoDataItemPointsItem;

export type HeroKillHeroNpc = EventKillHistoryResponseDtoDataItemHeroNpc;

export type HeroKill = EventKillHistoryResponseDtoDataItem;

export type KillHistoryResponse = EventKillHistoryResponseDto;
