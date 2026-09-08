import type { UserPreferencesResponseDtoOutput } from "@lootlog/client/main";

export const createUserPreferences = (
  overrides: Partial<UserPreferencesResponseDtoOutput> = {},
): UserPreferencesResponseDtoOutput => ({
  userId: "user-1",
  guildsOrder: [],
  hiddenGuildIds: [],
  theme: "default",
  chatAppearance: {
    npcLayout: "inline",
    fontScalePercent: 100,
    messageGapPx: 4,
    showTimestamp: true,
    showGuildLabel: true,
    showNpcAvatar: true,
    showNpcLevel: true,
    showNpcLocationAndCoordinates: true,
  },
  mutes: { players: [], npcs: [] },
  ...overrides,
});
