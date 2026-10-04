import type {
  EventListItemResponseDto,
  EventMapsResponseDtoOutput,
  EventMapsResponseDtoOutputHeroNpcsItemMapsItemAssignedMembersItemRolesItem,
  EventTimerResponseDto,
  EventOverviewResponseDtoHeroNpcsItem,
  EventRankingEntryResponseDto,
  EventWrappedApiResponseDtoOutput,
  HeroRespawnConfigResponseDtoWindowStatus,
  KillTimelineMapResponseDto,
  KillTimelineMapResponseDtoAssignmentsItem,
  KillTimelineMapResponseDtoGapsItem,
} from "@lootlog/client/main";

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

export type EventWrapped = EventWrappedApiResponseDtoOutput;

export type WindowStatus = HeroRespawnConfigResponseDtoWindowStatus;

export type MapAssignment = KillTimelineMapResponseDtoAssignmentsItem;

export type MapGap = KillTimelineMapResponseDtoGapsItem;

export type MapTimelineData = KillTimelineMapResponseDto;
