import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { installBrowserEnvironment } from "./browser-environment.mjs";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(fixtureDirectory, "..");
const artifactsDirectory = resolve(appDirectory, "artifacts/browser-perf");
const isQuickRun = process.env.BROWSER_PERF_QUICK === "1";
const sampleCount = Number.parseInt(
  process.env.BROWSER_PERF_SAMPLES ?? (isQuickRun ? "1" : "10"),
  10,
);
const warmupCount = Number.parseInt(
  process.env.BROWSER_PERF_WARMUPS ?? (isQuickRun ? "0" : "2"),
  10,
);
const idleDurationMs = Number.parseInt(
  process.env.BROWSER_PERF_IDLE_MS ?? (isQuickRun ? "0" : "30000"),
  10,
);
const shouldEnforce =
  process.env.BROWSER_PERF_ENFORCE === "1" ||
  (!isQuickRun && process.env.BROWSER_PERF_ENFORCE !== "0");
const gameInterfaces = (
  process.env.BROWSER_PERF_INTERFACES ?? (isQuickRun ? "ni" : "ni,si")
)
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value === "ni" || value === "si");
const cpuRates = (
  process.env.BROWSER_PERF_CPU_RATES ?? (isQuickRun ? "1" : "1,4")
)
  .split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isFinite(value) && value >= 1);

const SCENARIOS = [
  { name: "0→1", initialCount: 0, batchCount: 1 },
  { name: "1→2", initialCount: 1, batchCount: 1 },
  { name: "10→11", initialCount: 10, batchCount: 1 },
  { name: "49→50", initialCount: 49, batchCount: 1 },
  { name: "eviction 50→50", initialCount: 50, batchCount: 1 },
  {
    name: "merge 1→1",
    initialCount: 1,
    batchCount: 1,
    merge: true,
  },
  {
    name: "scroll 50→50",
    initialCount: 50,
    batchCount: 1,
    scroll: true,
  },
  { name: "burst 10", initialCount: 0, batchCount: 10 },
  { name: "burst 50", initialCount: 0, batchCount: 50 },
  { name: "burst 100", initialCount: 0, batchCount: 100 },
  {
    name: "auto-hide 30s",
    initialCount: 10,
    batchCount: 1,
    autoHideSeconds: 30,
  },
];

const VISUAL_THEMES = ["dark", "light"];
const VISUAL_WINDOW_IDS = [
  "app-error",
  "settings",
  "timers",
  "chat",
  "command",
  "online-players",
  "add-timer",
  "npc-detector",
  "notifications",
  "quick-access",
  "catching-whitelist-warning",
  "backend-preferences-warning",
  "party-finder",
  "create-party-gathering",
  "event-mode",
];
const VISUAL_STATE_CASES = [
  { action: "scroll", name: "notifications-scroll", notificationCount: 50 },
  { name: "notifications-opacity-1", opacity: 1 },
  { name: "notifications-opacity-5", opacity: 5 },
  { action: "locked-drag", locked: true, name: "notifications-locked" },
  { action: "drag", name: "notifications-drag" },
];
const VISUAL_EXCLUSIONS = [
  {
    reason: "No production component renders the create-notification state ID.",
    windowId: "create-notification",
  },
  {
    reason:
      "The production showConflict path is disabled, so the timer settings conflict window is unreachable.",
    windowId: "timer-settings-conflict",
  },
];

const percentile = (values, percentileValue) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
};

const round = (value, digits = 3) => Number(value.toFixed(digits));

const createIndexes = (length) =>
  Array.from({ length: Math.max(0, length) }, (_value, index) => index);

const runSequentially = (items, task) =>
  items.reduce(
    (pendingResults, item, index) =>
      pendingResults.then(async (results) => {
        results.push(await task(item, index));
        return results;
      }),
    Promise.resolve([]),
  );

const summarizeMeasurements = (measurements) => ({
  samples: measurements.length,
  receiveToStoreMedianMs: round(
    percentile(
      measurements.map((measurement) => measurement.receiveToStoreMs),
      50,
    ),
  ),
  receiveToStoreP95Ms: round(
    percentile(
      measurements.map((measurement) => measurement.receiveToStoreMs),
      95,
    ),
  ),
  receiveToCommitMedianMs: round(
    percentile(
      measurements.map((measurement) => measurement.receiveToCommitMs),
      50,
    ),
  ),
  receiveToCommitP95Ms: round(
    percentile(
      measurements.map((measurement) => measurement.receiveToCommitMs),
      95,
    ),
  ),
  receiveToDoubleAnimationFrameMedianMs: round(
    percentile(
      measurements.map(
        (measurement) => measurement.receiveToDoubleAnimationFrameMs,
      ),
      50,
    ),
  ),
  receiveToDoubleAnimationFrameP95Ms: round(
    percentile(
      measurements.map(
        (measurement) => measurement.receiveToDoubleAnimationFrameMs,
      ),
      95,
    ),
  ),
  receiveToPaintMedianMs: round(
    percentile(
      measurements.map((measurement) => measurement.receiveToPaintMs),
      50,
    ),
  ),
  receiveToPaintP95Ms: round(
    percentile(
      measurements.map((measurement) => measurement.receiveToPaintMs),
      95,
    ),
  ),
  maxAudioInstances: Math.max(
    ...measurements.map((measurement) => measurement.audioInstancesDelta),
  ),
  maxAudioPlays: Math.max(
    ...measurements.map((measurement) => measurement.audioPlaysDelta),
  ),
  maxDomNotifications: Math.max(
    ...measurements.map((measurement) => measurement.domNotificationCount),
  ),
  maxSettledDomNotifications: Math.max(
    ...measurements.map(
      (measurement) => measurement.settledDomNotificationCount,
    ),
  ),
  maxDomNodes: Math.max(
    ...measurements.map((measurement) => measurement.domNodeCount),
  ),
  maxSettledDomNodes: Math.max(
    ...measurements.map((measurement) => measurement.settledDomNodeCount),
  ),
  maxLongAnimationFrameMs: round(
    Math.max(
      0,
      ...measurements.flatMap((measurement) =>
        measurement.longAnimationFramesDuringMeasurement.map(
          (entry) => entry.duration,
        ),
      ),
    ),
  ),
  maxLongTaskMs: round(
    Math.max(
      0,
      ...measurements.flatMap((measurement) =>
        measurement.longTasksDuringMeasurement.map((entry) => entry.duration),
      ),
    ),
  ),
  maxMutationObserverCallbacks: Math.max(
    ...measurements.map(
      (measurement) => measurement.mutationObserverCallbacksDelta,
    ),
  ),
  maxReactCommits: Math.max(
    ...measurements.map((measurement) => measurement.reactCommits),
  ),
  maxStorageWrites: Math.max(
    ...measurements.map((measurement) => measurement.storageWritesDelta),
  ),
  maxStorePublications: Math.max(
    ...measurements.map((measurement) => measurement.storePublications),
  ),
  maxSynchronousReactCommits: Math.max(
    ...measurements.map((measurement) => measurement.synchronousReactCommits),
  ),
});

