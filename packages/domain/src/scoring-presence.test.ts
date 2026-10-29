import { describe, expect, it } from "bun:test";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  explainEventScoring,
  type EventScoringCondition,
  type EventScoringContext,
  type EventScoringRules,
} from "./scoring.js";
import {
  analyzeEventKillPresence,
  getGroupTimeShare,
  getPresenceScoringContext,
  resolveEventScoringWindow,
  type PresenceInterval,
  type PresenceWindow,
} from "./scoring-presence.js";

const at = (clock: string) => new Date(`2026-01-15T${clock}.000Z`);

/** 08:00–09:40, a 100-minute respawn window. */
const WINDOW: PresenceWindow = { start: at("08:00:00"), end: at("09:40:00") };

const presence = (
  participantId: string,
  from: string,
  to: string | null,
): PresenceInterval => ({
  participantId,
  start: at(from),
  end: to === null ? null : at(to),
});

const share = (value: number): EventScoringCondition => ({
  type: "NUMERIC",
  factor: "trackingDurationPercentage",
  operator: ">=",
  value,
});

const timeline = (
  size: { comparison: "EXACT" | "AT_MOST"; value: number },
  minTimePercentage = 90,
): EventScoringCondition => ({
  type: "GROUP_SIZE",
  counting: "TIMELINE",
  size: { ...size, to: size.value },
  minSharePercentage: 50,
  minTimePercentage,
});

/**
 * The example rulebook: half 0.5, full 1 (joined on time), small group 2 and
 * solo 3. Later matching base rules replace earlier ones, so solo is listed
 * after the small group that also covers it.
 */
const RULEBOOK: EventScoringRules = {
  version: 1,
  timezone: "Europe/Warsaw",
  hardCapPoints: 5,
  minTrackingPercentForBonuses: 50,
  rules: [
    {
      id: "half",
      conditions: [share(50)],
      action: { type: "SET_BASE", points: 0.5 },
    },
    {
      id: "full",
      conditions: [{ type: "RESPAWN_JOIN", toleranceSeconds: 300 }, share(90)],
      action: { type: "SET_BASE", points: 1 },
    },
    {
      id: "small-group",
      conditions: [share(50), timeline({ comparison: "AT_MOST", value: 4 })],
      action: { type: "SET_BASE", points: 2 },
    },
    {
      id: "solo",
      conditions: [share(50), timeline({ comparison: "EXACT", value: 1 })],
      action: { type: "SET_BASE", points: 3 },
    },
  ],
};

function score(params: {
  intervals: PresenceInterval[];
  participantId: string;
  participantIds?: string[];
  rules?: EventScoringRules;
  window?: PresenceWindow;
}) {
  const participantIds = params.participantIds ?? [
    ...new Set(params.intervals.map((interval) => interval.participantId)),
  ];

  const analysis = analyzeEventKillPresence({
    window: params.window ?? WINDOW,
    participantIds,
    intervals: params.intervals,
  });

  const context: EventScoringContext = {
    eligible: true,
    assignedMembersCount: participantIds.length,
    timeOnMapSeconds: 0,
    afkPercentage: 0,
    wasPresent: true,
    ...getPresenceScoringContext(analysis, params.participantId),
  };

  const explanation = explainEventScoring({
    mode: "ADVANCED",
    rules: params.rules ?? RULEBOOK,
    context,
  });

  return {
    analysis,
    context,
    basePoints: explanation.result.basePoints,
    outcomes: Object.fromEntries(
      explanation.rules.map((rule) => [
        rule.ruleId,
        rule.conditions.map(({ outcome }) => outcome),
      ]),
    ),
    explanation,
  };
}

const joinRule = (toleranceSeconds: number): EventScoringRules => ({
  ...RULEBOOK,
  rules: [
    {
      id: "join",
      conditions: [{ type: "RESPAWN_JOIN", toleranceSeconds }],
      action: { type: "SET_BASE", points: 1 },
    },
  ],
});

