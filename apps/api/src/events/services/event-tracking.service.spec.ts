import { Test, type TestingModule } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventTrackingService } from './event-tracking.service';
import { EventEmitterService } from './event-emitter.service';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { CoverageGapType } from 'generated/client';

describe('EventTrackingService', () => {
  let service: EventTrackingService;

  const mockPrismaService = {
    eventMap: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    eventMapAssignmentHistory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    eventMapCoverageGap: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    eventPresenceLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    eventHeroNpc: {
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    timer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventEmitter = {
    emitMapStatusUpdate: jest.fn(),
  };

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  const mockRedisClient = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockResolvedValue(mockRedisClient),
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRedlock = {
    using: jest.fn(),
    acquire: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventTrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitterService, useValue: mockEventEmitter },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<EventTrackingService>(EventTrackingService);

    // Inject mock redlock (bypassing onModuleInit)
    (service as any).redlock = mockRedlock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // assignMemberToMap
  // ==========================================================================
  describe('assignMemberToMap', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';
    const mapId = 'map-1';
    const memberId = 1;

    const mockMap = {
      id: mapId,
      mapName: 'Test Map',
      heroNpcId: 'hero-1',
      assignedMembers: [],
      heroNpc: {
        event: { mapAssignmentCap: null },
      },
    };

    it('should assign member to map successfully', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMapAssignmentHistory.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [{ id: memberId }],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);
      mockEventEmitter.emitMapStatusUpdate.mockResolvedValue(undefined);

      const result = await service.assignMemberToMap(guildId, eventId, mapId, memberId);

      expect(result.assignedMembers).toHaveLength(1);
      expect(mockPrismaService.eventMapAssignmentHistory.create).toHaveBeenCalled();
    });

    it('should skip assignment if member is already assigned (idempotency)', async () => {
      const mapWithMember = {
        ...mockMap,
        assignedMembers: [{ id: memberId }],
      };
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mapWithMember);
      mockPrismaService.eventMap.findUnique.mockResolvedValue(mapWithMember);

      const result = await service.assignMemberToMap(guildId, eventId, mapId, memberId);

      expect(mockPrismaService.eventMap.update).not.toHaveBeenCalled();
      expect(mockPrismaService.eventMapAssignmentHistory.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when map not found', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when map assignment cap is reached', async () => {
      const mapAtCap = {
        ...mockMap,
        assignedMembers: [{ id: 2 }, { id: 3 }],
        heroNpc: {
          event: { mapAssignmentCap: 2 },
        },
      };
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mapAtCap);

      await expect(
        service.assignMemberToMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not create duplicate assignment history', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [{ id: memberId }],
      });
      // Simulate existing open assignment
      mockPrismaService.eventMapAssignmentHistory.findFirst.mockResolvedValue({
        id: 'existing-1',
        mapId,
        memberId,
        unassignedAt: null,
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.assignMemberToMap(guildId, eventId, mapId, memberId);

      expect(mockPrismaService.eventMapAssignmentHistory.create).not.toHaveBeenCalled();
    });

    it('should close UNASSIGNED gap when first member is assigned', async () => {
      const emptyMap = { ...mockMap, assignedMembers: [] };
      mockPrismaService.eventMap.findFirst.mockResolvedValue(emptyMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...emptyMap,
        assignedMembers: [{ id: memberId }],
      });
      mockPrismaService.eventMapAssignmentHistory.findFirst.mockResolvedValue(null);

      // Mock the open gap
      const openGap = {
        id: 'gap-1',
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: new Date(),
        endedAt: null,
      };
      mockPrismaService.eventMapCoverageGap.findFirst
        .mockResolvedValueOnce(openGap) // For closeUnassignedGap
        .mockResolvedValueOnce(null); // For openUncoveredGap check

      await service.assignMemberToMap(guildId, eventId, mapId, memberId);

      expect(mockPrismaService.eventMapCoverageGap.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: openGap.id },
          data: expect.objectContaining({
            endedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // unassignMemberFromMap
  // ==========================================================================
  describe('unassignMemberFromMap', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';
    const mapId = 'map-1';
    const memberId = 1;

    const mockMap = {
      id: mapId,
      mapName: 'Test Map',
      heroNpcId: 'hero-1',
      assignedMembers: [{ id: memberId }],
      heroNpc: { id: 'hero-1' },
    };

    it('should unassign specific member from map', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      const result = await service.unassignMemberFromMap(
        guildId,
        eventId,
        mapId,
        memberId,
      );

      expect(mockPrismaService.eventMapAssignmentHistory.updateMany).toHaveBeenCalledWith({
        where: { mapId, memberId, unassignedAt: null },
        data: { unassignedAt: expect.any(Date) },
      });
    });

    it('should unassign all members when no memberId provided', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.unassignMemberFromMap(guildId, eventId, mapId);

      expect(mockPrismaService.eventMap.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            assignedMembers: { set: [] },
          },
        }),
      );
    });

    it('should throw NotFoundException when map not found', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.unassignMemberFromMap(guildId, eventId, mapId, memberId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should open UNASSIGNED gap when last member is unassigned', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(mockMap);
      mockPrismaService.eventMap.update.mockResolvedValue({
        ...mockMap,
        assignedMembers: [],
      });
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.unassignMemberFromMap(guildId, eventId, mapId, memberId);

      expect(mockPrismaService.eventMapCoverageGap.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mapId,
          heroNpcId: mockMap.heroNpcId,
          gapType: CoverageGapType.UNASSIGNED,
        }),
      });
    });
  });

  // ==========================================================================
  // handlePlayerPresenceChange
  // ==========================================================================
  describe('handlePlayerPresenceChange', () => {
    const guildId = 'guild-1';
    const mapName = 'Test Map';
    const discordId = 'discord-123';

    beforeEach(() => {
      // Setup redlock.using to execute the callback
      mockRedlock.using.mockImplementation(async (_keys, _ttl, callback) => {
        return callback();
      });
    });

    it('should acquire lock before processing presence change', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.findMany.mockResolvedValue([]);
      mockPrismaService.timer.findMany.mockResolvedValue([]);

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      expect(mockRedlock.using).toHaveBeenCalledWith(
        [`presence:lock:${guildId}:${mapName}:${discordId}`],
        5000,
        expect.any(Function),
      );
    });

    it('should skip processing if lock cannot be acquired', async () => {
      const { ExecutionError } = await import('redlock');
      // Create a mock error that looks like a redlock execution error
      const executionError = new ExecutionError('Lock failed', [] as never);
      mockRedlock.using.mockRejectedValue(executionError);

      // Should not throw, just skip
      await expect(
        service.handlePlayerPresenceChange(guildId, mapName, discordId, true, false),
      ).resolves.not.toThrow();

      expect(mockPrismaService.eventMap.findMany).not.toHaveBeenCalled();
    });

    it('should create presence log when player enters map', async () => {
      const mockMember = { id: 1, name: 'Test User' };
      const mockEventMap = {
        id: 'map-1',
        mapName,
        heroNpcId: 'hero-1',
        assignedMembers: [{ id: 1 }],
        heroNpc: {
          id: 'hero-1',
          npcId: 123,
          event: { world: 'tempest' },
        },
      };

      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.eventMap.findMany.mockResolvedValue([mockEventMap]);
      mockPrismaService.timer.findMany.mockResolvedValue([
        { guildId, world: 'tempest', npcId: 123, maxSpawnTime: new Date(Date.now() + 60000) },
      ]);
      mockPrismaService.eventPresenceLog.findMany.mockResolvedValue([]);
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue({
        id: 'gap-1',
        gapType: CoverageGapType.UNCOVERED,
        startedAt: new Date(),
      });

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      expect(mockPrismaService.eventPresenceLog.create).toHaveBeenCalledWith({
        data: {
          mapId: mockEventMap.id,
          memberId: mockMember.id,
          isAfk: false,
        },
      });
    });

    it('should close UNCOVERED gap when active player arrives', async () => {
      const mockMember = { id: 1 };
      const mockEventMap = {
        id: 'map-1',
        mapName,
        heroNpcId: 'hero-1',
        assignedMembers: [{ id: 1 }],
        heroNpc: {
          id: 'hero-1',
          npcId: 123,
          event: { world: 'tempest' },
        },
      };
      const openGap = {
        id: 'gap-1',
        mapId: 'map-1',
        gapType: CoverageGapType.UNCOVERED,
        startedAt: new Date(Date.now() - 60000),
        endedAt: null,
      };

      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.eventMap.findMany.mockResolvedValue([mockEventMap]);
      mockPrismaService.timer.findMany.mockResolvedValue([
        { guildId, world: 'tempest', npcId: 123, maxSpawnTime: new Date(Date.now() + 60000) },
      ]);
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(openGap);

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      expect(mockPrismaService.eventMapCoverageGap.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: openGap.id },
          data: expect.objectContaining({
            endedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should skip tracking if no active respawn window', async () => {
      const mockEventMap = {
        id: 'map-1',
        mapName,
        heroNpcId: 'hero-1',
        assignedMembers: [],
        heroNpc: {
          id: 'hero-1',
          npcId: 123,
          event: { world: 'tempest' },
        },
      };

      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.findMany.mockResolvedValue([mockEventMap]);
      // No active timers
      mockPrismaService.timer.findMany.mockResolvedValue([]);

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      // Should not create any presence logs
      expect(mockPrismaService.eventPresenceLog.create).not.toHaveBeenCalled();
    });

    it('should use batch query for timer checks (N+1 optimization)', async () => {
      const mockEventMaps = [
        {
          id: 'map-1',
          mapName,
          heroNpcId: 'hero-1',
          assignedMembers: [],
          heroNpc: { id: 'hero-1', npcId: 123, event: { world: 'tempest' } },
        },
        {
          id: 'map-2',
          mapName,
          heroNpcId: 'hero-2',
          assignedMembers: [],
          heroNpc: { id: 'hero-2', npcId: 456, event: { world: 'tempest' } },
        },
      ];

      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.eventMap.findMany.mockResolvedValue(mockEventMaps);
      mockPrismaService.timer.findMany.mockResolvedValue([]);

      await service.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        true,
        false,
      );

      // Should call findMany once for batch query, not findUnique per map
      expect(mockPrismaService.timer.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.timer.findUnique).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Coverage Gap Management
  // ==========================================================================
  describe('openUnassignedGap', () => {
    const mapId = 'map-1';
    const heroNpcId = 'hero-1';

    it('should create UNASSIGNED gap', async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.openUnassignedGap(mapId, heroNpcId);

      expect(mockPrismaService.eventMapCoverageGap.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mapId,
          heroNpcId,
          gapType: CoverageGapType.UNASSIGNED,
        }),
      });
    });

    it('should not create duplicate gap if one already exists', async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue({
        id: 'existing-gap',
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      });

      await service.openUnassignedGap(mapId, heroNpcId);

      expect(mockPrismaService.eventMapCoverageGap.create).not.toHaveBeenCalled();
    });
  });

  describe('closeUnassignedGap', () => {
    const mapId = 'map-1';

    it('should close existing UNASSIGNED gap', async () => {
      const openGap = {
        id: 'gap-1',
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: new Date(Date.now() - 60000),
        endedAt: null,
      };
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(openGap);

      await service.closeUnassignedGap(mapId);

      expect(mockPrismaService.eventMapCoverageGap.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: openGap.id },
          data: expect.objectContaining({
            endedAt: expect.any(Date),
            durationSeconds: expect.any(Number),
          }),
        }),
      );
    });

    it('should do nothing if no open gap exists', async () => {
      mockPrismaService.eventMapCoverageGap.findFirst.mockResolvedValue(null);

      await service.closeUnassignedGap(mapId);

      expect(mockPrismaService.eventMapCoverageGap.update).not.toHaveBeenCalled();
    });
  });

  describe('closeAllGapsForHero', () => {
    const heroNpcId = 'hero-1';

    it('should close all open gaps atomically in a transaction', async () => {
      const openGaps = [
        { id: 'gap-1', startedAt: new Date(Date.now() - 60000), endedAt: null },
        { id: 'gap-2', startedAt: new Date(Date.now() - 30000), endedAt: null },
      ];
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue(openGaps);
      mockPrismaService.$transaction.mockResolvedValue([]);

      await service.closeAllGapsForHero(heroNpcId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should do nothing if no open gaps', async () => {
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([]);

      await service.closeAllGapsForHero(heroNpcId);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Query Methods
  // ==========================================================================
  describe('getMapCoverageGaps', () => {
    const guildId = 'guild-1';
    const eventId = 'event-1';
    const mapId = 'map-1';

    it('should return coverage gaps for a map', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue({ id: mapId });
      mockPrismaService.eventMapCoverageGap.findMany.mockResolvedValue([
        { id: 'gap-1', gapType: CoverageGapType.UNASSIGNED },
      ]);

      const result = await service.getMapCoverageGaps(guildId, eventId, mapId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.eventMapCoverageGap.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { mapId },
          orderBy: { startedAt: 'desc' },
        }),
      );
    });

    it('should throw NotFoundException when map not found', async () => {
      mockPrismaService.eventMap.findFirst.mockResolvedValue(null);

      await expect(
        service.getMapCoverageGaps(guildId, eventId, mapId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMemberByDiscordId', () => {
    const discordId = 'discord-123';
    const guildId = 'guild-1';

    it('should return active member by discord ID', async () => {
      const mockMember = { id: 1, userId: discordId, guildId, active: true };
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);

      const result = await service.getMemberByDiscordId(discordId, guildId);

      expect(result).toEqual(mockMember);
      expect(mockPrismaService.member.findFirst).toHaveBeenCalledWith({
        where: {
          userId: discordId,
          guildId,
          active: true,
        },
      });
    });

    it('should return null for non-existing member', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      const result = await service.getMemberByDiscordId(discordId, guildId);

      expect(result).toBeNull();
    });
  });
});
