import type {
  EventListItemResponseDto,
  EventMapsResponseDtoOutput,
  EventMapsResponseDtoOutputHeroNpcsItemMapsItemAssignedMembersItemRolesItem,
  EventTimerResponseDto,
  EventOverviewResponseDtoHeroNpcsItem,
  EventRankingEntryResponseDto,
  EventWrappedApiResponseDtoOutput,
  EventWrappedApiResponseDtoOutputCoverageBestHeroCoverage,
  EventWrappedApiResponseDtoOutputHeroesItem,
  EventWrappedApiResponseDtoOutputLeadersTopHunter,
  EventWrappedApiResponseDtoOutputLootHeroBreakdownItem,
  EventWrappedApiResponseDtoOutputOverviewRarityTotals,
  HeroRespawnConfigResponseDto,
  HeroRespawnConfigResponseDtoWindowStatus,
  KillTimelineMapResponseDto,
  KillTimelineMapResponseDtoAssignmentsItem,
  KillTimelineMapResponseDtoGapsItem,
  RankingEditHistoryEntryResponseDto,
} from "@/lib/api/generated/main/model";

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
