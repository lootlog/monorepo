import { beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  captureReactException: vi.fn(),
  init: vi.fn(),
  reactErrorHandler: vi.fn(() => vi.fn()),
  thirdPartyErrorFilterIntegration: vi.fn(() => ({
    name: "ThirdPartyErrorFilter",
  })),
}));

vi.mock("@sentry/react", () => sentryMocks);

describe("error monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("stays disabled when no Sentry DSN is configured", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    const { initializeErrorMonitoring, reportLootSkipped } =
      await import("./error-monitoring");

    initializeErrorMonitoring();
    reportLootSkipped({
      attemptId: "attempt-disabled",
      reason: "empty-parsed-loots",
      source: "fight",
    });

    expect(sentryMocks.init).not.toHaveBeenCalled();
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
  });

  it("does not prevent application startup when Sentry initialization fails", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "invalid-dsn");
    sentryMocks.init.mockImplementationOnce(() => {
      throw new Error("Sentry initialization failed");
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { initializeErrorMonitoring } = await import("./error-monitoring");

    expect(() => initializeErrorMonitoring()).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(
      "[ErrorMonitoring] Sentry operation failed:",
      expect.any(Error),
    );
  });

  it("initializes errors-only monitoring when a Sentry DSN is configured", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");

    const { initializeErrorMonitoring } = await import("./error-monitoring");

    initializeErrorMonitoring();

    expect(sentryMocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.ingest.sentry.io/1",
        dataCollection: {
          cookies: false,
          genAI: { inputs: false, outputs: false },
          httpBodies: [],
          httpHeaders: { request: false, response: false },
          queryParams: false,
          stackFrameVariables: false,
          userInfo: false,
        },
        environment: "test",
        release: "game-client-test",
        sendDefaultPii: false,
      }),
    );
    const initOptions = sentryMocks.init.mock.calls[0]?.[0];
    expect(initOptions).toBeDefined();
    expect(
      initOptions?.integrations?.([
        { name: "Breadcrumbs" },
        { name: "GlobalHandlers" },
      ]),
    ).toEqual([{ name: "GlobalHandlers" }, { name: "ThirdPartyErrorFilter" }]);
    expect(sentryMocks.thirdPartyErrorFilterIntegration).toHaveBeenCalledWith({
      behaviour: "drop-error-if-exclusively-contains-third-party-frames",
      filterKeys: ["lootlog-game-client"],
    });
  });

  it("does not filter unmarked application frames in local development", async () => {
    vi.stubEnv("MODE", "development");
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { initializeErrorMonitoring } = await import("./error-monitoring");

    initializeErrorMonitoring();

    const initOptions = sentryMocks.init.mock.calls[0]?.[0];
    expect(
      initOptions?.integrations?.([
        { name: "Breadcrumbs" },
        { name: "GlobalHandlers" },
      ]),
    ).toEqual([{ name: "GlobalHandlers" }]);
    expect(sentryMocks.thirdPartyErrorFilterIntegration).not.toHaveBeenCalled();
  });

  it("provides React 19 handlers for errors outside the application boundary", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { getReactRootErrorHandlers, initializeErrorMonitoring } =
      await import("./error-monitoring");
    initializeErrorMonitoring();

    const handlers = getReactRootErrorHandlers();

    expect(sentryMocks.reactErrorHandler).toHaveBeenCalledTimes(2);
    expect(handlers).toEqual({
      onRecoverableError: expect.any(Function),
      onUncaughtError: expect.any(Function),
    });
    expect(handlers).not.toHaveProperty("onCaughtError");
  });

  it("removes request and user data before sending an event", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { initializeErrorMonitoring } = await import("./error-monitoring");
    initializeErrorMonitoring();
    const initOptions = sentryMocks.init.mock.calls[0]?.[0];

    const sanitizedEvent = initOptions?.beforeSend?.({
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename:
                    "https://pandora.margonem.pl/game?token=secret#battle",
                },
              ],
            },
          },
        ],
      },
      request: {
        cookies: "session=secret",
        data: { accountId: "account-1" },
        headers: { authorization: "Bearer secret" },
        url: "https://pandora.margonem.pl/game?token=secret#battle",
      },
      user: { id: "player-1" },
    });

    expect(sanitizedEvent).toEqual({
      exception: {
        values: [
          {
            stacktrace: {
              frames: [{ filename: "https://pandora.margonem.pl/game" }],
            },
          },
        ],
      },
      request: { url: "https://pandora.margonem.pl/game" },
    });
  });

  it("reports a loot skip with actionable non-player diagnostics", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { initializeErrorMonitoring, reportLootSkipped } =
      await import("./error-monitoring");
    initializeErrorMonitoring();

    reportLootSkipped({
      attemptId: "attempt-1",
      mapName: "Ithan",
      reason: "unresolved-dialog-npcs",
      requestedNpcIds: [501, 502],
      resolvedNpcCount: 0,
      source: "dialog",
      world: "pandora",
    });

    expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
      "Loot creation skipped: unresolved-dialog-npcs",
      {
        extra: {
          attemptId: "attempt-1",
          mapName: "Ithan",
          requestedNpcIds: [501, 502],
          resolvedNpcCount: 0,
          world: "pandora",
        },
        fingerprint: [
          "loot-creation-skipped",
          "dialog",
          "unresolved-dialog-npcs",
        ],
        level: "warning",
        tags: {
          feature: "loot",
          lootReason: "unresolved-dialog-npcs",
          lootSource: "dialog",
        },
      },
    );
  });

  it("reports one sanitized event for a failed API action", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { initializeErrorMonitoring, reportApiActionFailure } =
      await import("./error-monitoring");
    initializeErrorMonitoring();
    const error = Object.assign(new Error("Request failed"), {
      data: { accountId: "account-secret" },
    });

    reportApiActionFailure({
      actionId: "action-1",
      actionType: "create_loot",
      failedRequests: [
        {
          endpoint: "/loots/123?token=secret",
          error,
          method: "POST",
          statusCode: 500,
        },
      ],
      monitoringContext: {
        attemptId: "attempt-1",
        feature: "loot",
        itemCount: 2,
        lootSource: "fight",
        mapName: "Ithan",
        npcCount: 1,
        npcIds: [501],
        playerCount: 3,
        world: "pandora",
      },
      requestAttemptCount: 1,
      status: "error",
    });

    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Request failed",
        name: "Error",
        stack: error.stack,
      }),
      {
        captureContext: {
          extra: {
            actionId: "action-1",
            failedRequestCount: 1,
            monitoringContext: {
              attemptId: "attempt-1",
              feature: "loot",
              itemCount: 2,
              lootSource: "fight",
              mapName: "Ithan",
              npcCount: 1,
              npcIds: [501],
              playerCount: 3,
              world: "pandora",
            },
            requests: [
              {
                endpoint: "/loots/:id",
                message: "Request failed",
                method: "POST",
                statusCode: 500,
              },
            ],
            requestAttemptCount: 1,
          },
          fingerprint: ["api-action", "create_loot", "/loots/:id", "500"],
          level: "error",
          tags: {
            actionStatus: "error",
            actionType: "create_loot",
            endpoint: "/loots/:id",
            feature: "loot",
            statusCode: "500",
          },
        },
      },
    );
    expect(sentryMocks.captureException.mock.calls[0]?.[0]).not.toBe(error);
    expect(sentryMocks.captureException.mock.calls[0]?.[0]).not.toHaveProperty(
      "data",
    );
  });

  it("reports bootstrap failures with an application mechanism tag", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { captureBootstrapError, initializeErrorMonitoring } =
      await import("./error-monitoring");
    initializeErrorMonitoring();
    const error = new Error("Bootstrap failed");

    captureBootstrapError(error);

    expect(sentryMocks.captureException).toHaveBeenCalledWith(error, {
      captureContext: {
        fingerprint: ["{{ default }}", "game-client-bootstrap"],
        tags: {
          feature: "application",
          mechanism: "bootstrap",
        },
      },
    });
  });

  it("captures a manual verification error from the game-client bundle", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { initializeErrorMonitoring, triggerErrorMonitoringTest } =
      await import("./error-monitoring");
    initializeErrorMonitoring();

    expect(triggerErrorMonitoringTest()).toBe(true);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Sentry game-client verification error",
      }),
      {
        captureContext: {
          fingerprint: ["game-client-sentry-verification"],
          tags: {
            feature: "application",
            mechanism: "manual-verification",
          },
        },
      },
    );
  });

  it("preserves React component stack details", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const { captureReactError, initializeErrorMonitoring } =
      await import("./error-monitoring");
    initializeErrorMonitoring();
    const error = new Error("Render failed");
    const errorInfo = { componentStack: "\n at AppContent" };

    captureReactError(error, errorInfo);

    expect(sentryMocks.captureReactException).toHaveBeenCalledWith(
      error,
      errorInfo,
      {
        captureContext: {
          tags: {
            feature: "application",
            mechanism: "react-error-boundary",
          },
        },
      },
    );
  });
});
