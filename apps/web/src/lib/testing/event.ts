import type { EventOverviewResponseDto } from "@lootlog/client/main";

export const createEventOverview = (
  overrides: Partial<EventOverviewResponseDto> = {},
): EventOverviewResponseDto => ({
  id: "event-1",
  guildId: "guild-1",
  name: "Wakacje 2026",
  world: "Fobos",
  active: true,
  startsAt: null,
  endsAt: null,
  createdAt: "2026-08-01T12:00:00Z",
  updatedAt: "2026-08-01T12:00:00Z",
  scoringMode: "SIMPLE",
  scoringRules: null,
  heroNpcs: [],
  ...overrides,
});
