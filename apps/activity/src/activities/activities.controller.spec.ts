import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitiesQueryService } from './services/activities-query.service';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import {
  PaginatedActivitiesEntity,
  ActivityEntity,
} from './entities/activity.entity';
import { ActivityType, ActivitySource } from '../../prisma/generated/client';
import { AuthGuard } from '@lootlog/nest-shared';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let queryService: ActivitiesQueryService;
  let service: ActivitiesService;

  const mockActivity: ActivityEntity = {
    id: 'activity-1',
    userId: 'user-1',
    guildId: 'guild-1',
    discordId: 'discord-1',
    type: ActivityType.LOOT_EVENT,
    source: ActivitySource.WEB_APP,
    createdAt: new Date('2024-01-01'),
    details: { itemName: 'Sword' },
  } as ActivityEntity;

  const mockPaginatedResponse: PaginatedActivitiesEntity = {
    data: [mockActivity],
    nextCursor: 'cursor-1',
    hasMore: false,
  } as PaginatedActivitiesEntity;

  const mockQueryService = {
    findByGuild: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
  };

  const mockService = {
    deleteOne: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: mockService,
        },
        {
          provide: ActivitiesQueryService,
          useValue: mockQueryService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
    queryService = module.get<ActivitiesQueryService>(ActivitiesQueryService);
    service = module.get<ActivitiesService>(ActivitiesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByGuild', () => {
    it('should return paginated activities for a guild', async () => {
      const guildId = 'guild-1';
      const query: QueryActivitiesDto = { limit: 50 };

      mockQueryService.findByGuild.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findByGuild(guildId, query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(queryService.findByGuild).toHaveBeenCalledWith(guildId, query);
      expect(queryService.findByGuild).toHaveBeenCalledTimes(1);
    });

    it('should pass query parameters to service', async () => {
      const guildId = 'guild-1';
      const query: QueryActivitiesDto = {
        type: ActivityType.LOOT_EVENT,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        cursor: 'cursor-1',
        limit: 25,
      };

      mockQueryService.findByGuild.mockResolvedValue(mockPaginatedResponse);

      await controller.findByGuild(guildId, query);

      expect(queryService.findByGuild).toHaveBeenCalledWith(guildId, query);
    });
  });

  describe('findByUser', () => {
    it('should return paginated activities for a user', async () => {
      const guildId = 'guild-1';
      const userId = 'user-1';
      const query: QueryActivitiesDto = { limit: 50 };

      mockQueryService.findByUser.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findByUser(guildId, userId, query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(queryService.findByUser).toHaveBeenCalledWith(userId, guildId, query);
      expect(queryService.findByUser).toHaveBeenCalledTimes(1);
    });

    it('should pass query parameters to service', async () => {
      const guildId = 'guild-1';
      const userId = 'user-1';
      const query: QueryActivitiesDto = {
        type: ActivityType.TIMER_EVENT,
        limit: 100,
      };

      mockQueryService.findByUser.mockResolvedValue(mockPaginatedResponse);

      await controller.findByUser(guildId, userId, query);

      expect(queryService.findByUser).toHaveBeenCalledWith(userId, guildId, query);
    });
  });

  describe('findOne', () => {
    it('should return a single activity by ID', async () => {
      const guildId = 'guild-1';
      const activityId = 'activity-1';

      mockQueryService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(guildId, activityId);

      expect(result).toEqual(mockActivity);
      expect(queryService.findOne).toHaveBeenCalledWith(activityId, guildId);
      expect(queryService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteGuildActivityById', () => {
    it('should delete a specific activity by ID', async () => {
      const guildId = 'guild-1';
      const activityId = 'activity-1';
      const expectedCount = 1;

      mockService.deleteOne.mockResolvedValue(expectedCount);

      const result = await controller.deleteGuildActivityById(guildId, activityId);

      expect(result).toEqual({ count: expectedCount });
      expect(service.deleteOne).toHaveBeenCalledWith(activityId, guildId);
      expect(service.deleteOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('endpoint restrictions', () => {
    it('should not have a findAll method that allows fetching all activities', () => {
      expect((controller as any).findAll).toBeUndefined();
    });
  });
});