describe("respawn join tolerance", () => {
  it("accepts a join exactly at the tolerance and rejects one second later", () => {
    expect(
      score({
        intervals: [presence("A", "08:05:00", null)],
        participantId: "A",
        rules: joinRule(300),
      }).basePoints,
    ).toBe(1);

    expect(
      score({
        intervals: [presence("A", "08:05:01", null)],
        participantId: "A",
        rules: joinRule(300),
      }).basePoints,
    ).toBe(0);
  });

  it("gives no delay to presence that spans the window start", () => {
    const { analysis } = score({
      intervals: [presence("A", "07:30:00", null)],
      participantId: "A",
      rules: joinRule(0),
    });

    expect(analysis.participants.get("A")?.joinDelayMs).toBe(0);
  });

  it("ignores presence that ended before the window opened", () => {
    const result = score({
      intervals: [
        presence("A", "07:00:00", "07:59:00"),
        presence("A", "08:06:00", null),
      ],
      participantId: "A",
      rules: joinRule(300),
    });

    expect(result.basePoints).toBe(0);
    expect(result.outcomes.join).toEqual([{ status: "NOT_MET" }]);
  });

  it("keeps the first join when a member leaves, switches maps and returns", () => {
    const { analysis, basePoints } = score({
      intervals: [
        presence("A", "08:02:00", "08:10:00"),
        presence("A", "08:30:00", "09:00:00"),
        presence("A", "09:00:00", null),
      ],
      participantId: "A",
      rules: joinRule(300),
    });

    expect(analysis.participants.get("A")?.joinDelayMs).toBe(120_000);
    expect(basePoints).toBe(1);
  });

  it("does not replace the required share and keeps the real share", () => {
    const result = score({
      intervals: [presence("A", "08:00:00", "08:10:00")],
      participantId: "A",
    });

    expect(result.context.trackingDurationPercentage).toBe(10);
    expect(result.outcomes.full).toEqual([
      { status: "MET" },
      { status: "NOT_MET" },
    ]);
    expect(result.basePoints).toBe(0);
  });

  it("cannot be determined without a reliable respawn start", () => {
    const result = score({
      intervals: [presence("A", "08:00:00", null)],
      participantId: "A",
      rules: joinRule(300),
      window: resolveEventScoringWindow({
        killedAt: at("09:40:00"),
        minSpawnTimeAtKill: at("09:40:00"),
        maxSpawnTimeAtKill: at("09:40:00"),
      }),
    });

    expect(result.outcomes.join).toEqual([
      { status: "UNKNOWN", reason: "WINDOW_UNKNOWN" },
    ]);
    expect(result.basePoints).toBe(0);
  });

  it("exposes the delay as a numeric factor", () => {
    const rules: EventScoringRules = {
      ...RULEBOOK,
      rules: [
        {
          id: "late",
          conditions: [
            {
              type: "NUMERIC",
              factor: "respawnJoinDelaySeconds",
              operator: ">",
              value: 600,
            },
          ],
          action: { type: "ZERO_BASE" },
        },
      ],
    };

    expect(
      score({
        intervals: [presence("A", "08:10:01", null)],
        participantId: "A",
        rules,
      }).explanation.rules[0]?.applied,
    ).toBe(true);

    expect(
      score({
        intervals: [presence("A", "08:10:00", null)],
        participantId: "A",
        rules,
      }).explanation.rules[0]?.applied,
    ).toBe(false);
  });
});

describe("group size over time", () => {
  it("keeps the solo base when a second member arrives for the last 5 minutes", () => {
    const intervals = [
      presence("A", "08:00:00", null),
      presence("B", "09:35:00", null),
    ];

    const a = score({ intervals, participantId: "A" });
    const b = score({ intervals, participantId: "B" });

    const participant = a.analysis.participants.get("A");

    expect(
      participant &&
        getGroupTimeShare(participant, { comparison: "EXACT", value: 1, to: 1 })
          .percentage,
    ).toBe(95);
    expect(a.basePoints).toBe(3);
    expect(b.context.trackingDurationPercentage).toBe(5);
    expect(b.basePoints).toBe(0);
  });

  it("includes the boundary: exactly 90% solo still qualifies", () => {
    expect(
      score({
        intervals: [
          presence("A", "08:00:00", null),
          presence("B", "09:30:00", null),
        ],
        participantId: "A",
      }).basePoints,
    ).toBe(3);
  });

  it("falls back to the small group when solo time drops to 89%", () => {
    const result = score({
      intervals: [
        presence("A", "08:00:00", null),
        presence("B", "09:29:00", null),
      ],
      participantId: "A",
    });

    expect(result.basePoints).toBe(2);
    expect(
      result.explanation.rules.find((rule) => rule.ruleId === "solo")?.matched,
    ).toBe(false);
  });

  it("shows the small group replaced by solo rather than lowering it", () => {
    const result = score({
      intervals: [presence("A", "08:00:00", null)],
      participantId: "A",
    });

    const byId = new Map(
      result.explanation.rules.map((rule) => [rule.ruleId, rule]),
    );

    expect(byId.get("small-group")).toMatchObject({
      applied: true,
      overridden: true,
    });
    expect(byId.get("solo")).toMatchObject({
      applied: true,
      overridden: false,
    });
    expect(result.basePoints).toBe(3);
  });

  it("gives each member of a handover 100% solo and 50% share", () => {
    const intervals = [
      presence("A", "08:00:00", "08:50:00"),
      presence("B", "08:50:00", null),
    ];

    for (const participantId of ["A", "B"]) {
      const result = score({ intervals, participantId });

      expect(result.context.trackingDurationPercentage).toBe(50);
      expect(result.basePoints).toBe(3);
    }

    expect(
      score({ intervals, participantId: "A" }).analysis.segments.map(
        (segment) => segment.size,
      ),
    ).toEqual([1]);
  });

  it("keeps a four-person group's small-group base through a short fifth arrival", () => {
    const intervals = [
      ...["A", "B", "C", "D"].map((id) => presence(id, "08:00:00", null)),
      presence("E", "09:35:00", null),
    ];

    expect(score({ intervals, participantId: "A" }).basePoints).toBe(2);
  });

  it("never counts one member twice for overlapping records or map switches", () => {
    const result = score({
      intervals: [
        presence("A", "08:00:00", "09:00:00"),
        presence("A", "08:30:00", null),
        presence("A", "08:40:00", "08:45:00"),
      ],
      participantId: "A",
    });

    expect(result.context.trackingDurationSeconds).toBe(6000);
    expect(result.analysis.segments).toEqual([
      {
        start: at("08:00:00").getTime(),
        end: at("09:40:00").getTime(),
        size: 1,
      },
    ]);
    expect(result.basePoints).toBe(3);
  });

  it("awards nothing for zero counted time", () => {
    const result = score({
      intervals: [
        presence("A", "08:00:00", null),
        presence("B", "09:40:00", null),
      ],
      participantId: "B",
    });

    expect(result.analysis.participants.get("B")?.countedMs).toBe(0);
    expect(result.outcomes.solo).toEqual([
      { status: "NOT_MET" },
      { status: "NOT_MET" },
    ]);
    expect(result.basePoints).toBe(0);
  });

  it("does not treat missing participant data as confirmed solo", () => {
    const result = score({
      intervals: [presence("A", "08:00:00", null)],
      participantIds: ["A", "B"],
      participantId: "A",
    });

    expect(result.outcomes.solo?.[1]).toEqual({
      status: "UNKNOWN",
      reason: "GROUP_DATA_INCOMPLETE",
    });
    expect(result.basePoints).toBe(1);
  });

  it("cannot be determined without a presence analysis", () => {
    const result = explainEventScoring({
      mode: "ADVANCED",
      rules: RULEBOOK,
      context: {
        eligible: true,
        trackingDurationPercentage: 100,
        assignedMembersCount: 1,
        killTime: at("09:40:00"),
        respawnStartTime: at("08:00:00"),
        memberPresentAtKill: true,
        timeOnMapSeconds: 6000,
        afkPercentage: 0,
        wasPresent: true,
      },
    });

    expect(result.result.basePoints).toBe(0.5);
    expect(result.rules[3]?.conditions[1]?.outcome).toEqual({
      status: "UNKNOWN",
      reason: "NO_PRESENCE_DATA",
    });
  });
});