const findChromeExecutable = () => {
  const candidates = [
    process.env.BROWSER_PERF_CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const executablePath = candidates.find((candidate) => existsSync(candidate));

  if (!executablePath) {
    throw new Error(
      "Chrome/Chromium was not found. Set BROWSER_PERF_CHROME to its executable.",
    );
  }

  return executablePath;
};

const buildUserscript = (temporaryDirectory) => {
  const suppliedBundle = process.env.BROWSER_PERF_BUNDLE;
  let userscriptPath;

  if (suppliedBundle) {
    userscriptPath = resolve(suppliedBundle);
  } else {
    const outputDirectory = join(temporaryDirectory, "dist");
    const viteExecutable = resolve(
      appDirectory,
      "node_modules/vite/bin/vite.js",
    );
    const build = spawnSync(
      process.execPath,
      [viteExecutable, "build", "--outDir", outputDirectory],
      {
        cwd: appDirectory,
        encoding: "utf8",
        env: {
          ...process.env,
          VITE_API_URL: "https://fixture.local/api/lootlog",
          VITE_AUTH_SERVICE_URL: "https://fixture.local/api/auth",
          VITE_BATTLELOG_API_URL: "https://fixture.local/api/battlelog",
          VITE_GAME_CLIENT_VERSION: "browser-perf-fixture",
          VITE_GATEWAY_SOCKET_PATH: "/gateway",
          VITE_GATEWAY_URL: "https://fixture.local",
          VITE_LOOTLOG_APP_URL: "https://fixture.local",
          VITE_PERF_FIXTURE: "1",
        },
      },
    );

    if (build.status !== 0) {
      throw new Error(
        `Fixture userscript build failed.\n${build.stdout}\n${build.stderr}`,
      );
    }

    userscriptPath = join(outputDirectory, "@lootlog/game-client.user.js");
  }

  if (!existsSync(userscriptPath)) {
    throw new Error(`Built userscript not found at ${userscriptPath}`);
  }

  const localEntrypointPath = join(
    temporaryDirectory,
    "game-client-local.user.js",
  );
  const entrypointGeneratorPath = resolve(
    appDirectory,
    "src/scripts/generate-local-entrypoint.mjs",
  );
  const generateEntrypoint = spawnSync(
    process.execPath,
    [
      entrypointGeneratorPath,
      "--output",
      localEntrypointPath,
      "--bundle-url",
      "http://127.0.0.1:4173/@lootlog/game-client.user.js",
    ],
    { cwd: appDirectory, encoding: "utf8" },
  );

  if (generateEntrypoint.status !== 0) {
    throw new Error(
      `Fixture local entrypoint generation failed.\n${generateEntrypoint.stdout}\n${generateEntrypoint.stderr}`,
    );
  }

  return { localEntrypointPath, userscriptPath };
};

const createFixturePage = async ({
  browser,
  cpuRate,
  gameInterface,
  localEntrypointPath,
  userscriptPath,
}) => {
  const context = await browser.newContext({
    viewport: { height: 900, width: 1280 },
  });
  const page = await context.newPage();
  const browserErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await page.addInitScript(installBrowserEnvironment, { gameInterface });
  const devtoolsSession = await context.newCDPSession(page);
  await devtoolsSession.send("Emulation.setCPUThrottlingRate", {
    rate: cpuRate,
  });
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fulfill({
        body: "<!doctype html><html><head></head><body></body></html>",
        contentType: "text/html",
        status: 200,
      });
      return;
    }

    if (route.request().resourceType() === "image") {
      await route.fulfill({
        body: [
          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">',
          '<rect width="32" height="32" rx="4" fill="#374151"/>',
          '<circle cx="16" cy="12" r="6" fill="#9ca3af"/>',
          '<path d="M6 29c1-7 5-10 10-10s9 3 10 10" fill="#6b7280"/>',
          "</svg>",
        ].join(""),
        contentType: "image/svg+xml",
        status: 200,
      });
      return;
    }

    await route.fulfill({ body: "", status: 204 });
  });
  await page.goto(`https://fixture-${gameInterface}.margonem.pl/`);
  const [localEntrypoint, userscript] = await Promise.all([
    readFile(localEntrypointPath, "utf8"),
    readFile(userscriptPath, "utf8"),
  ]);
  const frameTree = await devtoolsSession.send("Page.getFrameTree");
  const { executionContextId } = await devtoolsSession.send(
    "Page.createIsolatedWorld",
    {
      frameId: frameTree.frameTree.frame.id,
      grantUniveralAccess: true,
      worldName: "lootlog-local-loader-fixture",
    },
  );
  const localLoaderEvaluation = await devtoolsSession.send("Runtime.evaluate", {
    awaitPromise: true,
    contextId: executionContextId,
    expression: `globalThis.GM_xmlhttpRequest = ({ onload }) => onload({ responseText: ${JSON.stringify(userscript)}, status: 200 });\n${localEntrypoint}`,
  });
  if (localLoaderEvaluation.exceptionDetails) {
    throw new Error(
      `Fixture local loader failed: ${localLoaderEvaluation.exceptionDetails.text}`,
    );
  }
  try {
    await page.waitForFunction(
      () =>
        window.__lootlogBrowserPerf !== undefined &&
        document.getElementById("lootlog-root") !== null,
      undefined,
      { timeout: 15_000 },
    );
    await page.evaluate((activeGameInterface) => {
      if (activeGameInterface === "ni") {
        window.Engine.communication.successData({});
        return;
      }

      window.successData({});
    }, gameInterface);
    await page.waitForFunction(
      () => window.lootlogGameClientApi?.ready === true,
      undefined,
      { timeout: 15_000 },
    );
    await page.waitForFunction(
      () => {
        const socketState = window.lootlogGameClientApi?.getSocketState();
        return socketState?.connected === true && socketState.joined === true;
      },
      undefined,
      { timeout: 15_000 },
    );
  } catch (error) {
    const state = await page.evaluate(() => ({
      bridgeReady: window.__lootlogBrowserPerf !== undefined,
      fetchUrls: window.__lootlogPerfInstrumentation?.fetchUrls ?? [],
      gameReady: window.lootlogGameClientApi?.ready ?? false,
      hasRoot: document.getElementById("lootlog-root") !== null,
      runtimeState: window.__lootlogGameClientRuntime?.state,
    }));
    throw new Error(
      `Fixture bootstrap timed out. state=${JSON.stringify(state)} pageErrors=${JSON.stringify(browserErrors)} consoleErrors=${JSON.stringify(consoleErrors)} cause=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await page.evaluate(() =>
    window.__lootlogBrowserPerf.waitForAnimationFrames(4),
  );

  if (browserErrors.length > 0 || consoleErrors.length > 0) {
    throw new Error(
      `Fixture reported bootstrap errors. pageErrors=${JSON.stringify(browserErrors)} consoleErrors=${JSON.stringify(consoleErrors)}`,
    );
  }

  return {
    browserErrors,
    consoleErrors,
    context,
    devtoolsSession,
    page,
  };
};

const configure = (page, configuration) =>
  page.evaluate(
    (nextConfiguration) =>
      window.__lootlogBrowserPerf.configure(nextConfiguration),
    configuration,
  );

const checkWindowAnimation = async (page) => {
  const hostileAnimationOverride = await page.addStyleTag({
    content:
      ":not(.captcha img) { animation: none !important; transition-property: none !important; }",
  });

  try {
    return await page.evaluate(() =>
      window.__lootlogBrowserPerf.checkWindowAnimation(),
    );
  } finally {
    await hostileAnimationOverride.evaluate((styleElement) =>
      styleElement.remove(),
    );
  }
};

const reset = (page) =>
  page.evaluate(() => window.__lootlogBrowserPerf.reset());

const present = async (page, presentation) => {
  try {
    const measurement = await page.evaluate(
      (nextPresentation) =>
        window.__lootlogBrowserPerf.present({
          ...nextPresentation,
          via: "socket",
        }),
      presentation,
    );
    const settledSnapshot = await page.evaluate(() =>
      window.__lootlogBrowserPerf.waitForNotificationsToSettle(),
    );

    return {
      ...measurement,
      settledAutoHideDeadlineCount: settledSnapshot.autoHideDeadlineCount,
      settledDomNodeCount: settledSnapshot.domNodeCount,
      settledDomNotificationCount: settledSnapshot.domNotificationCount,
      settledDomNotificationIds: settledSnapshot.domNotificationIds,
      settledNotificationIds: settledSnapshot.notificationIds,
      settledStoreNotificationCount: settledSnapshot.storeNotificationCount,
    };
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      notifications: window.__lootlogBrowserPerf.snapshot().notificationIds,
      socketServerEvents:
        window.__lootlogPerfInstrumentation?.socketServerEvents ?? [],
      socketState: window.lootlogGameClientApi?.getSocketState(),
    }));
    throw new Error(
      `Socket notification ingress failed. diagnostics=${JSON.stringify(diagnostics)} cause=${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const runScenarioSample = async (page, scenario, sampleIndex) => {
  await reset(page);
  await configure(page, {
    animationEffectsEnabled: false,
    autoHideSeconds: scenario.autoHideSeconds ?? 0,
    soundEnabled: false,
  });

  const prefix = `scenario-${scenario.name}-${sampleIndex}`;
  if (scenario.initialCount > 0) {
    await present(page, {
      count: scenario.initialCount,
      idPrefix: scenario.merge ? "merge-target" : `${prefix}-initial`,
      playSound: false,
    });
  }

  const scrollTopBeforeIngress = scenario.scroll
    ? await page.evaluate(() => window.__lootlogBrowserPerf.scrollToBottom())
    : 0;

  await configure(page, {
    animationEffectsEnabled: true,
    autoHideSeconds: scenario.autoHideSeconds ?? 0,
    soundEnabled: false,
  });

  const measurement = await present(page, {
    count: scenario.batchCount,
    guildId: scenario.merge ? "guild-2" : "guild-1",
    idPrefix: `${prefix}-measured`,
    mergeNotificationId: scenario.merge ? "merge-target-0" : undefined,
    playSound: false,
  });
  return { ...measurement, scrollTopBeforeIngress };
};

const runScenario = async (page, scenario) => {
  await runSequentially(createIndexes(warmupCount), (warmup) =>
    runScenarioSample(page, scenario, `warmup-${warmup}`),
  );
  const measurements = await runSequentially(
    createIndexes(sampleCount),
    (sample) => runScenarioSample(page, scenario, sample),
  );

  return {
    expectedFinalCount: scenario.merge
      ? 1
      : Math.min(50, scenario.initialCount + scenario.batchCount),
    initialCount: scenario.initialCount,
    measurements,
    name: scenario.name,
    summary: summarizeMeasurements(measurements),
  };
};

const runSoundScenarios = async (page) => {
  await reset(page);
  await configure(page, {
    animationEffectsEnabled: true,
    autoHideSeconds: 0,
    soundEnabled: false,
  });
  const soundOff = await present(page, {
    count: 10,
    idPrefix: "sound-off",
    playSound: true,
  });

  await reset(page);
  await configure(page, {
    animationEffectsEnabled: true,
    autoHideSeconds: 0,
    soundEnabled: true,
  });
  const cold = await present(page, {
    count: 10,
    idPrefix: "sound-cold",
    playSound: true,
  });

  const warmMeasurements = await runSequentially(
    createIndexes(sampleCount),
    async (sample) => {
      await reset(page);
      return present(page, {
        count: 50,
        idPrefix: `sound-warm-${sample}`,
        playSound: true,
      });
    },
  );

  await reset(page);
  await page.evaluate(() => {
    window.__lootlogPerfInstrumentation.rejectAudioPlays = true;
  });
  let rejected;
  try {
    rejected = await present(page, {
      count: 10,
      idPrefix: "sound-rejected",
      playSound: true,
    });
  } finally {
    await page.evaluate(() => {
      window.__lootlogPerfInstrumentation.rejectAudioPlays = false;
    });
  }

  return {
    cold,
    rejected,
    soundOff,
    warm: {
      measurements: warmMeasurements,
      summary: summarizeMeasurements(warmMeasurements),
    },
  };
};

const measureAnimationFrames = (page, frameCount) =>
  page.evaluate(async (requestedFrameCount) => {
    const frameTimes = [];
    let previousTime = await new Promise((resolve) =>
      requestAnimationFrame(resolve),
    );
    await Array.from({ length: requestedFrameCount }).reduce(
      (pendingFrame) =>
        pendingFrame.then(async () => {
          const currentTime = await new Promise((resolve) =>
            requestAnimationFrame(resolve),
          );
          frameTimes.push(currentTime - previousTime);
          previousTime = currentTime;
        }),
      Promise.resolve(),
    );

    return frameTimes;
  }, frameCount);

const measureInputToPaint = (page, samples) =>
  page.evaluate(async (sampleTotal) => {
    const measurements = [];
    await Array.from({ length: sampleTotal }).reduce(
      (pendingSample, _value, sample) =>
        pendingSample.then(async () => {
          const startTime = performance.now();
          document.body.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              clientX: 600,
              clientY: 400,
              pointerId: sample + 1,
            }),
          );
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await new Promise((resolve) => requestAnimationFrame(resolve));
          measurements.push(performance.now() - startTime);
        }),
      Promise.resolve(),
    );
    return measurements;
  }, samples);

