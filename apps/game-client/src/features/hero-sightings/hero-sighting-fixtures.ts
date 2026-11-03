import type { HeroSightingResponseDto } from "@lootlog/client/main";

export const createHeroSightingMember = (
  overrides: Partial<HeroSightingResponseDto["detectedBy"]> = {},
): HeroSightingResponseDto["detectedBy"] => ({
  memberId: 1,
  userId: "user-1",
  displayName: "Detector",
  avatarUrl: null,
  ...overrides,
});

/** A current roaming sighting, as `GET /hero-sightings` returns it. */
export const createHeroSighting = (
  overrides: Partial<HeroSightingResponseDto> = {},
): HeroSightingResponseDto => ({
  id: 1,
  guildId: "guild-1",
  world: "luvia",
  hero: { key: "tepeyollotl", name: "Tepeyollotl", lvl: 258, prof: null },
  state: "ROAMING",
  mapName: "Oztotl Tzacua p.2 - sala 2",
  firstSeenAt: "2026-11-03T12:00:00.000Z",
  lastSeenAt: "2026-11-03T12:00:00.000Z",
  spawnedAt: null,
  closedAt: null,
  closeReason: null,
  detectedBy: createHeroSightingMember(),
  detectorCharacter: null,
  lastSeenBy: createHeroSightingMember(),
  claims: [],
  ...overrides,
});
