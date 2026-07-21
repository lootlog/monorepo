export const AFTER_GC_HEAP_HEADROOM_BYTES = 5 * 1024 * 1024;
export const AFTER_GC_HEAP_HEADROOM_RATIO = 0.1;
export const POST_GC_TREND_REQUIRED_SAMPLES = 5;
export const POST_GC_TREND_JITTER_BYTES = 512 * 1024;
export const POST_GC_TREND_MIN_GROWTH_BYTES = 2 * 1024 * 1024;
export const POST_GC_TREND_GROWTH_RATIO = 0.05;
export const POST_GC_TREND_MIN_SLOPE_BYTES = 256 * 1024;

export type PostGcTrendAnalysis = {
  allowedRegressions: number;
  growthThresholdBytes: number;
  hasEnoughSamples: boolean;
  jitterToleranceBytes: number;
  monotonicGrowthDetected: boolean;
  nonDecreasingSteps: number;
  passed: boolean;
  postGcSamplesBytes: number[];
  requiredSamples: number;
  robustSlopeBytesPerIteration: number;
  significantPositiveSteps: number;
  slopeThresholdBytesPerIteration: number;
  totalGrowthBytes: number;
};

export type SoakStructuralMetrics = {
  battle: {
    byteLimit: number;
    capturesProcessed: number;
    eventLimit: number;
    expectedCaptures: number;
    maxRetainedBytes: number;
    maxRetainedEvents: number;
    overflowedCaptures: number;
  };
  chat: {
    expectedMessages: number;
    guilds: number;
    maxMessagesPerGuild: number;
    messageLimitPerGuild: number;
    messagesProcessed: number;
    totalRetainedMessages: number;
  };
  lifecycle: {
    airTagClearsVerified: number;
    distinctMapIds: number;
    expectedMapChanges: number;
    expectedNpcClearedTransitions: number;
    expectedResets: number;
    interactionCancelsVerified: number;
    mapChangesPerIteration: number;
    mapChangesProcessed: number;
    mapPingClearsVerified: number;
    npcClearedTransitions: number;
    resetsCompleted: number;
    transientRecordsAfterReset: number;
  };
  logs: {
    actionLimit: number;
    byteLimit: number;
    capturesProcessed: number;
    expectedCaptures: number;
    retainedActions: number;
    retainedBytes: number;
  };
  notifications: {
    autoHideDeadlines: number;
    expectedNotifications: number;
    notificationLimit: number;
    notificationsProcessed: number;
    retainedNotifications: number;
  };
};

export type SoakReportInput = {
  durationMs: number;
  heap: {
    afterGcBytes: number;
    beforeBytes: number;
    peakBytes: number;
    postGcSamplesBytes: number[];
  };
  structural: SoakStructuralMetrics;
};

export type SoakReport = Omit<SoakReportInput, "heap"> & {
  configuration: {
    baseline: "post-warmup-steady-state";
  };
  gate: {
    failures: string[];
    passed: boolean;
  };
  generatedAt: string;
  heap: SoakReportInput["heap"] & {
    afterGcLimitBytes: number;
    retainedGrowthBytes: number;
    retainedGrowthRatio: number;
  };
  runtime: {
    architecture: string;
    nodeVersion: string;
    platform: string;
  };
  schemaVersion: 2;
  trend: PostGcTrendAnalysis;
};

export const getAfterGcHeapLimit = (baselineBytes: number): number =>
  Math.max(
    baselineBytes + AFTER_GC_HEAP_HEADROOM_BYTES,
    baselineBytes + baselineBytes * AFTER_GC_HEAP_HEADROOM_RATIO,
  );

const getMedian = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex] ?? 0;
  }

  const lowerValue = sortedValues[middleIndex - 1] ?? 0;
  const upperValue = sortedValues[middleIndex] ?? 0;
  return (lowerValue + upperValue) / 2;
};

const getTheilSenSlope = (values: number[]): number => {
  const slopes: number[] = [];

  for (let startIndex = 0; startIndex < values.length - 1; startIndex += 1) {
    for (
      let endIndex = startIndex + 1;
      endIndex < values.length;
      endIndex += 1
    ) {
      const startValue = values[startIndex] ?? 0;
      const endValue = values[endIndex] ?? 0;
      slopes.push((endValue - startValue) / (endIndex - startIndex));
    }
  }

  return getMedian(slopes);
};

