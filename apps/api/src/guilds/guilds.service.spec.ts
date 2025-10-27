import { Test, type TestingModule } from '@nestjs/testing';
import { GuildsService } from './guilds.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from 'src/db/prisma.service';
import { MembersService } from 'src/members/members.service';
import { RolesService } from 'src/roles/roles.service';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import { DiscordService } from 'src/discord/discord.service';
import { UsersService } from 'src/users/users.service';
import { RedisService } from 'src/lib/redis/redis.service';

describe('GuildsService', () => {
  let service: GuildsService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockPrismaService = {
    guild: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
    timer: {
      findMany: jest.fn(),
    },
    lootlogConfigNpc: {
      deleteMany: jest.fn(),
    },
    lootlogConfig: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMembersService = {
    getGuildMemberById: jest.fn(),
    deleteMembersByGuildId: jest.fn(),
  };

  const mockRolesService = {
    bulkCreateRoles: jest.fn(),
    deleteRolesByGuildId: jest.fn(),
  };

  const mockLootlogConfigService = {
    createLootlogConfig: jest.fn(),
  };

  const mockDiscordService = {
    getUserGuilds: jest.fn(),
    clearUserGuildIdsCache: jest.fn(),
  };

  const mockUsersService = {
    getUserPreferences: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    deleteByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
        {
          provide: LootlogConfigService,
          useValue: mockLootlogConfigService,
        },
        {
          provide: DiscordService,
          useValue: mockDiscordService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
