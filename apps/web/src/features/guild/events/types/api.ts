import type { EventListItemResponseDto } from "@lootlog/api-client/models/main/event-list-item-response-dto";
import type { EventMapsResponseDtoOutput } from "@lootlog/api-client/models/main/event-maps-response-dto-output";
import type { EventMapsResponseDtoOutputHeroNpcsItemMapsItemAssignedMembersItemRolesItem } from "@lootlog/api-client/models/main/event-maps-response-dto-output-hero-npcs-item-maps-item-assigned-members-item-roles-item";
import type { EventTimerResponseDto } from "@lootlog/api-client/models/main/event-timer-response-dto";
import type { EventOverviewResponseDtoHeroNpcsItem } from "@lootlog/api-client/models/main/event-overview-response-dto-hero-npcs-item";
import type { EventRankingEntryResponseDto } from "@lootlog/api-client/models/main/event-ranking-entry-response-dto";
import type { EventWrappedApiResponseDtoOutput } from "@lootlog/api-client/models/main/event-wrapped-api-response-dto-output";
import type { EventWrappedApiResponseDtoOutputCoverageBestHeroCoverage } from "@lootlog/api-client/models/main/event-wrapped-api-response-dto-output-coverage-best-hero-coverage";
import type { EventWrappedApiResponseDtoOutputHeroesItem } from "@lootlog/api-client/models/main/event-wrapped-api-response-dto-output-heroes-item";
import type { EventWrappedApiResponseDtoOutputLeadersTopHunter } from "@lootlog/api-client/models/main/event-wrapped-api-response-dto-output-leaders-top-hunter";
import type { EventWrappedApiResponseDtoOutputLootHeroBreakdownItem } from "@lootlog/api-client/models/main/event-wrapped-api-response-dto-output-loot-hero-breakdown-item";
import type { EventWrappedApiResponseDtoOutputOverviewRarityTotals } from "@lootlog/api-client/models/main/event-wrapped-api-response-dto-output-overview-rarity-totals";
import type { HeroRespawnConfigResponseDto } from "@lootlog/api-client/models/main/hero-respawn-config-response-dto";
import type { HeroRespawnConfigResponseDtoWindowStatus } from "@lootlog/api-client/models/main/hero-respawn-config-response-dto-window-status";
import type { KillTimelineMapResponseDto } from "@lootlog/api-client/models/main/kill-timeline-map-response-dto";
import type { KillTimelineMapResponseDtoAssignmentsItem } from "@lootlog/api-client/models/main/kill-timeline-map-response-dto-assignments-item";
import type { KillTimelineMapResponseDtoGapsItem } from "@lootlog/api-client/models/main/kill-timeline-map-response-dto-gaps-item";
import type { RankingEditHistoryEntryResponseDto } from "@lootlog/api-client/models/main/ranking-edit-history-entry-response-dto";

export type MemberRole =
  EventMapsResponseDtoOutputHeroNpcsItemMapsItemAssignedMembersItemRolesItem;

export type Member = {
  id: number;
  name: string;
  avatar?: string | null;
  userId: string;
  roles?: MemberRole[];
};

export type EventMap = {
  id: string;
  mapId: number;
  mapName: string;
  locationId: string | null;
  assignedMembers: Member[];
};

export type EventMapLocation = {
  id: string;
  name: string;
  order: number;
  maps: EventMap[];
};

export type EventHeroNpc = EventOverviewResponseDtoHeroNpcsItem & {
  locations?: EventMapLocation[];
  maps?: EventMap[];
};

export type Event = Omit<EventListItemResponseDto, "heroNpcs"> & {
  heroNpcs: EventHeroNpc[];
};

export type EventRanking = EventRankingEntryResponseDto;

export type EventTimer = EventTimerResponseDto;

export type EventMapsResponse = Omit<EventMapsResponseDtoOutput, "heroNpcs"> & {
  heroNpcs: EventHeroNpc[];
};

export type EventWrappedRarityTotals =
  EventWrappedApiResponseDtoOutputOverviewRarityTotals;
export type EventWrappedLeader =
  EventWrappedApiResponseDtoOutputLeadersTopHunter;
export type EventWrappedHeroCoverage =
  EventWrappedApiResponseDtoOutputCoverageBestHeroCoverage;
export type EventWrappedHero = EventWrappedApiResponseDtoOutputHeroesItem;
export type EventWrappedLootHero =
  EventWrappedApiResponseDtoOutputLootHeroBreakdownItem;
export type EventWrapped = EventWrappedApiResponseDtoOutput;

export type PointsEditHistoryEntry = RankingEditHistoryEntryResponseDto;

export type WindowStatus = HeroRespawnConfigResponseDtoWindowStatus;
export type RespawnConfig = HeroRespawnConfigResponseDto;

export type MapAssignment = KillTimelineMapResponseDtoAssignmentsItem;
export type MapGap = KillTimelineMapResponseDtoGapsItem;
export type MapTimelineData = KillTimelineMapResponseDto;
