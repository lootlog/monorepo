import { Test, type TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Job } from 'bullmq';
import {
  RespawnWindowProcessor,
  type AutoCloseRespawnWindowJobData,
} from './respawn-window.processor';
import { EventsService } from './events.service';

describe('RespawnWindowProcessor', () => {
  let processor: RespawnWindowProcessor;
  let eventsService: EventsService;
  let logger: { log: jest.Mock };

  const mockEventsService = {
    closeRespawnWindow: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RespawnWindowProcessor,
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    processor = module.get<RespawnWindowProcessor>(RespawnWindowProcessor);
    eventsService = module.get<EventsService>(EventsService);
    logger = mockLogger;
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    const jobData: AutoCloseRespawnWindowJobData = {
      guildId: 'guild-1',
      eventId: 'event-1',
      heroId: 'hero-1',
      npcId: 123,
      world: 'tempest',
    };

    const createMockJob = (
      data: AutoCloseRespawnWindowJobData,
    ): Job<AutoCloseRespawnWindowJobData> =>
      ({
        data,
        id: 'job-1',
        attemptsMade: 0,
      }) as Job<AutoCloseRespawnWindowJobData>;

    it('should call closeRespawnWindow with correct parameters', async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);

      await processor.process(job);

      expect(mockEventsService.closeRespawnWindow).toHaveBeenCalledWith(
        'guild-1',
        'event-1',
        'hero-1',
        {
          createNewWindow: false,
          isAutoClose: true,
        },
      );
    });

    it('should log start and success messages', async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);

      await processor.process(job);

      expect(logger.log).toHaveBeenCalledTimes(2);
      expect(logger.log).toHaveBeenNthCalledWith(1, {
        level: 'info',
        message: expect.stringContaining('Auto-closing respawn window'),
      });
      expect(logger.log).toHaveBeenNthCalledWith(2, {
        level: 'info',
        message: expect.stringContaining('Successfully auto-closed'),
      });
    });

    it('should log error and rethrow when closeRespawnWindow fails', async () => {
      const job = createMockJob(jobData);
      const error = new Error('Database connection failed');
      mockEventsService.closeRespawnWindow.mockRejectedValue(error);

      await expect(processor.process(job)).rejects.toThrow(
        'Database connection failed',
      );

      expect(logger.log).toHaveBeenCalledWith({
        level: 'error',
        message: expect.stringContaining('Failed to auto-close'),
        error: 'Database connection failed',
        stack: expect.any(String),
      });
    });

    it('should handle non-Error exceptions', async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockRejectedValue(
        'String error message',
      );

      await expect(processor.process(job)).rejects.toBe('String error message');

      expect(logger.log).toHaveBeenCalledWith({
        level: 'error',
        message: expect.stringContaining('Failed to auto-close'),
        error: 'String error message',
        stack: undefined,
      });
    });

    it('should include heroId and npcId in start log message', async () => {
      const job = createMockJob(jobData);
      mockEventsService.closeRespawnWindow.mockResolvedValue(undefined);

      await processor.process(job);

      const startLog = logger.log.mock.calls[0][0];
      expect(startLog.message).toContain('hero-1');
      expect(startLog.message).toContain('123');
      expect(startLog.message).toContain('event-1');
    });
  });

  describe('onFailed', () => {
    const jobData: AutoCloseRespawnWindowJobData = {
      guildId: 'guild-1',
      eventId: 'event-1',
      heroId: 'hero-1',
      npcId: 123,
      world: 'tempest',
    };

    const createMockJob = (
      data: AutoCloseRespawnWindowJobData,
      attemptsMade = 1,
    ): Job<AutoCloseRespawnWindowJobData> =>
      ({
        data,
        id: 'job-1',
        attemptsMade,
      }) as Job<AutoCloseRespawnWindowJobData>;

    it('should log failed job with full context', () => {
      const job = createMockJob(jobData, 3);
      const error = new Error('Connection timeout');
      error.stack = 'Error stack trace';

      processor.onFailed(job, error);

      expect(logger.log).toHaveBeenCalledWith({
        level: 'error',
        message: 'Auto-close respawn window job failed',
        jobId: 'job-1',
        heroId: 'hero-1',
        eventId: 'event-1',
        guildId: 'guild-1',
        npcId: 123,
        world: 'tempest',
        attemptsMade: 3,
        error: 'Connection timeout',
        stack: 'Error stack trace',
      });
    });

    it('should include all job data fields in log', () => {
      const customJobData: AutoCloseRespawnWindowJobData = {
        guildId: 'another-guild',
        eventId: 'another-event',
        heroId: 'another-hero',
        npcId: 456,
        world: 'kastagar',
      };
      const job = createMockJob(customJobData);
      const error = new Error('Test error');

      processor.onFailed(job, error);

      const logCall = logger.log.mock.calls[0][0];
      expect(logCall.guildId).toBe('another-guild');
      expect(logCall.eventId).toBe('another-event');
      expect(logCall.heroId).toBe('another-hero');
      expect(logCall.npcId).toBe(456);
      expect(logCall.world).toBe('kastagar');
    });

    it('should log error message without stack if not available', () => {
      const job = createMockJob(jobData);
      const error = new Error('Simple error');
      delete error.stack;

      processor.onFailed(job, error);

      const logCall = logger.log.mock.calls[0][0];
      expect(logCall.error).toBe('Simple error');
      expect(logCall.stack).toBeUndefined();
    });

    it('should correctly track attemptsMade', () => {
      const job = createMockJob(jobData, 5);
      const error = new Error('Max retries exceeded');

      processor.onFailed(job, error);

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptsMade: 5,
        }),
      );
    });
  });
});
