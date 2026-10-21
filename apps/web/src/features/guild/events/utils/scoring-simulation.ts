import {
  calculateRespawnProgressPercentage,
  explainEventScoring,
  type EventScoringExplanation,
  type EventScoringRules,
} from "@lootlog/domain/scoring";
import {
  analyzeEventKillPresence,
  getPresenceScoringContext,
  type EventKillPresence,
} from "@lootlog/domain/scoring-presence";

type SimulationInterval = { id: string; from: string; to: string };

export type SimulationParticipant = {
  id: string;
  name: string;
  intervals: SimulationInterval[];
};

export type SimulationTimeline = {
  /** Minimum respawn time, "HH:MM". */
  windowStart: string;
  /** Kill time, "HH:MM"; earlier than the start means the next day. */
  killTime: string;
  /** Maximum respawn time, "HH:MM", for the respawn progress factor. */
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

const DAY_MS = 86_400_000;

/** The simulated kill happens on a fixed day; only clock times matter. */
const SIMULATION_DAY = new Date(2026, 0, 15);

const parseClock = (clock: string) => {
  const [hours, minutes] = clock.split(":").map(Number);

  return Number.isFinite(hours) && Number.isFinite(minutes)
    ? (hours ?? 0) * 3_600_000 + (minutes ?? 0) * 60_000
    : null;
};

/**
 * Places clock times on a timeline starting at the window start: a time
 * earlier than the start falls on the next day, so a night respawn works.
 */
const makeClockResolver = (windowStart: string) => {
  const startOffset = parseClock(windowStart) ?? 0;

  return (clock: string) => {
    const offset = parseClock(clock);

    if (offset === null) return null;

    const dayOffset = offset < startOffset ? DAY_MS : 0;

    return new Date(SIMULATION_DAY.getTime() + offset + dayOffset);
  };
};

/**
 * Scores every simulated participant from their presence intervals with the
 * same presence analysis and rules that live scoring uses.
 */
export function simulateScoringTimeline(
  rules: EventScoringRules,
  timeline: SimulationTimeline,
): SimulationResult {
  const toDate = makeClockResolver(timeline.windowStart);
  const windowStart = toDate(timeline.windowStart);
  const killTime = toDate(timeline.killTime) ?? SIMULATION_DAY;
  const maxRespawn = toDate(timeline.maxRespawn);

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
    window: {
      start: windowStart && windowStart < killTime ? windowStart : null,
      end: killTime,
    },
    participantIds: timeline.participants.map((participant) => participant.id),
    intervals,
  });

  // Kill points go to everyone whose presence touches the window, which is
  // what the existing "liczba obstawiających" factor counts.
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
          maxRespawnTime:
            maxRespawn && maxRespawn > killTime ? maxRespawn : null,
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

/** A member alone for 95 minutes until a second one arrives for the last 5. */
export const DEFAULT_SIMULATION_TIMELINE: SimulationTimeline = {
  windowStart: "08:00",
  killTime: "09:40",
  maxRespawn: "10:00",
  participants: [
    participant("a", "Gracz A", ["08:00", "09:40"]),
    participant("b", "Gracz B", ["09:35", "09:40"]),
  ],
};

/** Ready examples: a 100-minute window from 08:00 to the kill at 09:40. */
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