describe("group counting variants", () => {
  const intervals = [
    ...["A", "B", "C", "D"].map((id) => presence(id, "08:00:00", "08:50:00")),
    presence("E", "09:39:00", null),
  ];

  const count = (counting: "WINDOW" | "AT_KILL" | "MIN_SHARE", minShare = 50) =>
    analyzeEventKillPresence({
      window: WINDOW,
      participantIds: ["A", "B", "C", "D", "E"],
      intervals,
    })
      .groupMembership(counting, minShare)
      .filter((member) => member.included)
      .map((member) => member.participantId);

  it("counts members reaching the share threshold apart from everyone in the window", () => {
    expect(count("MIN_SHARE")).toEqual(["A", "B", "C", "D"]);
    expect(count("WINDOW")).toEqual(["A", "B", "C", "D", "E"]);
    expect(count("AT_KILL")).toEqual(["E"]);
  });

  it("still requires counted time at a 0% threshold", () => {
    const analysis = analyzeEventKillPresence({
      window: WINDOW,
      participantIds: ["A", "Z"],
      intervals: [
        presence("A", "08:00:00", null),
        presence("Z", "09:40:00", null),
      ],
    });

    expect(analysis.groupMembership("MIN_SHARE", 0)).toMatchObject([
      { participantId: "A", included: true },
      { participantId: "Z", included: false, exclusion: "NO_COUNTED_TIME" },
    ]);
  });

  it("qualifies members by share, not by the points they end up with", () => {
    const rules: EventScoringRules = {
      ...RULEBOOK,
      rules: [
        {
          id: "left-early",
          conditions: [
            { type: "BOOLEAN", factor: "memberPresentAtKill", value: false },
          ],
          action: { type: "ZERO_BASE" },
        },
        {
          id: "group-of-four",
          conditions: [
            {
              type: "GROUP_SIZE",
              counting: "MIN_SHARE",
              size: { comparison: "EXACT", value: 4, to: 4 },
              minSharePercentage: 50,
              minTimePercentage: 90,
            },
          ],
          action: { type: "ADD_BONUS", points: 1 },
        },
      ],
    };

    const leftEarly = score({ intervals, participantId: "A", rules });

    expect(leftEarly.explanation.result.basePoints).toBe(0);
    expect(
      leftEarly.explanation.rules.find(
        (rule) => rule.ruleId === "group-of-four",
      )?.matched,
    ).toBe(true);
  });
});

describe("compatibility", () => {
  it("scores saved default rules the same with or without presence data", () => {
    const intervals = [
      presence("A", "08:00:00", null),
      presence("B", "09:00:00", null),
    ];

    const withPresence = score({
      intervals,
      participantId: "A",
      rules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
    });

    const withoutPresence = explainEventScoring({
      mode: "ADVANCED",
      rules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
      context: { ...withPresence.context, presence: null },
    });

    expect(withoutPresence.result).toEqual(withPresence.explanation.result);
  });
});
