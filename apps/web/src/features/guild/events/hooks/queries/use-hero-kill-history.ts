import type { EventKillHistoryResponseDto } from "@lootlog/client/main";
import type { EventKillHistoryResponseDtoDataItem } from "@lootlog/client/main";
import type { EventKillHistoryResponseDtoDataItemHeroNpc } from "@lootlog/client/main";
import type { EventKillHistoryResponseDtoDataItemPointsItem } from "@lootlog/client/main";
import type { EventKillHistoryResponseDtoDataItemPointsItemMapDataItem } from "@lootlog/client/main";
import type { EventKillHistoryResponseDtoDataItemPointsItemMember } from "@lootlog/client/main";

export type KillParticipantMember =
  EventKillHistoryResponseDtoDataItemPointsItemMember;

export type ParticipantMapData =
  EventKillHistoryResponseDtoDataItemPointsItemMapDataItem;

export type KillParticipant = EventKillHistoryResponseDtoDataItemPointsItem;

export type HeroKillHeroNpc = EventKillHistoryResponseDtoDataItemHeroNpc;

export type HeroKill = EventKillHistoryResponseDtoDataItem;

export type KillHistoryResponse = EventKillHistoryResponseDto;