const summarizeFrames = (frameTimes) => ({
  droppedFramePercentage: round(
    (frameTimes.filter((frameTime) => frameTime > 25).length /
      frameTimes.length) *
      100,
  ),
  medianFrameTimeMs: round(percentile(frameTimes, 50)),
  p95FrameTimeMs: round(percentile(frameTimes, 95)),
});

const readProtocolStream = async (devtoolsSession, handle, contents = "") => {
  const chunk = await devtoolsSession.send("IO.read", { handle });
  const nextContents = contents + chunk.data;
  if (!chunk.eof) {
    return readProtocolStream(devtoolsSession, handle, nextContents);
  }

  await devtoolsSession.send("IO.close", { handle });
  return nextContents;
};

const captureTrace = async (devtoolsSession, action) => {
  const tracingCompleted = new Promise((resolve) => {
    devtoolsSession.once("Tracing.tracingComplete", resolve);
  });
  await devtoolsSession.send("Tracing.start", {
    categories:
      "devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame",
    transferMode: "ReturnAsStream",
  });
  let actionError;
  try {
    await action();
  } catch (error) {
    actionError = error;
  }
  await devtoolsSession.send("Tracing.end");
  const completedEvent = await tracingCompleted;
  if (actionError) {
    throw actionError instanceof Error
      ? actionError
      : new Error(String(actionError));
  }
  const serializedTrace = await readProtocolStream(
    devtoolsSession,
    completedEvent.stream,
  );
  return JSON.parse(serializedTrace);
};

const summarizeTrace = (trace) => {
  const completeEvents = trace.traceEvents.filter(
    (event) => event.ph === "X" && typeof event.dur === "number",
  );
  const summarizeNames = (names) => {
    const events = completeEvents.filter((event) => names.has(event.name));
    return {
      count: events.length,
      durationMs: round(
        events.reduce((duration, event) => duration + event.dur, 0) / 1_000,
      ),
    };
  };

  return {
    layout: summarizeNames(new Set(["Layout"])),
    paint: summarizeNames(new Set(["Paint", "PrePaint"])),
    style: summarizeNames(new Set(["RecalculateStyles", "UpdateLayoutTree"])),
  };
};

const measureOverlayCost = async (page, devtoolsSession, traceFilePrefix) => {
  const frameCount = isQuickRun ? 10 : 120;
  const inputSamples = isQuickRun ? 1 : 10;
  await reset(page);
  await configure(page, {
    animationEffectsEnabled: false,
    autoHideSeconds: 0,
    soundEnabled: false,
  });
  const offFrames = await measureAnimationFrames(page, frameCount);
  const offInput = await measureInputToPaint(page, inputSamples);

  await present(page, {
    count: 50,
    idPrefix: "overlay-on",
    playSound: false,
  });
  const onFrames = await measureAnimationFrames(page, frameCount);
  const onInput = await measureInputToPaint(page, inputSamples);
  const off = summarizeFrames(offFrames);
  const on = summarizeFrames(onFrames);
  await reset(page);
  const offTrace = await captureTrace(devtoolsSession, () =>
    measureAnimationFrames(page, isQuickRun ? 3 : 30),
  );
  const onTrace = await captureTrace(devtoolsSession, () =>
    present(page, {
      count: 50,
      idPrefix: "overlay-trace-on",
      playSound: false,
    }),
  );
  const offTraceFile = `${traceFilePrefix}-overlay-off.json`;
  const onTraceFile = `${traceFilePrefix}-overlay-on.json`;
  const screenshotFile = `${traceFilePrefix}-notifications.png`;
  await writeFile(
    join(artifactsDirectory, offTraceFile),
    `${JSON.stringify(offTrace)}\n`,
  );
  await writeFile(
    join(artifactsDirectory, onTraceFile),
    `${JSON.stringify(onTrace)}\n`,
  );
  await page.screenshot({
    path: join(artifactsDirectory, screenshotFile),
  });

  return {
    off: {
      ...off,
      inputToPaintP95Ms: round(percentile(offInput, 95)),
    },
    on: {
      ...on,
      inputToPaintP95Ms: round(percentile(onInput, 95)),
    },
    delta: {
      droppedFramePercentagePoints: round(
        on.droppedFramePercentage - off.droppedFramePercentage,
      ),
      inputToPaintP95Ms: round(
        percentile(onInput, 95) - percentile(offInput, 95),
      ),
      p95FrameTimeMs: round(on.p95FrameTimeMs - off.p95FrameTimeMs),
    },
    trace: {
      off: { file: offTraceFile, ...summarizeTrace(offTrace) },
      on: { file: onTraceFile, ...summarizeTrace(onTrace) },
      screenshotFile,
    },
  };
};

const measureIdle = async (page) => {
  await reset(page);
  await configure(page, {
    animationEffectsEnabled: false,
    autoHideSeconds: 0,
    soundEnabled: false,
  });
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    await window.__lootlogBrowserPerf.waitForNotificationsToSettle();
    await window.__lootlogBrowserPerf.waitForAnimationFrames(4);
  });
  const before = await page.evaluate(() =>
    window.__lootlogBrowserPerf.snapshot(),
  );
  await page.waitForTimeout(idleDurationMs);
  const after = await page.evaluate(() =>
    window.__lootlogBrowserPerf.snapshot(),
  );

  return {
    durationMs: idleDurationMs,
    bodyObserverCallbacks:
      after.bodyObserverCallbacks - before.bodyObserverCallbacks,
    mutationObserverCallbacks:
      after.mutationObserverCallbacks - before.mutationObserverCallbacks,
    reactCommits: after.reactCommits - before.reactCommits,
    storageWrites: after.storageWrites - before.storageWrites,
  };
};

const getVisualCaseConfigurations = (gameInterface) =>
  VISUAL_THEMES.flatMap((theme) => [
    ...VISUAL_WINDOW_IDS.map((windowId) => ({
      action: "none",
      gameInterface,
      locked: false,
      name: windowId,
      notificationCount: windowId === "notifications" ? 4 : undefined,
      opacity: 4,
      theme,
      windowId,
    })),
    ...VISUAL_STATE_CASES.map((visualStateCase) => ({
      action: visualStateCase.action ?? "none",
      gameInterface,
      locked: visualStateCase.locked ?? false,
      name: visualStateCase.name,
      notificationCount: visualStateCase.notificationCount ?? 4,
      opacity: visualStateCase.opacity ?? 4,
      theme,
      windowId: "notifications",
    })),
  ]);