export const analyzePostGcTrend = (
  baselineBytes: number,
  postGcSamplesBytes: number[],
): PostGcTrendAnalysis => {
  const allowedRegressions = 1;
  const samples = [baselineBytes, ...postGcSamplesBytes];
  const stepDeltas = samples.slice(1).map((sample, index) => {
    const previousSample = samples[index] ?? baselineBytes;
    return sample - previousSample;
  });
  const nonDecreasingSteps = stepDeltas.filter(
    (delta) => delta >= -POST_GC_TREND_JITTER_BYTES,
  ).length;
  const significantPositiveSteps = stepDeltas.filter(
    (delta) => delta > POST_GC_TREND_JITTER_BYTES,
  ).length;
  const lastWindow = samples.slice(-2);
  const totalGrowthBytes = getMedian(lastWindow) - baselineBytes;
  const growthThresholdBytes = Math.max(
    POST_GC_TREND_MIN_GROWTH_BYTES,
    baselineBytes * POST_GC_TREND_GROWTH_RATIO,
  );
  const robustSlopeBytesPerIteration = getTheilSenSlope(samples);
  const regressionCount = stepDeltas.length - nonDecreasingSteps;
  const hasEnoughSamples =
    postGcSamplesBytes.length >= POST_GC_TREND_REQUIRED_SAMPLES;
  const hasMonotonicShape = regressionCount <= allowedRegressions;
  const monotonicGrowthDetected =
    hasEnoughSamples &&
    hasMonotonicShape &&
    totalGrowthBytes > growthThresholdBytes &&
    robustSlopeBytesPerIteration > POST_GC_TREND_MIN_SLOPE_BYTES;

  return {
    allowedRegressions,
    growthThresholdBytes,
    hasEnoughSamples,
    jitterToleranceBytes: POST_GC_TREND_JITTER_BYTES,
    monotonicGrowthDetected,
    nonDecreasingSteps,
    passed: hasEnoughSamples && !monotonicGrowthDetected,
    postGcSamplesBytes: [...postGcSamplesBytes],
    requiredSamples: POST_GC_TREND_REQUIRED_SAMPLES,
    robustSlopeBytesPerIteration,
    significantPositiveSteps,
    slopeThresholdBytesPerIteration: POST_GC_TREND_MIN_SLOPE_BYTES,
    totalGrowthBytes,
  };
};

