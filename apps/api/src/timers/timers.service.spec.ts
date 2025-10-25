import { Test, TestingModule } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { TimersService } from './timers.service';
import { PrismaService } from 'src/db/prisma.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';

describe('TimersService', () => {
  let service: TimersService;

  const mockPrismaService = {
    timer: {
      upsert: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  const mockGuildsService = {
    getGuildsForRequiredPermissions: jest.fn(),
    getMultipleGuildsPermissions: jest.fn(),
  };

  const mockUserLootlogConfigService = {
    getLootlogCharacterConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
      ],
    }).compile();

    service = module.get<TimersService>(TimersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