const moveVisualWindow = async ({ action, locator, page }) => {
  if (action !== "drag" && action !== "locked-drag") {
    return { deltaX: 0, deltaY: 0, pass: true };
  }

  const before = await locator.boundingBox();
  if (!before) {
    return {
      deltaX: 0,
      deltaY: 0,
      pass: false,
      reason: "Window has no bounding box before drag",
    };
  }

  await page.mouse.move(before.x + before.width / 2, before.y + 14);
  await page.mouse.down();
  try {
    await page.mouse.move(before.x + before.width / 2 + 128, before.y + 94, {
      steps: 8,
    });
    await page.evaluate(() =>
      window.__lootlogBrowserPerf.waitForAnimationFrames(2),
    );
  } finally {
    await page.mouse.up();
  }

  const after = await locator.boundingBox();
  if (!after) {
    return {
      deltaX: 0,
      deltaY: 0,
      pass: false,
      reason: "Window has no bounding box after drag",
    };
  }

  const deltaX = round(after.x - before.x);
  const deltaY = round(after.y - before.y);
  const distance = Math.hypot(deltaX, deltaY);
  const shouldMove = action === "drag";
  const pass = shouldMove ? distance >= 80 : distance <= 1;

  return {
    deltaX,
    deltaY,
    pass,
    reason: pass
      ? undefined
      : shouldMove
        ? "Unlocked pointer drag did not move the window"
        : "Locked pointer drag moved the window",
  };
};

const inspectTimerVisualRegression = async ({ locator, page }) => {
  const timerTile = locator.locator('[id="9101"]');
  await timerTile.waitFor({ state: "visible", timeout: 5_000 });

  const readCountdown = () =>
    timerTile
      .locator("div")
      .last()
      .textContent()
      .then((value) => value?.trim());
  const countdownBefore = await readCountdown();
  await page.waitForTimeout(1_100);
  const countdownAfter = await readCountdown();

  const selectedGuildButton = locator
    .locator('button[aria-pressed="true"]')
    .first();
  const tileStyles = await timerTile.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      borderRadius: styles.borderRadius,
    };
  });
  const guildStyles = await selectedGuildButton.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      borderRadius: styles.borderRadius,
      boxShadow: styles.boxShadow,
    };
  });

  await timerTile.click({ button: "right" });
  const contextMenu = page.locator('[role="menu"]').last();
  await contextMenu.waitFor({ state: "visible", timeout: 5_000 });
  const contextMenuStyles = await contextMenu.evaluate((element) => {
    const styles = getComputedStyle(element);
    const customSwatch = Array.from(element.querySelectorAll("div")).find(
      (candidate) => {
        const candidateStyles = getComputedStyle(candidate);
        return candidateStyles.backgroundColor === "rgb(18, 52, 86)";
      },
    );

    return {
      borderRadius: styles.borderRadius,
      customSwatchBorderRadius: customSwatch
        ? getComputedStyle(customSwatch).borderRadius
        : "",
      insideLootlogRoot: element.closest("#lootlog-root") !== null,
    };
  });
  await page.keyboard.press("Escape");

  await page.mouse.move(1, 1);
  await timerTile.hover();
  const tooltip = page.locator('[data-slot="tooltip-content"]').last();
  await tooltip.waitFor({ state: "visible", timeout: 5_000 });
  const tooltipStyles = await tooltip.evaluate((element) => ({
    borderRadius: getComputedStyle(element).borderRadius,
    insideLootlogRoot: element.closest("#lootlog-root") !== null,
  }));
  await page.mouse.move(1, 1);

  const hasRadius = (value) => Number.parseFloat(value) > 0;
  const pass =
    Boolean(countdownBefore) &&
    Boolean(countdownAfter) &&
    countdownBefore !== countdownAfter &&
    hasRadius(tileStyles.borderRadius) &&
    tileStyles.backgroundColor === "rgb(18, 52, 86)" &&
    hasRadius(guildStyles.borderRadius) &&
    guildStyles.boxShadow !== "none" &&
    contextMenuStyles.insideLootlogRoot &&
    hasRadius(contextMenuStyles.borderRadius) &&
    hasRadius(contextMenuStyles.customSwatchBorderRadius) &&
    tooltipStyles.insideLootlogRoot &&
    hasRadius(tooltipStyles.borderRadius);

  return {
    contextMenuStyles,
    countdownAfter,
    countdownBefore,
    guildStyles,
    pass,
    tileStyles,
    tooltipStyles,
  };
};

const getChatScrollState = (locator) =>
  locator.evaluate((windowElement) => {
    const messageList = windowElement.querySelector('[role="list"]');
    const viewport = messageList?.closest("[data-ll-scroll-area-viewport]");

    if (!(viewport instanceof HTMLElement)) {
      return null;
    }

    return {
      clientHeight: viewport.clientHeight,
      distanceFromBottom:
        viewport.scrollHeight - (viewport.scrollTop + viewport.clientHeight),
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    };
  });

