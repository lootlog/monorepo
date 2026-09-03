import { LootSourceEnum as LootSource } from "@lootlog/schema/loot";

export const TEST_GUILDS = {
  GUILD_1: {
    id: "guild-1",
    name: "Test Guild 1",
    icon: null,
    ownerId: "owner-1",
  },
  GUILD_2: {
    id: "guild-2",
    name: "Test Guild 2",
    icon: null,
    ownerId: "owner-2",
  },
} as const;

export const TEST_USERS = {
  MEMBER_WITH_WRITE: {
    id: "user-123",
    email: "test@example.com",
    discordId: "discord-123",
    role: "USER",
  },
  MEMBER_WITHOUT_ACCESS: {
    id: "user-456",
    email: "test2@example.com",
    discordId: "discord-456",
    role: "USER",
  },
} as const;

export function createTestTimerPayload(overrides = {}) {
  return {
    respBaseSeconds: 3600,
    world: "test-world",
    accountId: "12345",
    characterId: "1",
    npc: {
      id: 1,
      name: "Test Boss",
      location: "Test Location",
      lvl: 100,
      prof: "w",
      wt: 80,
      icon: "test-boss.gif",
      type: 2,
    },
    ...overrides,
  };
}

export function createTestLootPayload(overrides = {}) {
  return {
    loots: [
      {
        hid: "item-hid-1",
        name: "Test Item",
        icon: "test-item.gif",
        pr: 3,
        prc: "unique",
        stat: "lvl=100;rarity=UNIQUE",
        id: 1001,
        cl: 16,
      },
    ],
    npcs: [
      {
        id: 2001,
        name: "Test Boss",
        location: "Test Location",
        lvl: 100,
        prof: "w",
        wt: 80,
        icon: "test-boss.gif",
        type: 2,
      },
    ],
    players: [
      {
        id: 3001,
        accountId: 12345,
        name: "Test Player",
        lvl: 100,
        prof: "w",
        icon: "test-player.gif",
      },
    ],
    world: "test-world",
    source: LootSource.FIGHT,
    location: "Test Location",
    accountId: "12345",
    characterId: "1",
    ...overrides,
  };
}
