import type {
  guildTable,
  memberTable,
} from "../src/database/drizzle/schema.js";

type Guild = typeof guildTable.$inferSelect;
type Member = typeof memberTable.$inferSelect;

export const createGuildFixture = (overrides: Partial<Guild> = {}): Guild => ({
  id: "guild-1",
  name: "Guild",
  icon: null,
  ownerId: "owner-1",
  vanityUrl: null,
  notificationRuleLimit: 20,
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
  documentLimit: 50,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  active: true,
  ...overrides,
});

export const createMemberFixture = (
  overrides: Partial<Member> = {},
): Member => ({
  id: 1,
  userId: "user-1",
  guildId: "guild-1",
  type: "USER",
  name: "Member",
  avatar: null,
  banner: null,
  active: true,
  globalUserId: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastDiscordSyncAt: null,
  lastDiscordAttemptAt: null,
  lastDiscordStatus: null,
  ...overrides,
});