const inspectChatScrollRegression = async ({ locator, page }) => {
  const guildButtons = locator.locator("button[aria-pressed]");
  await guildButtons.nth(2).waitFor({ state: "visible", timeout: 5_000 });
  await guildButtons.nth(2).click();
  await page.waitForFunction(() => {
    const chatWindow = document.querySelector(
      '[data-ll-draggable-window="chat"]',
    );
    const selectedGuildButtons = chatWindow?.querySelectorAll(
      'button[aria-pressed="true"]',
    );
    const renderedMessage = chatWindow?.querySelector('[role="listitem"]');

    const renderedSetSize = Number.parseInt(
      renderedMessage?.getAttribute("aria-setsize") ?? "0",
      10,
    );

    return selectedGuildButtons?.length === 1 && renderedSetSize >= 160;
  });
  await page.evaluate(() =>
    window.__lootlogBrowserPerf.waitForAnimationFrames(20),
  );

  const afterGuildSwitch = await getChatScrollState(locator);
  if (!afterGuildSwitch) {
    return {
      pass: false,
      reason: "Chat message viewport was not found after guild switch",
    };
  }

  await locator.evaluate((windowElement) => {
    const messageList = windowElement.querySelector('[role="list"]');
    const viewport = messageList?.closest("[data-ll-scroll-area-viewport]");
    if (!(viewport instanceof HTMLElement)) return;

    const instrumentedViewport = viewport;
    instrumentedViewport.__lootlogOriginalScrollTo ??=
      viewport.scrollTo.bind(viewport);
    window.__lootlogChatScrollTrace = {
      behaviors: [],
      framePositions: [],
      positions: [],
    };
    viewport.scrollTo = (options) => {
      if (typeof options !== "number") {
        window.__lootlogChatScrollTrace?.behaviors.push(
          options.behavior ?? "auto",
        );
      }
      instrumentedViewport.__lootlogOriginalScrollTo(options);
    };
    viewport.addEventListener("scroll", () => {
      window.__lootlogChatScrollTrace?.positions.push(viewport.scrollTop);
    });
  });

  await page.evaluate(async () => {
    const viewport = document
      .querySelector('[data-ll-draggable-window="chat"] [role="list"]')
      ?.closest("[data-ll-scroll-area-viewport]");
    const sampleFrames = (frameCount) =>
      new Promise((resolve) => {
        let sampledFrames = 0;
        const sampleNextFrame = () => {
          if (viewport instanceof HTMLElement) {
            window.__lootlogChatScrollTrace?.framePositions.push(
              viewport.scrollTop,
            );
          }
          sampledFrames += 1;
          if (sampledFrames >= frameCount) {
            resolve();
            return;
          }
          requestAnimationFrame(sampleNextFrame);
        };
        requestAnimationFrame(sampleNextFrame);
      });
    const frameSampling = sampleFrames(48);
    await window.__lootlogBrowserPerf.appendVisualChatMessage("guild-2", {
      messageLength: "short",
      waitForFrames: 1,
    });
    await window.__lootlogBrowserPerf.appendVisualChatMessage("guild-2", {
      messageLength: "long",
      waitForFrames: 1,
    });
    await window.__lootlogBrowserPerf.appendVisualChatMessage("guild-2", {
      messageLength: "short",
      waitForFrames: 1,
    });
    await frameSampling;
  });
  const afterConsecutiveMessages = await getChatScrollState(locator);
  const chatScrollTrace = await page.evaluate(
    () => window.__lootlogChatScrollTrace,
  );

  const intendedScrollTop = Math.max(
    (afterConsecutiveMessages?.scrollTop ?? afterGuildSwitch.scrollTop) - 120,
    0,
  );
  await locator.evaluate((windowElement, nextScrollTop) => {
    const messageList = windowElement.querySelector('[role="list"]');
    const viewport = messageList?.closest("[data-ll-scroll-area-viewport]");
    if (!(viewport instanceof HTMLElement)) return;

    viewport.dispatchEvent(
      new WheelEvent("wheel", { bubbles: true, deltaY: -120 }),
    );
    viewport.scrollTop = nextScrollTop;
    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
  }, intendedScrollTop);
  await page.evaluate(() =>
    window.__lootlogBrowserPerf.waitForAnimationFrames(8),
  );
  const afterSmallUpwardScroll = await getChatScrollState(locator);
  await page.evaluate(async () => {
    const viewport = document
      .querySelector('[data-ll-draggable-window="chat"] [role="list"]')
      ?.closest("[data-ll-scroll-area-viewport]");
    if (!(viewport instanceof HTMLElement)) return;

    const anchorRow = Array.from(
      viewport.querySelectorAll('[role="listitem"]'),
    ).reduce((closestRow, row) => {
      if (!(row instanceof HTMLElement)) return closestRow;
      if (!(closestRow instanceof HTMLElement)) return row;
      const viewportTop = viewport.getBoundingClientRect().top;
      return Math.abs(row.getBoundingClientRect().top - viewportTop) <
        Math.abs(closestRow.getBoundingClientRect().top - viewportTop)
        ? row
        : closestRow;
    }, null);
    const anchorKey =
      anchorRow instanceof HTMLElement ? anchorRow.dataset.chatRowKey : null;
    const getAnchorOffset = () => {
      if (!anchorKey) return null;
      const currentAnchorRow = viewport.querySelector(
        `[data-chat-row-key="${CSS.escape(anchorKey)}"]`,
      );
      return currentAnchorRow instanceof HTMLElement
        ? currentAnchorRow.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top
        : null;
    };

    window.__lootlogChatScrollTrace = {
      anchorKey,
      anchorOffsets: [getAnchorOffset()],
      behaviors: [],
      framePositions: [],
      positions: [],
    };
    const sampleFrames = (frameCount) =>
      new Promise((resolve) => {
        let sampledFrames = 0;
        const sampleNextFrame = () => {
          window.__lootlogChatScrollTrace?.anchorOffsets.push(
            getAnchorOffset(),
          );
          window.__lootlogChatScrollTrace?.framePositions.push(
            viewport.scrollTop,
          );
          sampledFrames += 1;
          if (sampledFrames >= frameCount) {
            resolve();
            return;
          }
          requestAnimationFrame(sampleNextFrame);
        };
        requestAnimationFrame(sampleNextFrame);
      });
    const frameSampling = sampleFrames(40);
    await window.__lootlogBrowserPerf.appendVisualChatMessage("guild-2", {
      messageLength: "long",
      waitForFrames: 1,
    });
    await window.__lootlogBrowserPerf.appendVisualChatMessage("guild-2", {
      messageLength: "short",
      waitForFrames: 1,
    });
    await window.__lootlogBrowserPerf.appendVisualChatMessage("guild-2", {
      messageLength: "long",
      waitForFrames: 1,
    });
    await frameSampling;
  });
  const afterMessageWhileReadingHistory = await getChatScrollState(locator);
  const historyScrollTrace = await page.evaluate(
    () => window.__lootlogChatScrollTrace,
  );

  await locator.evaluate((windowElement) => {
    const messageList = windowElement.querySelector('[role="list"]');
    const viewport = messageList?.closest("[data-ll-scroll-area-viewport]");
    if (!(viewport instanceof HTMLElement)) return;
    window.__lootlogChatScrollTrace = {
      behaviors: [],
      framePositions: [],
      positions: [],
    };
  });
  const chatInput = locator.locator('[data-slot="chat-input"]');
  await chatInput.fill("Fixture own message from history");
  await chatInput.press("Enter");
  await page.evaluate(() =>
    window.__lootlogBrowserPerf.waitForAnimationFrames(64),
  );
  const afterOwnMessage = await getChatScrollState(locator);
  const ownMessageScrollTrace = await page.evaluate(
    () => window.__lootlogChatScrollTrace,
  );

  const remountBottomStates = [];
  const captureRemountBottomState = async (guildButtonIndex) => {
    await guildButtons.nth(guildButtonIndex).click();
    await page.evaluate(() =>
      window.__lootlogBrowserPerf.waitForAnimationFrames(20),
    );
    remountBottomStates.push(await getChatScrollState(locator));
  };
  await captureRemountBottomState(1);
  await captureRemountBottomState(2);
  await captureRemountBottomState(1);
  await captureRemountBottomState(2);

  const guildSwitchAtBottom =
    Math.abs(afterGuildSwitch.distanceFromBottom) <= 1;
  const consecutiveMessagesAtBottom =
    afterConsecutiveMessages !== null &&
    Math.abs(afterConsecutiveMessages.distanceFromBottom) <= 1;
  const smoothScrollRequests =
    chatScrollTrace?.behaviors.filter((behavior) => behavior === "smooth")
      .length ?? 0;
  const onlySmoothScrollRequests =
    (chatScrollTrace?.behaviors.length ?? 0) > 0 &&
    chatScrollTrace.behaviors.every((behavior) => behavior === "smooth");
  const monotonicAnimation =
    chatScrollTrace?.framePositions.every(
      (position, index, positions) =>
        index === 0 || position + 0.5 >= positions[index - 1],
    ) ?? false;
  const smallUpwardScrollPreserved =
    afterSmallUpwardScroll !== null &&
    afterSmallUpwardScroll.distanceFromBottom >= 16;
  const initialHistoryAnchorOffset = historyScrollTrace?.anchorOffsets[0];
  const historyPositionFrozenEveryFrame =
    typeof initialHistoryAnchorOffset === "number" &&
    (historyScrollTrace?.behaviors.length ?? 0) === 0 &&
    (historyScrollTrace?.anchorOffsets.every(
      (offset) =>
        typeof offset === "number" &&
        Math.abs(offset - initialHistoryAnchorOffset) <= 1,
    ) ??
      false);
  const ownMessageReachedBottom =
    afterOwnMessage !== null &&
    Math.abs(afterOwnMessage.distanceFromBottom) <= 1 &&
    (ownMessageScrollTrace?.behaviors.includes("smooth") ?? false) &&
    (ownMessageScrollTrace?.behaviors.every(
      (behavior) => behavior === "smooth",
    ) ??
      false);
  const everyRemountReachedBottom = remountBottomStates.every(
    (state) => state !== null && Math.abs(state.distanceFromBottom) <= 1,
  );

  return {
    afterConsecutiveMessages,
    afterGuildSwitch,
    afterMessageWhileReadingHistory,
    afterOwnMessage,
    afterSmallUpwardScroll,
    chatScrollTrace,
    historyScrollTrace,
    intendedScrollTop,
    ownMessageScrollTrace,
    remountBottomStates,
    pass:
      guildSwitchAtBottom &&
      consecutiveMessagesAtBottom &&
      smoothScrollRequests >= 1 &&
      onlySmoothScrollRequests &&
      monotonicAnimation &&
      smallUpwardScrollPreserved &&
      historyPositionFrozenEveryFrame &&
      ownMessageReachedBottom &&
      everyRemountReachedBottom,
  };
};

