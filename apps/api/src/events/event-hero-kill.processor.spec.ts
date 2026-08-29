import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import type { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { EventHeroKillProcessor } from "./event-hero-kill.processor.js";
import { EventsService } from "./events.service.js";
import type { EventHeroKillJobData } from "./interfaces/check-event-hero-kill-params.interface.js";

describe("EventHeroKillProcessor", () => {
  let processor: EventHeroKillProcessor;

  const mockEventsService = {
    checkAndRecordEventHeroKill: mockFn(),
  };

  const mockLogger = {
    log: mockFn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventHeroKillProcessor,
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

    processor = module.get<EventHeroKillProcessor>(EventHeroKillProcessor);
  });

  it("should deserialize timer dates and delegate to EventsService", async () => {
    const job = {
      id: "job-1",
      attemptsMade: 0,
      data: {
        guildId: "guild-1",
        world: "tempest",
        npcId: 123,
        npcName: "Hero",
        npcIcon: "icon.gif",
        npcLvl: 250,
        isManualClose: true,
        timerData: {
          minSpawnTime: "2026-02-18T10:00:00.000Z",
          maxSpawnTime: "2026-02-18T12:00:00.000Z",
          memberId: 1,
          previousMinSpawnTime: "2026-02-18T08:00:00.000Z",
          previousMaxSpawnTime: "2026-02-18T09:00:00.000Z",
          windowOpenedAt: "2026-02-18T08:00:00.000Z",
        },
      } satisfies EventHeroKillJobData,
    } as Job<EventHeroKillJobData>;

    await processor.process(job);

    expect(mockEventsService.checkAndRecordEventHeroKill).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        world: "tempest",
        npcId: 123,
        timerData: expect.objectContaining({
          minSpawnTime: new Date("2026-02-18T10:00:00.000Z"),
          maxSpawnTime: new Date("2026-02-18T12:00:00.000Z"),
          previousMinSpawnTime: new Date("2026-02-18T08:00:00.000Z"),
          previousMaxSpawnTime: new Date("2026-02-18T09:00:00.000Z"),
          windowOpenedAt: new Date("2026-02-18T08:00:00.000Z"),
        }),
      }),
      true,
    );
  });

  it("should log failed worker jobs with context", () => {
    const job = {
      id: "job-2",
      attemptsMade: 3,
      data: {
        guildId: "guild-1",
        world: "tempest",
        npcId: 123,
        npcName: "Hero",
        npcIcon: "icon.gif",
        timerData: {
          minSpawnTime: "2026-02-18T10:00:00.000Z",
          maxSpawnTime: "2026-02-18T12:00:00.000Z",
          memberId: 1,
          previousMinSpawnTime: null,
          previousMaxSpawnTime: null,
          windowOpenedAt: null,
        },
        isManualClose: false,
      } satisfies EventHeroKillJobData,
    } as Job<EventHeroKillJobData>;

    const error = new Error("boom");

    processor.onFailed(job, error);

    expect(mockLogger.log).toHaveBeenCalledWith({
      level: "error",
      message: "Event hero kill job failed",
      jobId: "job-2",
      guildId: "guild-1",
      world: "tempest",
      npcId: 123,
      attemptsMade: 3,
      error: "boom",
      stack: expect.any(String),
    });
  });
});
