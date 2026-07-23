import type { EventKillHistoryResponseDto } from "@lootlog/api-client/models/main/event-kill-history-response-dto";
import type { EventKillHistoryResponseDtoDataItem } from "@lootlog/api-client/models/main/event-kill-history-response-dto-data-item";
import type { EventKillHistoryResponseDtoDataItemHeroNpc } from "@lootlog/api-client/models/main/event-kill-history-response-dto-data-item-hero-npc";
import type { EventKillHistoryResponseDtoDataItemPointsItem } from "@lootlog/api-client/models/main/event-kill-history-response-dto-data-item-points-item";
import type { EventKillHistoryResponseDtoDataItemPointsItemMapDataItem } from "@lootlog/api-client/models/main/event-kill-history-response-dto-data-item-points-item-map-data-item";
import type { EventKillHistoryResponseDtoDataItemPointsItemMember } from "@lootlog/api-client/models/main/event-kill-history-response-dto-data-item-points-item-member";

export type KillParticipantMember =
  EventKillHistoryResponseDtoDataItemPointsItemMember;

export type ParticipantMapData =
  EventKillHistoryResponseDtoDataItemPointsItemMapDataItem;

export type KillParticipant = EventKillHistoryResponseDtoDataItemPointsItem;

export type HeroKillHeroNpc = EventKillHistoryResponseDtoDataItemHeroNpc;

export type HeroKill = EventKillHistoryResponseDtoDataItem;

export type KillHistoryResponse = EventKillHistoryResponseDto;
