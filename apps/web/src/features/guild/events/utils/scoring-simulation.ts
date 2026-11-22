import {
  calculateRespawnProgressPercentage,
  explainEventScoring,
  type EventScoringExplanation,
  type EventScoringRules,
} from "@lootlog/domain/scoring";
import {
  analyzeEventKillPresence,
  getPresenceScoringContext,
  resolveEventScoringWindow,
  type EventKillPresence,
} from "@lootlog/domain/scoring-presence";
import { addDays, toUtcDateFromLocal } from "@lootlog/datetime";

type SimulationInterval = { id: string; from: string; to: string };

export type SimulationParticipant = {
  id: string;
  name: string;
  intervals: SimulationInterval[];
};

export type SimulationTimeline = {
  windowStart: string;
  killTime: string;
  maxRespawn: string;
  participants: SimulationParticipant[];
};

type SimulationParticipantResult = {
  participant: SimulationParticipant;
  explanation: EventScoringExplanation;
  trackingDurationPercentage: number | undefined;
};

export type SimulationResult = {
  analysis: EventKillPresence;
  results: SimulationParticipantResult[];
};

const SIMULATION_DAY = { year: 2026, month: 1, day: 15 };

const parseClock = (clock: string) => {
  const [hour, minute] = clock.split(":").map(Number);

  return hour !== undefined &&
    minute !== undefined &&
    Number.isFinite(hour) &&
    Number.isFinite(minute)
    ? { hour, minute }
    : null;
};

const makeClockResolver = (windowStart: string, timeZone: string) => {
  const start = parseClock(windowStart);
  const startMinutes = start ? start.hour * 60 + start.minute : 0;

  return (clock: string) => {
    const time = parseClock(clock);

    if (!time) return null;

    const day =
      time.hour * 60 + time.minute < startMinutes
        ? addDays(SIMULATION_DAY, 1)
        : SIMULATION_DAY;

    return toUtcDateFromLocal(day, time.hour, time.minute, timeZone);
  };
};

export function simulateScoringTimeline(
  rules: EventScoringRules,
  timeline: SimulationTimeline,
): SimulationResult {
  const toDate = makeClockResolver(timeline.windowStart, rules.timezone);
  const startOfDay = toUtcDateFromLocal(SIMULATION_DAY, 0, 0, rules.timezone);
  const maxRespawn = toDate(timeline.maxRespawn);

  const window = resolveEventScoringWindow({
    killedAt: toDate(timeline.killTime) ?? startOfDay,
    minSpawnTimeAtKill: toDate(timeline.windowStart),
    maxSpawnTimeAtKill: maxRespawn,
  });

  const killTime = window.end;

  const intervals = timeline.participants.flatMap((participant) =>
    participant.intervals.flatMap((interval) => {
      const start = toDate(interval.from);
      const end = toDate(interval.to);

      return start && end && end > start
        ? [{ participantId: participant.id, start, end }]
        : [];
    }),
  );

  const analysis = analyzeEventKillPresence({
    window,
    participantIds: timeline.participants.map((participant) => participant.id),
    intervals,
  });

  const assignedMembersCount = timeline.participants.filter((participant) =>
    intervals.some(
      (interval) =>
        interval.participantId === participant.id &&
        interval.start <= killTime &&
        interval.end >= (analysis.window.start ?? killTime),
    ),
  ).length;

  const results = timeline.participants.map((participant) => {
    const presence = getPresenceScoringContext(analysis, participant.id);

    const explanation = explainEventScoring({
      mode: "ADVANCED",
      rules,
      context: {
        ...presence,
        eligible: true,
        assignedMembersCount,
        respawnProgressPercentage: calculateRespawnProgressPercentage({
          killTime,
          respawnStartTime: presence.respawnStartTime,
          maxRespawnTime: maxRespawn,
        }),
        timeOnMapSeconds: presence.trackingDurationSeconds,
        afkPercentage: 0,
        wasPresent: presence.trackingDurationSeconds > 0,
      },
    });

    return {
      participant,
      explanation,
      trackingDurationPercentage: presence.trackingDurationPercentage,
    };
  });

  return { analysis, results };
}

const participant = (
  id: string,
  name: string,
  ...ranges: Array<[string, string]>
): SimulationParticipant => ({
  id,
  name,
  intervals: ranges.map(([from, to], index) => ({
    id: `${id}-${index}`,
    from,
    to,
  })),
});

export const DEFAULT_SIMULATION_TIMELINE: SimulationTimeline = {
  windowStart: "08:00",
  killTime: "09:40",
  maxRespawn: "10:00",
  participants: [
    participant("a", "Gracz A", ["08:00", "09:40"]),
    participant("b", "Gracz B", ["09:35", "09:40"]),
  ],
};

export const SIMULATION_PRESETS = [
  {
    id: "joinWithinTolerance",
    timeline: {
      windowStart: "08:00",
      killTime: "09:40",
      maxRespawn: "10:00",
      participants: [
        participant("a", "Gracz A", ["08:05", "09:40"]),
        participant("b", "Gracz B", ["08:06", "09:40"]),
      ],
    },
  },
  { id: "lateSecondMember", timeline: DEFAULT_SIMULATION_TIMELINE },
  {
    id: "handover",
    timeline: {
      windowStart: "08:00",
      killTime: "09:40",
      maxRespawn: "10:00",
      participants: [
        participant("a", "Gracz A", ["08:00", "08:50"]),
        participant("b", "Gracz B", ["08:50", "09:40"]),
      ],
    },
  },
  {
    id: "shortFifthMember",
    timeline: {
      windowStart: "08:00",
      killTime: "09:40",
      maxRespawn: "10:00",
      participants: [
        participant("a", "Gracz A", ["08:00", "09:40"]),
        participant("b", "Gracz B", ["08:00", "09:40"]),
        participant("c", "Gracz C", ["08:00", "09:40"]),
        participant("d", "Gracz D", ["08:00", "09:40"]),
        participant("e", "Gracz E", ["09:35", "09:40"]),
      ],
    },
  },
] satisfies Array<{ id: string; timeline: SimulationTimeline }>;
