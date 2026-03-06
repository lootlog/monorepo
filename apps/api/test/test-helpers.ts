import { createHmac } from 'node:crypto';

export interface TestUser {
  id: string;
  email: string;
  discordId: string;
  role: string;
}

export const TEST_USERS = {
  MEMBER_WITH_WRITE: {
    id: 'user-123',
    email: 'test@example.com',
    discordId: 'discord-123',
    role: 'USER',
  },
  MEMBER_WITHOUT_ACCESS: {
    id: 'user-456',
    email: 'test2@example.com',
    discordId: 'discord-456',
    role: 'USER',
  },
} as const;

export const TEST_GUILDS = {
  GUILD_1: {
    id: 'guild-123',
    name: 'Test Guild 1',
    ownerId: 'discord-123',
    active: true,
  },
  GUILD_2: {
    id: 'guild-456',
    name: 'Test Guild 2',
    ownerId: 'discord-789',
    active: true,
  },
} as const;

export function createSignedAuthHeaders(
  user: Pick<TestUser, 'id' | 'discordId'>,
) {
  const timestamp = Date.now().toString();
  const secret =
    process.env.FORWARDED_AUTH_SIGNATURE_SECRET || 'test-forwarded-auth-secret';
  const signature = createHmac('sha256', secret)
    .update(`${user.id}:${user.discordId}:${timestamp}`)
    .digest('hex');

  return {
    'x-auth-user-id': user.id,
    'x-auth-discord-id': user.discordId,
    'x-auth-timestamp': timestamp,
    'x-auth-signature': signature,
  };
}

export function createTestLootPayload(overrides = {}) {
  return {
    loots: [
      {
        hid: 'item-1',
        name: 'Legendary Sword',
        icon: 'sword.png',
        pr: 100,
        prc: 'unique',
        stat: 'rarity=unique;lvl=50',
        id: 1,
        cl: 1,
      },
    ],
    npcs: [
      {
        id: 1,
        name: 'Dragon Boss',
        location: 'Dragon Cave',
        lvl: 50,
        prof: 'war',
        wt: 25,
        hpp: 10000,
        icon: 'dragon.png',
        type: 3,
      },
    ],
    players: [
      {
        id: 1,
        accountId: 12345,
        name: 'TestPlayer',
        lvl: 50,
        prof: 'war',
        icon: 'player.png',
        hpp: 5000,
      },
    ],
    world: 'test-world',
    source: 'FIGHT',
    location: 'Dragon Cave',
    accountId: '12345',
    characterId: '1',
    ...overrides,
  };
}

export function createTestTimerPayload(overrides = {}) {
  return {
    respBaseSeconds: 3600,
    respawnRandomness: 300,
    world: 'test-world',
    npc: {
      id: 1,
      name: 'Boss Monster',
      location: 'Boss Lair',
      lvl: 40,
      prof: 'war',
      wt: 20,
      hpp: 8000,
      icon: 'boss.png',
      type: 2,
    },
    characterId: '1',
    accountId: '12345',
    ...overrides,
  };
}
