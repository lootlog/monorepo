import type { EventListItemResponseDto } from "@lootlog/client/main";
import type { EventMapsResponseDtoOutput } from "@lootlog/client/main";
import type { EventMapsResponseDtoOutputHeroNpcsItemMapsItemAssignedMembersItemRolesItem } from "@lootlog/client/main";
import type { EventTimerResponseDto } from "@lootlog/client/main";
import type { EventOverviewResponseDtoHeroNpcsItem } from "@lootlog/client/main";
import type { EventRankingEntryResponseDto } from "@lootlog/client/main";
import type { EventWrappedApiResponseDtoOutput } from "@lootlog/client/main";
import type { EventWrappedApiResponseDtoOutputCoverageBestHeroCoverage } from "@lootlog/client/main";
import type { EventWrappedApiResponseDtoOutputHeroesItem } from "@lootlog/client/main";
import type { EventWrappedApiResponseDtoOutputLootHeroBreakdownItem } from "@lootlog/client/main";
import type { EventWrappedApiResponseDtoOutputOverviewRarityTotals } from "@lootlog/client/main";
import type { HeroRespawnConfigResponseDto } from "@lootlog/client/main";
import type { HeroRespawnConfigResponseDtoWindowStatus } from "@lootlog/client/main";
import type { KillTimelineMapResponseDto } from "@lootlog/client/main";
import type { KillTimelineMapResponseDtoAssignmentsItem } from "@lootlog/client/main";
import type { KillTimelineMapResponseDtoGapsItem } from "@lootlog/client/main";

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
export type EventWrappedLeader = {
  memberId: number;
  name: string;
  avatar: string | null;
  primaryValue: number;
  secondaryValue?: number | null;
};
export type EventWrappedLeaderResult = {
  winner: EventWrappedLeader | null;
  candidateCount: number;
  tiedWinnerCount: number;
};
export type EventWrappedHeroCoverage =
  EventWrappedApiResponseDtoOutputCoverageBestHeroCoverage;
export type EventWrappedHero = EventWrappedApiResponseDtoOutputHeroesItem;
export type EventWrappedLootHero =
  EventWrappedApiResponseDtoOutputLootHeroBreakdownItem;
export type EventWrapped = EventWrappedApiResponseDtoOutput;

export type PointsEditHistoryEntry = EventRanking["editHistory"][number];

export type WindowStatus = HeroRespawnConfigResponseDtoWindowStatus;
export type RespawnConfig = HeroRespawnConfigResponseDto;

export type MapAssignment = KillTimelineMapResponseDtoAssignmentsItem;
export type MapGap = KillTimelineMapResponseDtoGapsItem;
export type MapTimelineData = KillTimelineMapResponseDto;
