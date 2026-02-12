import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PresenceService } from 'src/gateway/services/presence.service';
import { Platform } from 'src/gateway/enums/platform.enum';

describe('PresenceService', () => {
  const mockAmqpConnection = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AmqpConnection>;

  let service: PresenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PresenceService(mockAmqpConnection);
  });

  it('includes lootlogSettings in fetchServerPresence payload', async () => {
    const lootlogSettings = {
      accountId: 'acc-1',
      characterId: 'char-1',
      guildStatusByGuildId: {
        'guild-1': {
          timersEnabled: true,
          lootEnabled: false,
        },
      },
    };

    const socketInRoom = {
      id: 'socket-room-1',
      data: {
        discordId: 'discord-2',
        platform: Platform.GAME,
        status: 'online',
        guilds: [
          {
            guild: { id: 'guild-1', ownerId: 'owner-1' },
            roles: [],
          },
        ],
        player: {
          world: 'berufs',
          name: 'Player',
          characterId: 'char-1',
          accountId: 'acc-1',
          icon: 'icon.png',
          lvl: 100,
          prof: 'h',
          location: { x: 1, y: 2, map: 'Map' },
        },
        lootlogSettings,
      },
    };

    const server = {
      in: jest.fn().mockReturnThis(),
      fetchSockets: jest.fn().mockResolvedValue([socketInRoom]),
    } as never;

    const client = {
      data: {
        guilds: [
          {
            guild: { id: 'guild-1', ownerId: 'owner-1' },
            roles: [],
          },
        ],
        platform: Platform.GAME,
      },
    } as never;

    const payload = await service.fetchServerPresence(server, client, {
      guildId: 'guild-1',
      world: 'berufs',
    });

    expect(payload['discord-2']).toBeDefined();
    expect(payload['discord-2'][0]).toEqual(
      expect.objectContaining({
        lootlogSettings,
      }),
    );
  });
});