const captureVisualCase = async ({
  browserErrors,
  configuration,
  consoleErrors,
  page,
}) => {
  const caseId = `${configuration.gameInterface}-${configuration.theme}-${configuration.name}`;
  const relativeFile = `visual/${caseId}.png`;
  const screenshotFile = join(artifactsDirectory, relativeFile);
  const browserErrorStart = browserErrors.length;
  const consoleErrorStart = consoleErrors.length;

  try {
    const prepareResult = await page.evaluate(
      (visualConfiguration) =>
        window.__lootlogBrowserPerf.prepareVisualWindow(visualConfiguration),
      {
        locked: configuration.locked,
        notificationCount: configuration.notificationCount,
        opacity: configuration.opacity,
        theme: configuration.theme,
        windowId: configuration.windowId,
      },
    );
    const locator = page.locator(
      `[data-ll-draggable-window="${configuration.windowId}"]`,
    );

    if (!prepareResult.rendered) {
      return {
        browserErrors: browserErrors.slice(browserErrorStart),
        bytes: 0,
        caseId,
        consoleErrors: consoleErrors.slice(consoleErrorStart),
        file: relativeFile,
        interaction: { pass: false },
        pass: false,
        reason: prepareResult.blocker ?? "Window did not render",
      };
    }

    await locator.waitFor({ state: "visible", timeout: 5_000 });
    const rootClassName = await page.evaluate(
      () => document.getElementById("lootlog-root")?.className ?? "",
    );
    const expectedThemeClassName =
      configuration.theme === "dark" ? "dark-theme" : "light";
    const hasExpectedTheme = rootClassName
      .split(" ")
      .includes(expectedThemeClassName);
    let interaction = await moveVisualWindow({
      action: configuration.action,
      locator,
      page,
    });

    if (configuration.action === "scroll") {
      const scrollTop = await page.evaluate(() =>
        window.__lootlogBrowserPerf.scrollToBottom(),
      );
      const snapshot = await page.evaluate(() =>
        window.__lootlogBrowserPerf.snapshot(),
      );
      interaction = {
        pass:
          scrollTop > 0 && snapshot.scrollHeight > snapshot.scrollClientHeight,
        scrollClientHeight: snapshot.scrollClientHeight,
        scrollHeight: snapshot.scrollHeight,
        scrollTop,
      };
    } else if (configuration.name === "notifications") {
      const notificationIds = await page.evaluate(
        () => window.__lootlogBrowserPerf.snapshot().domNotificationIds,
      );
      const expectedNotificationIds = [
        "visual-message",
        "visual-mention",
        "visual-party",
        "visual-npc",
      ];
      interaction = {
        notificationIds,
        pass: expectedNotificationIds.every((notificationId) =>
          notificationIds.includes(notificationId),
        ),
      };
    } else if (configuration.name === "timers") {
      interaction = await inspectTimerVisualRegression({ locator, page });
    } else if (configuration.name === "chat") {
      interaction = await inspectChatScrollRegression({ locator, page });
    } else if (
      configuration.name === "notifications-opacity-1" ||
      configuration.name === "notifications-opacity-5"
    ) {
      const opacityState = await locator.evaluate((element) => {
        const windowBody = element.firstElementChild;
        if (!(windowBody instanceof HTMLElement)) {
          return { backgroundColor: "", className: "" };
        }

        return {
          backgroundColor: getComputedStyle(windowBody).backgroundColor,
          className: windowBody.className,
        };
      });
      const expectedClassName =
        configuration.opacity === 1 ? "ll:bg-black/0" : "ll:bg-black";
      interaction = {
        ...opacityState,
        expectedClassName,
        pass: opacityState.className.split(" ").includes(expectedClassName),
      };
    }

    const screenshot = await locator.screenshot({
      animations: "disabled",
      path: screenshotFile,
    });
    await page.waitForTimeout(0);
    const fileExists = existsSync(screenshotFile);
    const newBrowserErrors = browserErrors.slice(browserErrorStart);
    const newConsoleErrors = consoleErrors.slice(consoleErrorStart);
    const pass =
      fileExists &&
      screenshot.byteLength > 0 &&
      interaction.pass &&
      hasExpectedTheme &&
      newBrowserErrors.length === 0 &&
      newConsoleErrors.length === 0;

    return {
      browserErrors: newBrowserErrors,
      bytes: screenshot.byteLength,
      caseId,
      consoleErrors: newConsoleErrors,
      file: relativeFile,
      fileExists,
      interaction,
      pass,
      reason: pass ? undefined : interaction.reason,
      theme: {
        expectedClassName: expectedThemeClassName,
        pass: hasExpectedTheme,
        rootClassName,
      },
    };
  } catch (error) {
    return {
      browserErrors: browserErrors.slice(browserErrorStart),
      bytes: 0,
      caseId,
      consoleErrors: consoleErrors.slice(consoleErrorStart),
      file: relativeFile,
      interaction: { pass: false },
      pass: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};

const captureVisualMatrix = async ({
  browserErrors,
  consoleErrors,
  gameInterface,
  page,
}) => {
  await mkdir(join(artifactsDirectory, "visual"), { recursive: true });
  const configurations = getVisualCaseConfigurations(gameInterface);
  return runSequentially(configurations, (configuration) =>
    captureVisualCase({
      browserErrors,
      configuration,
      consoleErrors,
      page,
    }),
  );
};

const addGate = (gates, gate) => {
  gates.push({ supported: true, ...gate });
};

const evaluateGates = (profiles, idleMeasurement, visualMatrix) => {
  const gates = [];
  for (const profile of profiles) {
    const windowAnimation = profile.windowAnimation;
    const windowAnimationPassed =
      windowAnimation.preparedClassName.includes("ll-window-preparing") &&
      windowAnimation.enteringClassName.includes("ll-window-enter") &&
      windowAnimation.enterAnimationName === "ll-window-enter" &&
      Number.isFinite(windowAnimation.enterCurrentTimeBeforeMs) &&
      Number.isFinite(windowAnimation.enterCurrentTimeAfterMs) &&
      windowAnimation.enterCurrentTimeAfterMs >
        windowAnimation.enterCurrentTimeBeforeMs &&
      windowAnimation.enterOpacityBefore === 0 &&
      windowAnimation.enterOpacityAfter > windowAnimation.enterOpacityBefore &&
      windowAnimation.enterTransformAfter !==
        windowAnimation.enterTransformBefore &&
      windowAnimation.exitAnimationName === "ll-window-exit" &&
      !windowAnimation.renderedAfterExit;
    addGate(gates, {
      actual: windowAnimationPassed ? 0 : 1,
      limit: 0,
      name: `${profile.gameInterface.toUpperCase()} ${profile.cpuRate}x CPU: draggable window animation timeline`,
      pass: windowAnimationPassed,
      unit: "failures",
    });
  }
  for (const profile of profiles) {
    const profileName = `${profile.gameInterface.toUpperCase()} ${profile.cpuRate}× CPU`;
    const regularMeasurements = profile.scenarios.flatMap(
      (scenario) => scenario.measurements,
    );
    const warmScenarios = profile.scenarios.filter(
      (scenario) => scenario.name !== "0→1",
    );
    const warmPaintP95 = Math.max(
      ...warmScenarios.map((scenario) => scenario.summary.receiveToPaintP95Ms),
    );
    addGate(gates, {
      actual: warmPaintP95,
      limit: 16.7,
      name: `${profileName}: warm receive→paint p95`,
      pass: warmPaintP95 <= 16.7,
      unit: "ms",
    });
    const coldPaint = profile.scenarios[0].measurements[0].receiveToPaintMs;
    addGate(gates, {
      actual: round(coldPaint),
      limit: 33,
      name: `${profileName}: first cold notification`,
      pass: coldPaint <= 33,
      unit: "ms",
    });
    const longestTask = Math.max(
      0,
      ...regularMeasurements.flatMap((measurement) =>
        measurement.longTasksDuringMeasurement.map((entry) => entry.duration),
      ),
    );
    addGate(gates, {
      actual: round(longestTask),
      limit: 50,
      name: `${profileName}: longest task`,
      pass: longestTask <= 50,
      unit: "ms",
    });
    addGate(gates, {
      actual: Math.max(
        ...regularMeasurements.map(
          (measurement) => measurement.storePublications,
        ),
      ),
      limit: 1,
      name: `${profileName}: store publications / ingress`,
      pass: regularMeasurements.every(
        (measurement) => measurement.storePublications === 1,
      ),
      unit: "count",
    });
    addGate(gates, {
      actual: Math.max(
        ...regularMeasurements.map(
          (measurement) => measurement.synchronousReactCommits,
        ),
      ),
      limit: 1,
      name: `${profileName}: synchronous React commits / ingress`,
      pass: regularMeasurements.every(
        (measurement) => measurement.synchronousReactCommits === 1,
      ),
      unit: "count",
    });
    const invalidTimestampMeasurements = regularMeasurements.filter(
      (measurement) =>
        measurement.receiveAtMs > measurement.storeAtMs ||
        measurement.storeAtMs > measurement.commitAtMs ||
        measurement.commitAtMs >
          measurement.receiveAtMs + measurement.receiveToPaintMs ||
        measurement.receiveAtMs + measurement.receiveToPaintMs >
          measurement.doubleAnimationFrameAtMs,
    );
    addGate(gates, {
      actual: invalidTimestampMeasurements.length,
      limit: 0,
      name: `${profileName}: receive/store/commit/paint/double-rAF monotonic`,
      pass: invalidTimestampMeasurements.length === 0,
      unit: "mismatches",
    });
    const alreadyOpenMeasurements = profile.scenarios
      .filter((scenario) => scenario.initialCount > 0)
      .flatMap((scenario) => scenario.measurements);
    addGate(gates, {
      actual: Math.max(
        ...alreadyOpenMeasurements.map(
          (measurement) => measurement.storageWritesDelta,
        ),
      ),
      limit: 0,
      name: `${profileName}: storage writes when already open`,
      pass: alreadyOpenMeasurements.every(
        (measurement) => measurement.storageWritesDelta === 0,
      ),
      unit: "count",
    });
    addGate(gates, {
      actual: Math.max(
        ...regularMeasurements.flatMap((measurement) => [
          measurement.domNotificationCount,
          measurement.settledDomNotificationCount,
        ]),
      ),
      limit: 50,
      name: `${profileName}: DOM notification cap`,
      pass: regularMeasurements.every(
        (measurement) =>
          measurement.domNotificationCount <= 50 &&
          measurement.settledDomNotificationCount <= 50,
      ),
      unit: "nodes",
    });
    const invalidStagedStates = regularMeasurements.filter(
      (measurement) =>
        measurement.domNotificationIds.join("\u0000") !==
        measurement.notificationIds
          .slice(0, measurement.domNotificationCount)
          .join("\u0000"),
    );
    addGate(gates, {
      actual: invalidStagedStates.length,
      limit: 0,
      name: `${profileName}: double-rAF DOM is newest store prefix`,
      pass: invalidStagedStates.length === 0,
      unit: "mismatches",
    });
    const invalidFinalStates = profile.scenarios.flatMap((scenario) =>
      scenario.measurements.filter(
        (measurement) =>
          measurement.settledStoreNotificationCount !==
            scenario.expectedFinalCount ||
          measurement.settledDomNotificationCount !==
            scenario.expectedFinalCount ||
          measurement.settledDomNotificationIds.join("\u0000") !==
            measurement.settledNotificationIds.join("\u0000"),
      ),
    );
    addGate(gates, {
      actual: invalidFinalStates.length,
      limit: 0,
      name: `${profileName}: exact final count and DOM/store order`,
      pass: invalidFinalStates.length === 0,
      unit: "mismatches",
    });
    const invalidAutoHideStates = profile.scenarios.flatMap((scenario) => {
      const expectedDeadlineCount =
        scenario.name === "auto-hide 30s" ? scenario.expectedFinalCount : 0;
      return scenario.measurements.filter(
        (measurement) =>
          measurement.settledAutoHideDeadlineCount !== expectedDeadlineCount,
      );
    });
    addGate(gates, {
      actual: invalidAutoHideStates.length,
      limit: 0,
      name: `${profileName}: auto-hide 0/30 deadline state`,
      pass: invalidAutoHideStates.length === 0,
      unit: "mismatches",
    });
    addGate(gates, {
      actual: Math.max(
        ...regularMeasurements.map(
          (measurement) => measurement.bodyObserverCallbacksDelta,
        ),
      ),
      limit: 0,
      name: `${profileName}: body observer callbacks / ingress`,
      pass: regularMeasurements.every(
        (measurement) => measurement.bodyObserverCallbacksDelta === 0,
      ),
      unit: "count",
    });
    const mergeMeasurements = profile.scenarios.find(
      (scenario) => scenario.name === "merge 1→1",
    ).measurements;
    addGate(gates, {
      actual:
        mergeMeasurements[0].notificationServersById["merge-target-0"]
          ?.length ?? 0,
      limit: 2,
      name: `${profileName}: merge preserves both guild servers`,
      pass: mergeMeasurements.every((measurement) => {
        const servers =
          measurement.notificationServersById["merge-target-0"] ?? [];
        return (
          measurement.storeNotificationCount === 1 &&
          servers.includes("guild-1") &&
          servers.includes("guild-2")
        );
      }),
      unit: "servers",
    });
    const scrollMeasurements = profile.scenarios.find(
      (scenario) => scenario.name === "scroll 50→50",
    ).measurements;
    addGate(gates, {
      actual: Math.max(
        ...scrollMeasurements.map((measurement) => measurement.scrollTop),
      ),
      limit: 0,
      name: `${profileName}: notification scroll resets to newest`,
      pass: scrollMeasurements.every(
        (measurement) =>
          measurement.scrollTopBeforeIngress > 0 &&
          measurement.scrollTop === 0 &&
          measurement.settledDomNotificationIds.join("\u0000") ===
            measurement.settledNotificationIds.join("\u0000"),
      ),
      unit: "px",
    });
    addGate(gates, {
      actual: `${profile.sounds.soundOff.audioInstancesDelta}/${profile.sounds.soundOff.audioPlaysDelta}`,
      limit: "0/0",
      name: `${profileName}: sound disabled instances/plays`,
      pass:
        profile.sounds.soundOff.audioInstancesDelta === 0 &&
        profile.sounds.soundOff.audioPlaysDelta === 0,
      unit: "",
    });
    addGate(gates, {
      actual: `${profile.sounds.cold.audioInstancesDelta}/${profile.sounds.cold.audioPlaysDelta}`,
      limit: "1/1",
      name: `${profileName}: cold sound burst instances/plays`,
      pass:
        profile.sounds.cold.audioInstancesDelta === 1 &&
        profile.sounds.cold.audioPlaysDelta === 1,
      unit: "",
    });
    addGate(gates, {
      actual: `${profile.sounds.warm.summary.maxAudioInstances}/${profile.sounds.warm.summary.maxAudioPlays}`,
      limit: "0/1",
      name: `${profileName}: warm sound burst instances/plays`,
      pass: profile.sounds.warm.measurements.every(
        (measurement) =>
          measurement.audioInstancesDelta === 0 &&
          measurement.audioPlaysDelta === 1,
      ),
      unit: "",
    });
    addGate(gates, {
      actual: profile.sounds.rejected.audioPlaysDelta,
      limit: 1,
      name: `${profileName}: autoplay rejection is contained`,
      pass: profile.sounds.rejected.audioPlaysDelta === 1,
      unit: "play",
    });
    addGate(gates, {
      actual: profile.overlay.delta.p95FrameTimeMs,
      limit: 2,
      name: `${profileName}: overlay frame p95 delta`,
      pass: profile.overlay.delta.p95FrameTimeMs <= 2,
      unit: "ms",
    });
    addGate(gates, {
      actual: profile.overlay.delta.droppedFramePercentagePoints,
      limit: 0.5,
      name: `${profileName}: overlay dropped-frame delta`,
      pass: profile.overlay.delta.droppedFramePercentagePoints <= 0.5,
      unit: "pp",
    });
    addGate(gates, {
      actual: profile.overlay.delta.inputToPaintP95Ms,
      limit: 10,
      name: `${profileName}: overlay input→paint p95 delta`,
      pass: profile.overlay.delta.inputToPaintP95Ms <= 10,
      unit: "ms",
    });
    addGate(gates, {
      actual: profile.browserErrors.length + profile.consoleErrors.length,
      limit: 0,
      name: `${profileName}: uncaught browser errors`,
      pass:
        profile.browserErrors.length === 0 &&
        profile.consoleErrors.length === 0,
      unit: "count",
    });
  }

  if (idleMeasurement) {
    for (const metric of [
      "bodyObserverCallbacks",
      "reactCommits",
      "storageWrites",
    ]) {
      addGate(gates, {
        actual: idleMeasurement[metric],
        limit: 0,
        name: `Idle ${idleMeasurement.durationMs / 1000}s: ${metric}`,
        pass: idleMeasurement[metric] === 0,
        unit: "count",
      });
    }
  }

  const expectedVisualCaseIds = gameInterfaces.flatMap((gameInterface) =>
    getVisualCaseConfigurations(gameInterface).map(
      (configuration) =>
        `${configuration.gameInterface}-${configuration.theme}-${configuration.name}`,
    ),
  );
  const actualVisualCaseIds = visualMatrix.cases.map(({ caseId }) => caseId);
  const actualVisualCaseIdSet = new Set(actualVisualCaseIds);
  const missingVisualCaseIds = expectedVisualCaseIds.filter(
    (caseId) => !actualVisualCaseIdSet.has(caseId),
  );
  const expectedVisualCaseIdSet = new Set(expectedVisualCaseIds);
  const unexpectedVisualCaseIds = actualVisualCaseIds.filter(
    (caseId) => !expectedVisualCaseIdSet.has(caseId),
  );
  const duplicateVisualCaseCount =
    actualVisualCaseIds.length - actualVisualCaseIdSet.size;
  addGate(gates, {
    actual: `${actualVisualCaseIdSet.size}/${expectedVisualCaseIds.length}`,
    limit: `${expectedVisualCaseIds.length}/${expectedVisualCaseIds.length}`,
    name: "Visual matrix expected cases",
    pass:
      missingVisualCaseIds.length === 0 &&
      unexpectedVisualCaseIds.length === 0 &&
      duplicateVisualCaseCount === 0,
    unit: "cases",
  });
  const zeroByteVisualCases = visualMatrix.cases.filter(
    (visualCase) => !visualCase.fileExists || visualCase.bytes <= 0,
  );
  addGate(gates, {
    actual: zeroByteVisualCases.length,
    limit: 0,
    name: "Visual matrix non-empty screenshots",
    pass: zeroByteVisualCases.length === 0,
    unit: "cases",
  });
  const visualErrorCount = visualMatrix.cases.reduce(
    (errorCount, visualCase) =>
      errorCount +
      visualCase.browserErrors.length +
      visualCase.consoleErrors.length,
    0,
  );
  addGate(gates, {
    actual: visualErrorCount,
    limit: 0,
    name: "Visual matrix console/page errors",
    pass: visualErrorCount === 0,
    unit: "errors",
  });
  const failedVisualCases = visualMatrix.cases.filter(
    (visualCase) => !visualCase.pass,
  );
  addGate(gates, {
    actual: failedVisualCases.length,
    limit: 0,
    name: "Visual matrix render/interaction assertions",
    pass: failedVisualCases.length === 0,
    unit: "cases",
  });

  return gates;
};

const renderMarkdown = (report) => {
  const lines = [
    "# Game client browser performance",
    "",
    `Built userscript: ${report.metadata.bundleBytes.toLocaleString("en-US")} B; Chrome ${report.metadata.chromeVersion}; ${report.metadata.createdAt}`,
    "",
    "`receive→paint` ends at the first rAF (paint opportunity); staged DOM is sampled after the second rAF, then final DOM/order/deadlines are verified after settling.",
    "",
    "## Notification pipeline",
    "",
    "| Interface | CPU | Scenario | n | receive→store med/p95 ms | receive→commit med/p95 ms | receive→paint med/p95 ms | receive→double-rAF med/p95 ms | publications | sync/all commits | storage | DOM rows double/final/nodes final | observers | long task/LoAF ms |",
    "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];

  for (const profile of report.profiles) {
    for (const scenario of profile.scenarios) {
      const summary = scenario.summary;
      lines.push(
        `| ${profile.gameInterface.toUpperCase()} | ${profile.cpuRate}× | ${scenario.name} | ${summary.samples} | ${summary.receiveToStoreMedianMs}/${summary.receiveToStoreP95Ms} | ${summary.receiveToCommitMedianMs}/${summary.receiveToCommitP95Ms} | ${summary.receiveToPaintMedianMs}/${summary.receiveToPaintP95Ms} | ${summary.receiveToDoubleAnimationFrameMedianMs}/${summary.receiveToDoubleAnimationFrameP95Ms} | ${summary.maxStorePublications} | ${summary.maxSynchronousReactCommits}/${summary.maxReactCommits} | ${summary.maxStorageWrites} | ${summary.maxDomNotifications}/${summary.maxSettledDomNotifications}/${summary.maxSettledDomNodes} | ${summary.maxMutationObserverCallbacks} | ${summary.maxLongTaskMs}/${summary.maxLongAnimationFrameMs} |`,
      );
    }
  }

  lines.push(
    "",
    "## Audio and overlay",
    "",
    "| Interface | CPU | Sound off instances/plays | Cold instances/plays | Warm max instances/plays | Rejected plays | Frame p95 delta ms | Dropped delta pp | Input→paint delta ms |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  );
  for (const profile of report.profiles) {
    lines.push(
      `| ${profile.gameInterface.toUpperCase()} | ${profile.cpuRate}× | ${profile.sounds.soundOff.audioInstancesDelta}/${profile.sounds.soundOff.audioPlaysDelta} | ${profile.sounds.cold.audioInstancesDelta}/${profile.sounds.cold.audioPlaysDelta} | ${profile.sounds.warm.summary.maxAudioInstances}/${profile.sounds.warm.summary.maxAudioPlays} | ${profile.sounds.rejected.audioPlaysDelta} | ${profile.overlay.delta.p95FrameTimeMs} | ${profile.overlay.delta.droppedFramePercentagePoints} | ${profile.overlay.delta.inputToPaintP95Ms} |`,
    );
  }

  lines.push(
    "",
    "## Chrome trace layout/style/paint",
    "",
    "| Interface | CPU | Overlay | Layout count/ms | Style count/ms | Paint count/ms | Raw trace | Screenshot |",
    "|---|---:|---|---:|---:|---:|---|---|",
  );
  for (const profile of report.profiles) {
    for (const overlayState of ["off", "on"]) {
      const trace = profile.overlay.trace[overlayState];
      lines.push(
        `| ${profile.gameInterface.toUpperCase()} | ${profile.cpuRate}× | ${overlayState.toUpperCase()} | ${trace.layout.count}/${trace.layout.durationMs} | ${trace.style.count}/${trace.style.durationMs} | ${trace.paint.count}/${trace.paint.durationMs} | ${trace.file} | ${profile.overlay.trace.screenshotFile} |`,
      );
    }
  }

  if (report.idle) {
    lines.push(
      "",
      "## Idle",
      "",
      "| Duration | React commits | Storage writes | Body observer callbacks | All mutation callbacks |",
      "|---:|---:|---:|---:|---:|",
      `| ${report.idle.durationMs / 1000}s | ${report.idle.reactCommits} | ${report.idle.storageWrites} | ${report.idle.bodyObserverCallbacks} | ${report.idle.mutationObserverCallbacks} |`,
    );
  }

  lines.push(
    "",
    "## Visual golden matrix",
    "",
    "Real Chromium captures are structurally gated for expected case coverage, visible production windows, non-empty PNGs, interaction state, and zero console/page errors.",
    "",
    "| Interface | Theme | Passed/expected | PNG bytes | Failed cases |",
    "|---|---|---:|---:|---|",
  );
  for (const gameInterface of gameInterfaces) {
    for (const theme of VISUAL_THEMES) {
      const casePrefix = `${gameInterface}-${theme}-`;
      const visualCases = report.visualMatrix.cases.filter(({ caseId }) =>
        caseId.startsWith(casePrefix),
      );
      const failedCases = visualCases
        .filter((visualCase) => !visualCase.pass)
        .map(({ caseId }) => caseId)
        .join(", ");
      lines.push(
        `| ${gameInterface.toUpperCase()} | ${theme} | ${visualCases.filter((visualCase) => visualCase.pass).length}/${getVisualCaseConfigurations(gameInterface).filter((configuration) => configuration.theme === theme).length} | ${visualCases.reduce((byteTotal, visualCase) => byteTotal + visualCase.bytes, 0)} | ${failedCases || "—"} |`,
      );
    }
  }
  lines.push(
    "",
    "Excluded unreachable production state IDs:",
    "",
    ...report.visualMatrix.exclusions.map(
      ({ reason, windowId }) => `- \`${windowId}\`: ${reason}`,
    ),
  );

  lines.push(
    "",
    "## Gates",
    "",
    "| Result | Gate | Actual | Limit |",
    "|---|---|---:|---:|",
  );
  for (const gate of report.gates) {
    lines.push(
      `| ${gate.pass ? "PASS" : "FAIL"} | ${gate.name} | ${gate.actual} ${gate.unit} | ≤${gate.limit} ${gate.unit} |`,
    );
  }

  return `${lines.join("\n")}\n`;
};

const run = async () => {
  if (
    gameInterfaces.length === 0 ||
    cpuRates.length === 0 ||
    sampleCount < 1 ||
    warmupCount < 0
  ) {
    throw new Error("At least one valid interface and CPU rate is required.");
  }

  await mkdir(artifactsDirectory, { recursive: true });

  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "lootlog-browser-perf-"),
  );
  let browser;

  try {
    const { localEntrypointPath, userscriptPath } =
      buildUserscript(temporaryDirectory);
    const userscript = await readFile(userscriptPath);
    const chromeExecutable = findChromeExecutable();
    browser = await chromium.launch({
      executablePath: chromeExecutable,
      headless: true,
      args: [
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
      ],
    });
    let idleMeasurement = null;
    const visualCases = [];
    const visualCaptureCpuRate = cpuRates.includes(1) ? 1 : cpuRates[0];
    const profileConfigurations = gameInterfaces.flatMap((gameInterface) =>
      cpuRates.map((cpuRate) => ({ cpuRate, gameInterface })),
    );
    const profiles = await runSequentially(
      profileConfigurations,
      async ({ cpuRate, gameInterface }) => {
        const fixturePage = await createFixturePage({
          browser,
          cpuRate,
          gameInterface,
          localEntrypointPath,
          userscriptPath,
        });

        try {
          const windowAnimation = await checkWindowAnimation(fixturePage.page);
          const scenarios = await runSequentially(SCENARIOS, (scenario) =>
            runScenario(fixturePage.page, scenario),
          );
          const sounds = await runSoundScenarios(fixturePage.page);
          const overlay = await measureOverlayCost(
            fixturePage.page,
            fixturePage.devtoolsSession,
            `${gameInterface}-${cpuRate}x`,
          );
          if (idleDurationMs > 0 && gameInterface === "ni" && cpuRate === 1) {
            idleMeasurement = await measureIdle(fixturePage.page);
          }
          if (cpuRate === visualCaptureCpuRate) {
            visualCases.push(
              ...(await captureVisualMatrix({
                browserErrors: fixturePage.browserErrors,
                consoleErrors: fixturePage.consoleErrors,
                gameInterface,
                page: fixturePage.page,
              })),
            );
          }

          return {
            browserErrors: fixturePage.browserErrors,
            consoleErrors: fixturePage.consoleErrors,
            cpuRate,
            gameInterface,
            overlay,
            scenarios,
            sounds,
            windowAnimation,
          };
        } finally {
          await fixturePage.context.close();
        }
      },
    );

    const report = {
      gates: [],
      idle: idleMeasurement,
      metadata: {
        bundleBytes: userscript.byteLength,
        chromeExecutable,
        chromeVersion: await browser.version(),
        cpuRates,
        createdAt: new Date().toISOString(),
        gameInterfaces,
        sampleCount,
        warmupCount,
      },
      profiles,
      visualMatrix: {
        cases: visualCases,
        exclusions: VISUAL_EXCLUSIONS,
      },
    };
    report.gates = evaluateGates(
      profiles,
      idleMeasurement,
      report.visualMatrix,
    );
    await writeFile(
      join(artifactsDirectory, "results.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    const markdown = renderMarkdown(report);
    await writeFile(join(artifactsDirectory, "report.md"), markdown);
    process.stdout.write(markdown);

    const failedGates = report.gates.filter((gate) => !gate.pass);
    if (shouldEnforce && failedGates.length > 0) {
      throw new Error(
        `${failedGates.length} browser performance gates failed.`,
      );
    }
  } finally {
    await browser?.close();
    if (!process.env.BROWSER_PERF_KEEP_BUILD) {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  }
};

run().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
