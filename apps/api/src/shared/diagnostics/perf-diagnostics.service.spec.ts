import type { Logger } from "winston";
import { env } from "#src/config/env";
import { mockFn } from "#src/test/mock-fn";
import { PerfDiagnosticsService } from "./perf-diagnostics.service.js";
import { requestDiagnosticsStorage } from "./request-diagnostics-context.js";

describe("PerfDiagnosticsService", () => {
  const diagnosticsEnv = env as typeof env & {
    PERF_DIAGNOSTICS_ENABLED: boolean;
    PERF_DIAGNOSTICS_SAMPLE_RATE: number;
    PERF_DIAGNOSTICS_THRESHOLD_MS: number;
  };

  beforeEach(() => {
    diagnosticsEnv.PERF_DIAGNOSTICS_ENABLED = true;
    diagnosticsEnv.PERF_DIAGNOSTICS_SAMPLE_RATE = 1;
    diagnosticsEnv.PERF_DIAGNOSTICS_THRESHOLD_MS = 50;
  });

  afterEach(() => {
    diagnosticsEnv.PERF_DIAGNOSTICS_ENABLED = false;
  });

  it("keeps diagnostic fields inside the message payload", () => {
    const logger = {
      warn: mockFn(),
    } as unknown as Logger;
    const service = new PerfDiagnosticsService(logger);

    requestDiagnosticsStorage.run(
      {
        method: "GET",
        requestId: "request-1",
        sampled: true,
        startTimeMs: 0,
        url: "/guilds/guild-1/permissions",
        route: "GuildsController.getPermissions",
      },
      () => {
        service.logSpan("member_context.total", 75.126, {
          guildCacheHit: true,
          stagesMs: {
            memberLookup: 70.222,
          },
        });
      },
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);

    const [entry] = vi.mocked(logger.warn).mock.calls[0];
    expect(Object.keys(entry)).toEqual(["level", "message"]);
    expect(entry.message).toContain("api.perf ");

    const payload = JSON.parse(entry.message.replace("api.perf ", ""));
    expect(payload).toMatchObject({
      event: "api.perf",
      span: "member_context.total",
      durationMs: 75.13,
      guildCacheHit: true,
      requestId: "request-1",
    });
  });
});
