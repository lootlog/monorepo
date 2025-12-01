import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
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

  const mockService = {
    findByGuild: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
    getStatsByGuild: jest.fn(),
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
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
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

      mockService.findByGuild.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findByGuild(guildId, query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findByGuild).toHaveBeenCalledWith(guildId, query);
      expect(service.findByGuild).toHaveBeenCalledTimes(1);
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

      mockService.findByGuild.mockResolvedValue(mockPaginatedResponse);

      await controller.findByGuild(guildId, query);

      expect(service.findByGuild).toHaveBeenCalledWith(guildId, query);
    });
  });

  describe('findByUser', () => {
    it('should return paginated activities for a user', async () => {
      const guildId = 'guild-1';
      const userId = 'user-1';
      const query: QueryActivitiesDto = { limit: 50 };

      mockService.findByUser.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findByUser(guildId, userId, query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findByUser).toHaveBeenCalledWith(userId, guildId, query);
      expect(service.findByUser).toHaveBeenCalledTimes(1);
    });

    it('should pass query parameters to service', async () => {
      const guildId = 'guild-1';
      const userId = 'user-1';
      const query: QueryActivitiesDto = {
        type: ActivityType.TIMER_EVENT,
        limit: 100,
      };

      mockService.findByUser.mockResolvedValue(mockPaginatedResponse);

      await controller.findByUser(guildId, userId, query);

      expect(service.findByUser).toHaveBeenCalledWith(userId, guildId, query);
    });
  });

  describe('getStatsByGuild', () => {
    it('should return activity statistics for a guild', async () => {
      const guildId = 'guild-1';
      const mockStats: Record<ActivityType, number> = {
        [ActivityType.LOOT_EVENT]: 10,
        [ActivityType.TIMER_EVENT]: 8,
        [ActivityType.CONNECT_EVENT]: 15,
        [ActivityType.DISCONNECT_EVENT]: 4,
      };

      mockService.getStatsByGuild.mockResolvedValue(mockStats);

      const result = await controller.getStatsByGuild(guildId);

      expect(result).toEqual(mockStats);
      expect(service.getStatsByGuild).toHaveBeenCalledWith(guildId);
      expect(service.getStatsByGuild).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a single activity by ID', async () => {
      const guildId = 'guild-1';
      const activityId = 'activity-1';

      mockService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(guildId, activityId);

      expect(result).toEqual(mockActivity);
      expect(service.findOne).toHaveBeenCalledWith(activityId, guildId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteByGuild', () => {
    it('should delete all activities for a guild', async () => {
      const guildId = 'guild-1';
      const expectedCount = 25;

      mockService.deleteMany.mockResolvedValue(expectedCount);

      const result = await controller.deleteByGuild(guildId);

      expect(result).toEqual({ count: expectedCount });
      expect(service.deleteMany).toHaveBeenCalledWith(guildId, undefined);
      expect(service.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('should delete activities of specific type for a guild', async () => {
      const guildId = 'guild-1';
      const type = ActivityType.LOOT_EVENT;
      const expectedCount = 10;

      mockService.deleteMany.mockResolvedValue(expectedCount);

      const result = await controller.deleteByGuild(guildId, type);

      expect(result).toEqual({ count: expectedCount });
      expect(service.deleteMany).toHaveBeenCalledWith(guildId, type);
      expect(service.deleteMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('endpoint restrictions', () => {
    it('should not have a findAll method that allows fetching all activities', () => {
      expect((controller as any).findAll).toBeUndefined();
    });
  });
});
