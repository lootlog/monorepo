import type {
  EventKillHistoryResponseDto,
  EventKillHistoryResponseDtoDataItem,
  EventKillHistoryResponseDtoDataItemHeroNpc,
  EventKillHistoryResponseDtoDataItemPointsItem,
  EventKillHistoryResponseDtoDataItemPointsItemMapDataItem,
  EventKillHistoryResponseDtoDataItemPointsItemMember,
} from "@/lib/api/generated/main/model";

export type KillParticipantMember =
  EventKillHistoryResponseDtoDataItemPointsItemMember;

export type ParticipantMapData =
  EventKillHistoryResponseDtoDataItemPointsItemMapDataItem;

export type KillParticipant = EventKillHistoryResponseDtoDataItemPointsItem;

export type HeroKillHeroNpc = EventKillHistoryResponseDtoDataItemHeroNpc;

export type HeroKill = EventKillHistoryResponseDtoDataItem;

export type KillHistoryResponse = EventKillHistoryResponseDto;