const getRetainedGrowthRatio = (
  baselineBytes: number,
  afterGcBytes: number,
): number => {
  if (baselineBytes === 0) {
    return afterGcBytes === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return (afterGcBytes - baselineBytes) / baselineBytes;
};

const getStructuralFailures = (structural: SoakStructuralMetrics): string[] => {
  const failures: string[] = [];

  if (
    structural.lifecycle.mapChangesProcessed !==
      structural.lifecycle.expectedMapChanges ||
    structural.lifecycle.distinctMapIds !==
      structural.lifecycle.mapChangesPerIteration
  ) {
    failures.push("map-change workload was incomplete");
  }
  if (
    structural.lifecycle.npcClearedTransitions !==
    structural.lifecycle.expectedNpcClearedTransitions
  ) {
    failures.push("map changes did not clear NPC state");
  }
  if (
    structural.lifecycle.mapPingClearsVerified !==
    structural.lifecycle.expectedMapChanges
  ) {
    failures.push("map changes did not clear map-ping state");
  }
  if (
    structural.lifecycle.interactionCancelsVerified !==
    structural.lifecycle.expectedMapChanges
  ) {
    failures.push("map changes did not cancel map-ping interaction");
  }
  if (
    structural.lifecycle.airTagClearsVerified !==
    structural.lifecycle.expectedMapChanges
  ) {
    failures.push("map changes did not clear AirTag state");
  }
  if (
    structural.lifecycle.resetsCompleted !== structural.lifecycle.expectedResets
  ) {
    failures.push("lifecycle reset workload was incomplete");
  }
  if (structural.lifecycle.transientRecordsAfterReset !== 0) {
    failures.push("lifecycle reset retained transient records");
  }

  if (structural.chat.messagesProcessed !== structural.chat.expectedMessages) {
    failures.push("chat workload was incomplete");
  }
  if (
    structural.chat.maxMessagesPerGuild > structural.chat.messageLimitPerGuild
  ) {
    failures.push("chat exceeded 300 messages per guild");
  }
  if (
    structural.chat.totalRetainedMessages >
    structural.chat.guilds * structural.chat.messageLimitPerGuild
  ) {
    failures.push("chat exceeded aggregate per-guild retention");
  }
  if (
    structural.chat.maxMessagesPerGuild !==
      structural.chat.messageLimitPerGuild ||
    structural.chat.totalRetainedMessages !==
      structural.chat.guilds * structural.chat.messageLimitPerGuild
  ) {
    failures.push("chat did not retain the expected bounded history");
  }

  if (
    structural.notifications.notificationsProcessed !==
    structural.notifications.expectedNotifications
  ) {
    failures.push("notification workload was incomplete");
  }
  if (
    structural.notifications.retainedNotifications >
    structural.notifications.notificationLimit
  ) {
    failures.push("notifications exceeded retained record cap");
  }
  if (
    structural.notifications.autoHideDeadlines >
    structural.notifications.notificationLimit
  ) {
    failures.push("notifications exceeded auto-hide deadline cap");
  }
  if (
    structural.notifications.retainedNotifications !==
      structural.notifications.notificationLimit ||
    structural.notifications.autoHideDeadlines !==
      structural.notifications.retainedNotifications
  ) {
    failures.push("notifications did not retain an atomic capped state");
  }

  if (
    structural.battle.capturesProcessed !== structural.battle.expectedCaptures
  ) {
    failures.push("battle capture workload was incomplete");
  }
  if (structural.battle.maxRetainedEvents > structural.battle.eventLimit) {
    failures.push("battle capture exceeded event cap");
  }
  if (structural.battle.maxRetainedBytes > structural.battle.byteLimit) {
    failures.push("battle capture exceeded byte cap");
  }
  if (structural.battle.overflowedCaptures > 0) {
    failures.push("battle capture overflowed during bounded soak input");
  }
  if (
    structural.battle.maxRetainedEvents === 0 ||
    structural.battle.maxRetainedBytes === 0
  ) {
    failures.push("battle capture retained no workload data");
  }

  if (structural.logs.capturesProcessed !== structural.logs.expectedCaptures) {
    failures.push("log capture workload was incomplete");
  }
  if (structural.logs.retainedActions > structural.logs.actionLimit) {
    failures.push("logs exceeded metadata cap");
  }
  if (structural.logs.retainedBytes > structural.logs.byteLimit) {
    failures.push("logs exceeded serialized byte cap");
  }
  if (
    structural.logs.retainedActions === 0 ||
    structural.logs.retainedBytes === 0
  ) {
    failures.push("logs retained no capture metadata");
  }

  return failures;
};

export const createSoakReport = (input: SoakReportInput): SoakReport => {
  const afterGcLimitBytes = getAfterGcHeapLimit(input.heap.beforeBytes);
  const failures = getStructuralFailures(input.structural);
  const trend = analyzePostGcTrend(
    input.heap.beforeBytes,
    input.heap.postGcSamplesBytes,
  );

  if (input.heap.afterGcBytes > afterGcLimitBytes) {
    failures.unshift(
      "after-GC heap exceeds max(baseline + 5 MiB, baseline x 1.10)",
    );
  }
  if (!trend.hasEnoughSamples) {
    failures.unshift(
      `post-GC trend has fewer than ${trend.requiredSamples} samples`,
    );
  } else if (trend.monotonicGrowthDetected) {
    failures.unshift("post-GC heap trend shows significant monotonic growth");
  }

  return {
    configuration: {
      baseline: "post-warmup-steady-state",
    },
    durationMs: input.durationMs,
    gate: {
      failures,
      passed: failures.length === 0,
    },
    generatedAt: new Date().toISOString(),
    heap: {
      ...input.heap,
      afterGcLimitBytes,
      retainedGrowthBytes: input.heap.afterGcBytes - input.heap.beforeBytes,
      retainedGrowthRatio: getRetainedGrowthRatio(
        input.heap.beforeBytes,
        input.heap.afterGcBytes,
      ),
    },
    runtime: {
      architecture: process.arch,
      nodeVersion: process.version,
      platform: process.platform,
    },
    schemaVersion: 2,
    structural: input.structural,
    trend,
  };
};

const formatBytes = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;

const formatCount = (count: number): string =>
  count.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatStatus = (passed: boolean): string => (passed ? "PASS" : "FAIL");

export const buildSoakMarkdown = (report: SoakReport): string => {
  const { structural } = report;
  const heapPassed =
    report.heap.afterGcBytes <= report.heap.afterGcLimitBytes &&
    report.trend.passed;
  const lifecyclePassed =
    structural.lifecycle.mapChangesProcessed ===
      structural.lifecycle.expectedMapChanges &&
    structural.lifecycle.distinctMapIds ===
      structural.lifecycle.mapChangesPerIteration &&
    structural.lifecycle.npcClearedTransitions ===
      structural.lifecycle.expectedNpcClearedTransitions &&
    structural.lifecycle.mapPingClearsVerified ===
      structural.lifecycle.expectedMapChanges &&
    structural.lifecycle.interactionCancelsVerified ===
      structural.lifecycle.expectedMapChanges &&
    structural.lifecycle.airTagClearsVerified ===
      structural.lifecycle.expectedMapChanges &&
    structural.lifecycle.resetsCompleted ===
      structural.lifecycle.expectedResets &&
    structural.lifecycle.transientRecordsAfterReset === 0;
  const lifecycleIterations =
    structural.lifecycle.mapChangesPerIteration === 0
      ? 0
      : structural.lifecycle.expectedMapChanges /
        structural.lifecycle.mapChangesPerIteration;
  const chatPassed =
    structural.chat.messagesProcessed === structural.chat.expectedMessages &&
    structural.chat.maxMessagesPerGuild <=
      structural.chat.messageLimitPerGuild &&
    structural.chat.maxMessagesPerGuild ===
      structural.chat.messageLimitPerGuild &&
    structural.chat.totalRetainedMessages ===
      structural.chat.guilds * structural.chat.messageLimitPerGuild;
  const notificationsPassed =
    structural.notifications.notificationsProcessed ===
      structural.notifications.expectedNotifications &&
    structural.notifications.retainedNotifications <=
      structural.notifications.notificationLimit &&
    structural.notifications.autoHideDeadlines <=
      structural.notifications.notificationLimit &&
    structural.notifications.retainedNotifications ===
      structural.notifications.notificationLimit &&
    structural.notifications.autoHideDeadlines ===
      structural.notifications.retainedNotifications;
  const battlePassed =
    structural.battle.capturesProcessed ===
      structural.battle.expectedCaptures &&
    structural.battle.maxRetainedEvents <= structural.battle.eventLimit &&
    structural.battle.maxRetainedBytes <= structural.battle.byteLimit &&
    structural.battle.overflowedCaptures === 0 &&
    structural.battle.maxRetainedEvents > 0 &&
    structural.battle.maxRetainedBytes > 0;
  const logsPassed =
    structural.logs.capturesProcessed === structural.logs.expectedCaptures &&
    structural.logs.retainedActions <= structural.logs.actionLimit &&
    structural.logs.retainedBytes <= structural.logs.byteLimit &&
    structural.logs.retainedActions > 0 &&
    structural.logs.retainedBytes > 0;
  const lines = [
    "# Game client retained-heap soak",
    "",
    `Generated: ${report.generatedAt}`,
    `Runtime: Node ${report.runtime.nodeVersion}, ${report.runtime.platform}/${report.runtime.architecture}`,
    "Baseline: post-warmup steady state with bounded caches populated",
    `Duration: ${report.durationMs.toFixed(1)} ms`,
    "",
    "## Heap",
    "",
    "| Measurement | Heap | Gate | Result |",
    "|---|---:|---:|---|",
    `| Before | ${formatBytes(report.heap.beforeBytes)} | — | — |`,
    `| Peak | ${formatBytes(report.heap.peakBytes)} | — | — |`,
    `| After full GC | ${formatBytes(report.heap.afterGcBytes)} | ${formatBytes(report.heap.afterGcLimitBytes)} | ${formatStatus(heapPassed)} |`,
    "",
    "## Post-GC trend",
    "",
    "| Sample | Heap |",
    "|---|---:|",
    `| Warm baseline | ${formatBytes(report.heap.beforeBytes)} |`,
    ...report.trend.postGcSamplesBytes.map(
      (sample, index) =>
        `| Workload ${formatCount(index + 1)} | ${formatBytes(sample)} |`,
    ),
    "",
    "| Check | Measurement | Gate | Result |",
    "|---|---:|---:|---|",
    `| Robust slope | ${formatBytes(report.trend.robustSlopeBytesPerIteration)}/iteration | ${formatBytes(report.trend.slopeThresholdBytesPerIteration)}/iteration | ${formatStatus(!report.trend.monotonicGrowthDetected)} |`,
    `| Robust total growth | ${formatBytes(report.trend.totalGrowthBytes)} | ${formatBytes(report.trend.growthThresholdBytes)} | ${formatStatus(!report.trend.monotonicGrowthDetected)} |`,
    `| Samples | ${formatCount(report.trend.postGcSamplesBytes.length)} | ${formatCount(report.trend.requiredSamples)} minimum | ${formatStatus(report.trend.hasEnoughSamples)} |`,
    `| Non-decreasing steps | ${formatCount(report.trend.nonDecreasingSteps)}/${formatCount(report.trend.postGcSamplesBytes.length)} | max ${formatCount(report.trend.allowedRegressions)} regression beyond ${formatBytes(report.trend.jitterToleranceBytes)} jitter | ${formatStatus(!report.trend.monotonicGrowthDetected)} |`,
    "",
    "## Structural retention",
    "",
    "| Structure | Workload | Retained high-water/final | Limit | Result |",
    "|---|---:|---:|---:|---|",
    `| Lifecycle / map changes | ${formatCount(structural.lifecycle.mapChangesProcessed)} map changes (${formatCount(lifecycleIterations)} × ${formatCount(structural.lifecycle.distinctMapIds)} distinct) | ${formatCount(structural.lifecycle.npcClearedTransitions)} NPC clears; ${formatCount(structural.lifecycle.mapPingClearsVerified)} ping clears; ${formatCount(structural.lifecycle.interactionCancelsVerified)} interaction cancels; ${formatCount(structural.lifecycle.airTagClearsVerified)} AirTag clears; ${formatCount(structural.lifecycle.transientRecordsAfterReset)} transient records | ${formatCount(structural.lifecycle.expectedMapChanges)} map changes; 0 transient | ${formatStatus(lifecyclePassed)} |`,
    `| Chat messages | ${formatCount(structural.chat.messagesProcessed)} processed | ${formatCount(structural.chat.totalRetainedMessages)} total; ${formatCount(structural.chat.maxMessagesPerGuild)}/guild | ${formatCount(structural.chat.messageLimitPerGuild)}/guild | ${formatStatus(chatPassed)} |`,
    `| Notifications | ${formatCount(structural.notifications.notificationsProcessed)} processed | ${formatCount(structural.notifications.retainedNotifications)} records; ${formatCount(structural.notifications.autoHideDeadlines)} deadlines | ${formatCount(structural.notifications.notificationLimit)} | ${formatStatus(notificationsPassed)} |`,
    `| Battle captures | ${formatCount(structural.battle.capturesProcessed)} captures | ${formatCount(structural.battle.maxRetainedEvents)} events; ${formatBytes(structural.battle.maxRetainedBytes)} | ${formatCount(structural.battle.eventLimit)} events; ${formatBytes(structural.battle.byteLimit)} | ${formatStatus(battlePassed)} |`,
    `| Logs | ${formatCount(structural.logs.capturesProcessed)} captures | ${formatCount(structural.logs.retainedActions)} actions; ${formatBytes(structural.logs.retainedBytes)} | ${formatCount(structural.logs.actionLimit)} actions; ${formatBytes(structural.logs.byteLimit)} | ${formatStatus(logsPassed)} |`,
    "",
    `Overall: **${formatStatus(report.gate.passed)}**`,
  ];

  if (report.gate.failures.length > 0) {
    lines.push(
      "",
      "Failures:",
      "",
      ...report.gate.failures.map((failure) => `- ${failure}`),
    );
  }

  return `${lines.join("\n")}\n`;
};
