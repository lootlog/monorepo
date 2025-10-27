import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/db/prisma.service';
import { DiscordService } from 'src/discord/discord.service';

describe('UserService', () => {
  let service: UsersService;

  const mockPrismaService = {
    userSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockDiscordService = {
    getGuildMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DiscordService,
          useValue: mockDiscordService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
