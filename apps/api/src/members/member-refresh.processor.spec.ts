import type { Job } from "bullmq";
import type { Mock } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { mockFn } from "#src/test/mock-fn";
import { MemberRefreshProcessor } from "./member-refresh.processor.js";
import {
  MemberRefreshSchedulerService,
  type MemberRefreshJobData,
} from "./member-refresh-scheduler.service.js";
import { MembersService } from "./members.service.js";

describe("MemberRefreshProcessor", () => {
  let processor: MemberRefreshProcessor;
  let membersService: {
    syncMemberFromDiscord: Mock;
  };
  let scheduler: {
    acquireUserRefreshLock: Mock;
    getNextRefreshAt: Mock;
    extendUserRefreshLock: Mock;
    releaseUserRefreshLock: Mock;
  };
  let diagnostics: {
    recordMemberRefreshMetric: Mock;
    recordMemberRefreshLatency: Mock;
  };

  const job = {
    id: "job-1",
    timestamp: Date.now() - 1000,
    data: {
      discordId: "discord-123",
      guildId: "guild-123",
      userId: "user-123",
      priority: 4,
      reason: "test-refresh",
    },
  } as Job<MemberRefreshJobData>;

  beforeEach(async () => {
    const mockMembersService = {
      syncMemberFromDiscord: mockFn(),
    };
    const mockScheduler = {
      acquireUserRefreshLock: mockFn().mockResolvedValue(true),
      getNextRefreshAt: mockFn().mockResolvedValue(null),
      extendUserRefreshLock: mockFn().mockResolvedValue(undefined),
      releaseUserRefreshLock: mockFn().mockResolvedValue(undefined),
    };
    const mockDiagnostics = {
      recordMemberRefreshMetric: mockFn().mockResolvedValue(undefined),
      recordMemberRefreshLatency: mockFn().mockResolvedValue(undefined),
    };
    const mockLogger = {
      log: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberRefreshProcessor,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: MembersService, useValue: mockMembersService },
        {
          provide: MemberRefreshSchedulerService,
          useValue: mockScheduler,
        },
        {
          provide: DiscordSyncDiagnosticsService,
          useValue: mockDiagnostics,
        },
      ],
    }).compile();

    processor = module.get(MemberRefreshProcessor);
    membersService = module.get(MembersService) as typeof membersService;
    scheduler = module.get(MemberRefreshSchedulerService) as typeof scheduler;
    diagnostics = module.get(
      DiscordSyncDiagnosticsService,
    ) as typeof diagnostics;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should record processed metric and latency after a successful job", async () => {
    membersService.syncMemberFromDiscord.mockResolvedValue({
      member: null,
      status: "SUCCESS",
      nextRefreshAt: null,
    });

    await processor.process(job);

    expect(membersService.syncMemberFromDiscord).toHaveBeenCalledWith({
      discordId: "discord-123",
      guildId: "guild-123",
      userId: "user-123",
    });
    expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
      outcome: "processed",
      reason: "SUCCESS",
    });
    expect(diagnostics.recordMemberRefreshLatency).toHaveBeenCalledWith(
      expect.any(Number),
    );
    expect(scheduler.releaseUserRefreshLock).toHaveBeenCalledWith(
      "user-123",
      "job:job-1",
    );
  });

  it("should record rate limited and failed metrics before retrying the job", async () => {
    membersService.syncMemberFromDiscord.mockResolvedValue({
      member: null,
      status: "RATE_LIMITED",
      nextRefreshAt: new Date(),
    });

    await expect(processor.process(job)).rejects.toThrow(
      "MEMBER_REFRESH_RATE_LIMITED",
    );

    expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
      outcome: "rate_limited",
      reason: "test-refresh",
    });
    expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
      outcome: "failed",
      reason: "RATE_LIMITED",
    });
    expect(scheduler.releaseUserRefreshLock).toHaveBeenCalledWith(
      "user-123",
      "job:job-1",
    );
  });

  it("should retry dynamic Discord HTTP failures", async () => {
    membersService.syncMemberFromDiscord.mockResolvedValue({
      member: null,
      status: "DISCORD_HTTP_408",
      nextRefreshAt: null,
    });

    await expect(processor.process(job)).rejects.toThrow(
      "MEMBER_REFRESH_DISCORD_HTTP_408",
    );

    expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
      outcome: "failed",
      reason: "DISCORD_HTTP_408",
    });
    expect(diagnostics.recordMemberRefreshMetric).not.toHaveBeenCalledWith({
      outcome: "processed",
      reason: "DISCORD_HTTP_408",
    });
    expect(scheduler.releaseUserRefreshLock).toHaveBeenCalledWith(
      "user-123",
      "job:job-1",
    );
  });

  it("should record failed metric when the per-user refresh lock is active", async () => {
    scheduler.acquireUserRefreshLock.mockResolvedValue(false);

    await expect(processor.process(job)).rejects.toThrow(
      "MEMBER_REFRESH_LOCKED",
    );

    expect(diagnostics.recordMemberRefreshMetric).toHaveBeenCalledWith({
      outcome: "failed",
      reason: "MEMBER_REFRESH_LOCKED",
    });
    expect(scheduler.releaseUserRefreshLock).not.toHaveBeenCalled();
  });
});
