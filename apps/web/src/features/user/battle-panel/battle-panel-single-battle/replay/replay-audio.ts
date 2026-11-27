import type {
  ReplayAttackEvent,
  ReplayDamageKind,
  ReplayEvent,
  ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";

export const REPLAY_AUDIO_SAMPLE_RATE = 44_100;

export const getReplaySoundTriggerMs = (event: ReplayEvent): number => {
  if (event.kind !== "attack") return event.tStart;

  const duration = Math.max(1, event.tEnd - event.tStart);

  return event.tStart + duration * (event.isRanged ? 0.06 : 0.24);
};

const getAttackImpactDelaySec = (event: ReplayAttackEvent): number => {
  const duration = Math.max(1, event.tEnd - event.tStart);
  const offsetFraction = event.isRanged ? 0.36 : 0.18;

  return Math.min(0.28, (duration * offsetFraction) / 1000);
};

const scheduleTone = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTimeSec: number,
  durationSec: number,
  startFreq: number,
  endFreq: number,
  type: OscillatorType,
  gainPeak: number,
  attackSec = 0.01,
): void => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, startFreq), startTimeSec);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, endFreq),
    startTimeSec + durationSec,
  );

  gain.gain.setValueAtTime(0.0001, startTimeSec);
  gain.gain.linearRampToValueAtTime(gainPeak, startTimeSec + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTimeSec + durationSec);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTimeSec);
  osc.stop(startTimeSec + durationSec + 0.025);
};

const scheduleFilteredNoise = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTimeSec: number,
  durationSec: number,
  filterType: BiquadFilterType,
  startFreq: number,
  endFreq: number,
  qValue: number,
  gainPeak: number,
  attackSec = 0.008,
): void => {
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i += 1) {
    channel[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.setValueAtTime(qValue, startTimeSec);
  filter.frequency.setValueAtTime(Math.max(40, startFreq), startTimeSec);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(40, endFreq),
    startTimeSec + durationSec,
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTimeSec);
  gain.gain.linearRampToValueAtTime(gainPeak, startTimeSec + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTimeSec + durationSec);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(startTimeSec);
};

const scheduleMetallicPartials = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  atTimeSec: number,
  frequencies: readonly number[],
  durationSec: number,
  gainPeak: number,
): void => {
  for (let i = 0; i < frequencies.length; i += 1) {
    const freq = frequencies[i] ?? 1200;

    scheduleTone(
      ctx,
      destination,
      atTimeSec,
      durationSec * (1 - i * 0.14),
      freq,
      freq * 0.96,
      i % 2 === 0 ? "triangle" : "sine",
      gainPeak / (i + 1),
      0.004,
    );
  }
};

const scheduleBowSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  atTimeSec: number,
  impactSec: number,
  avoided: boolean,
): void => {
  scheduleTone(
    ctx,
    destination,
    atTimeSec,
    0.13,
    255,
    142,
    "triangle",
    0.15,
    0.004,
  );
  scheduleTone(
    ctx,
    destination,
    atTimeSec,
    0.09,
    510,
    290,
    "sine",
    0.06,
    0.003,
  );
  scheduleFilteredNoise(
    ctx,
    destination,
    atTimeSec + 0.015,
    0.13,
    "bandpass",
    3200,
    1450,
    2.4,
    0.09,
    0.012,
  );

  if (!avoided) {
    scheduleTone(
      ctx,
      destination,
      impactSec,
      0.08,
      175,
      62,
      "triangle",
      0.16,
      0.003,
    );
    scheduleFilteredNoise(
      ctx,
      destination,
      impactSec,
      0.06,
      "bandpass",
      2100,
      900,
      1.8,
      0.12,
      0.003,
    );
  }
};

const scheduleFireSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  atTimeSec: number,
  impactSec: number,
  avoided: boolean,
): void => {
  scheduleFilteredNoise(
    ctx,
    destination,
    atTimeSec,
    0.18,
    "bandpass",
    320,
    1050,
    1.1,
    0.11,
    0.03,
  );

  if (!avoided) {
    scheduleTone(
      ctx,
      destination,
      impactSec,
      0.24,
      118,
      34,
      "sawtooth",
      0.18,
      0.006,
    );
    scheduleFilteredNoise(
      ctx,
      destination,
      impactSec,
      0.26,
      "lowpass",
      920,
      170,
      0.9,
      0.16,
      0.01,
    );
  }
};

const scheduleFrostSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  atTimeSec: number,
  impactSec: number,
  avoided: boolean,
): void => {
  scheduleMetallicPartials(
    ctx,
    destination,
    atTimeSec,
    [2240, 3360],
    0.14,
    0.06,
  );
  scheduleFilteredNoise(
    ctx,
    destination,
    atTimeSec,
    0.14,
    "highpass",
    4200,
    2600,
    1.5,
    0.05,
    0.015,
  );

  if (!avoided) {
    scheduleMetallicPartials(
      ctx,
      destination,
      impactSec,
      [2980, 3760, 4880, 5620],
      0.22,
      0.11,
    );
    scheduleFilteredNoise(
      ctx,
      destination,
      impactSec,
      0.12,
      "highpass",
      4800,
      2400,
      1.2,
      0.09,
      0.004,
    );
  }
};

const scheduleLightningSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  atTimeSec: number,
  impactSec: number,
  avoided: boolean,
): void => {
  const zapAt = avoided ? atTimeSec : impactSec - 0.04;
  scheduleTone(
    ctx,
    destination,
    zapAt,
    0.07,
    1650,
    420,
    "sawtooth",
    0.13,
    0.002,
  );
  scheduleTone(
    ctx,
    destination,
    zapAt + 0.03,
    0.08,
    2200,
    310,
    "square",
    0.08,
    0.002,
  );
  scheduleFilteredNoise(
    ctx,
    destination,
    zapAt,
    0.1,
    "highpass",
    3600,
    1800,
    1.6,
    0.14,
    0.002,
  );

  if (!avoided) {
    scheduleTone(
      ctx,
      destination,
      impactSec + 0.02,
      0.3,
      98,
      30,
      "sawtooth",
      0.16,
      0.008,
    );
    scheduleFilteredNoise(
      ctx,
      destination,
      impactSec + 0.02,
      0.28,
      "bandpass",
      320,
      110,
      0.8,
      0.13,
      0.012,
    );
  }
};

const scheduleSwordSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  atTimeSec: number,
  impactSec: number,
  avoided: boolean,
): void => {
  scheduleFilteredNoise(
    ctx,
    destination,
    atTimeSec,
    0.11,
    "bandpass",
    950,
    2900,
    2.2,
    0.1,
    0.012,
  );

  if (!avoided) {
    scheduleMetallicPartials(
      ctx,
      destination,
      impactSec,
      [1820, 2760, 4140],
      0.15,
      0.1,
    );
    scheduleTone(
      ctx,
      destination,
      impactSec,
      0.12,
      155,
      50,
      "triangle",
      0.17,
      0.004,
    );
    scheduleFilteredNoise(
      ctx,
      destination,
      impactSec,
      0.07,
      "bandpass",
      1400,
      620,
      1.3,
      0.1,
      0.003,
    );
  }
};

const scheduleCritAccent = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  impactSec: number,
  isVeryCrit: boolean,
): void => {
  scheduleTone(
    ctx,
    destination,
    impactSec,
    isVeryCrit ? 0.3 : 0.22,
    isVeryCrit ? 150 : 135,
    36,
    "sawtooth",
    isVeryCrit ? 0.22 : 0.17,
    0.004,
  );
  scheduleMetallicPartials(
    ctx,
    destination,
    impactSec,
    isVeryCrit ? [880, 1320, 1760] : [784, 1174],
    isVeryCrit ? 0.28 : 0.2,
    isVeryCrit ? 0.13 : 0.09,
  );
};

const scheduleMitigationSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  event: ReplayAttackEvent,
  impactSec: number,
): void => {
  if (event.isEvade) {
    scheduleFilteredNoise(
      ctx,
      destination,
      impactSec - 0.03,
      0.12,
      "bandpass",
      1200,
      3200,
      2.6,
      0.09,
      0.015,
    );

    return;
  }

  if (event.isParry) {
    scheduleMetallicPartials(
      ctx,
      destination,
      impactSec,
      [1480, 2260, 3580],
      0.24,
      0.15,
    );

    return;
  }

  if (event.isBlock || event.isArrowBlock) {
    scheduleTone(
      ctx,
      destination,
      impactSec,
      0.11,
      215,
      78,
      "triangle",
      0.18,
      0.003,
    );
    scheduleMetallicPartials(
      ctx,
      destination,
      impactSec,
      [860, 1340],
      0.13,
      0.09,
    );
  }
};

const scheduleAttackSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  event: ReplayAttackEvent,
  atTimeSec: number,
): void => {
  const impactSec = atTimeSec + getAttackImpactDelaySec(event);
  const avoided = event.isEvade || event.isParry || event.isArrowBlock;

  if (event.damageKind === "distance") {
    scheduleBowSound(ctx, destination, atTimeSec, impactSec, avoided);
  } else if (event.damageKind === "fire") {
    scheduleFireSound(ctx, destination, atTimeSec, impactSec, avoided);
  } else if (event.damageKind === "frost") {
    scheduleFrostSound(ctx, destination, atTimeSec, impactSec, avoided);
  } else if (event.damageKind === "lightning") {
    scheduleLightningSound(ctx, destination, atTimeSec, impactSec, avoided);
  } else {
    scheduleSwordSound(ctx, destination, atTimeSec, impactSec, avoided);
  }

  if (avoided || event.isBlock) {
    scheduleMitigationSound(ctx, destination, event, impactSec);
  }

  if (!avoided && event.isCrit) {
    scheduleCritAccent(ctx, destination, impactSec, event.isVeryCrit);
  }
};

const scheduleDotSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  damageKind: ReplayDamageKind,
  atTimeSec: number,
): void => {
  if (damageKind === "poison") {
    scheduleFilteredNoise(
      ctx,
      destination,
      atTimeSec,
      0.12,
      "bandpass",
      3200,
      1900,
      3.5,
      0.06,
      0.01,
    );

    return;
  }

  if (damageKind === "fire") {
    scheduleFilteredNoise(
      ctx,
      destination,
      atTimeSec,
      0.12,
      "bandpass",
      1100,
      540,
      1.6,
      0.06,
      0.008,
    );

    return;
  }

  scheduleTone(
    ctx,
    destination,
    atTimeSec,
    0.1,
    460,
    210,
    "triangle",
    0.06,
    0.006,
  );
};

export const scheduleReplayEventSound = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  event: ReplayEvent,
  atTimeSec: number,
): void => {
  if (event.kind === "attack") {
    scheduleAttackSound(ctx, destination, event, atTimeSec);

    return;
  }

  if (event.kind === "heal") {
    const notes = event.isLastHeal ? [523, 784, 1046, 1318] : [523, 659, 784];
    const step = event.isLastHeal ? 0.055 : 0.05;

    notes.forEach((freq, index) => {
      scheduleTone(
        ctx,
        destination,
        atTimeSec + index * step,
        event.isLastHeal ? 0.34 : 0.22,
        freq,
        freq * 1.01,
        "sine",
        event.isLastHeal ? 0.12 : 0.08,
        0.012,
      );
    });

    return;
  }

  if (event.kind === "shield") {
    scheduleTone(
      ctx,
      destination,
      atTimeSec,
      0.2,
      330,
      520,
      "sine",
      0.09,
      0.02,
    );
    scheduleTone(
      ctx,
      destination,
      atTimeSec + 0.03,
      0.22,
      660,
      880,
      "triangle",
      0.06,
      0.02,
    );

    return;
  }

  if (event.kind === "dot") {
    scheduleDotSound(ctx, destination, event.damageKind, atTimeSec);

    return;
  }

  if (event.kind === "step") {
    scheduleTone(
      ctx,
      destination,
      atTimeSec,
      0.06,
      120,
      54,
      "triangle",
      0.06,
      0.004,
    );
    scheduleFilteredNoise(
      ctx,
      destination,
      atTimeSec,
      0.04,
      "bandpass",
      440,
      220,
      1.4,
      0.04,
      0.003,
    );

    return;
  }

  if (event.kind === "legendary_proc" && event.isHighlight) {
    const notes = [587, 880, 1174, 1480];

    notes.forEach((freq, index) => {
      scheduleTone(
        ctx,
        destination,
        atTimeSec + index * 0.045,
        0.32,
        freq,
        freq * 1.015,
        index % 2 === 0 ? "triangle" : "sine",
        0.11,
        0.01,
      );
    });

    return;
  }

  if (event.kind === "death") {
    scheduleTone(
      ctx,
      destination,
      atTimeSec,
      0.44,
      140,
      34,
      "sawtooth",
      0.2,
      0.008,
    );
    scheduleMetallicPartials(
      ctx,
      destination,
      atTimeSec,
      [210, 318],
      0.42,
      0.12,
    );

    return;
  }

  if (event.kind === "flee") {
    scheduleFilteredNoise(
      ctx,
      destination,
      atTimeSec,
      0.22,
      "bandpass",
      700,
      2400,
      1.8,
      0.1,
      0.02,
    );

    return;
  }

  if (event.kind === "victory") {
    const notes =
      event.outcome === "defeat" ? [440, 349, 294] : [523, 659, 784, 1046];

    notes.forEach((freq, index) => {
      scheduleTone(
        ctx,
        destination,
        atTimeSec + index * 0.095,
        0.38,
        freq,
        freq,
        "triangle",
        0.13,
        0.015,
      );
      scheduleTone(
        ctx,
        destination,
        atTimeSec + index * 0.095,
        0.38,
        freq * 0.5,
        freq * 0.5,
        "sine",
        0.07,
        0.02,
      );
    });
  }
};

export const renderReplayAudioTrack = async (
  timeline: ReplayTimeline,
): Promise<AudioBuffer | null> => {
  const OfflineContextCtor = globalThis.OfflineAudioContext;

  if (!OfflineContextCtor) return null;

  const durationSec = Math.max(0.5, timeline.totalDurationMs / 1000);
  const frameCount = Math.ceil(durationSec * REPLAY_AUDIO_SAMPLE_RATE);

  try {
    const offline = new OfflineContextCtor(
      1,
      frameCount,
      REPLAY_AUDIO_SAMPLE_RATE,
    );

    const masterGain = offline.createGain();
    masterGain.gain.value = 0.72;
    masterGain.connect(offline.destination);

    for (const event of timeline.events) {
      const atSec = Math.max(0, getReplaySoundTriggerMs(event) / 1000);

      if (atSec < durationSec - 0.05) {
        scheduleReplayEventSound(offline, masterGain, event, atSec);
      }
    }

    return await offline.startRendering();
  } catch {
    return null;
  }
};
