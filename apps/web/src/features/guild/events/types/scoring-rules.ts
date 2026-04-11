export const EVENT_SCORING_MODES = ["SIMPLE", "ADVANCED"] as const;
export type EventScoringMode = (typeof EVENT_SCORING_MODES)[number];

export const EVENT_SCORING_TIMEZONE = "Europe/Warsaw" as const;

export const EVENT_SCORING_NUMERIC_FACTORS = [
  "trackingDurationPercentage",
  "trackingDurationSeconds",
  "assignedMembersCount",
  "minutesSinceLeaveToKill",
  "timeOnMapSeconds",
  "afkPercentage",
  "respawnDurationSeconds",
  "respawnProgressPercentage",
] as const;
export type EventScoringNumericFactor =
  (typeof EVENT_SCORING_NUMERIC_FACTORS)[number];

export const EVENT_SCORING_BOOLEAN_FACTORS = [
  "eligible",
  "memberPresentAtKill",
  "wasPresent",
] as const;
export type EventScoringBooleanFactor =
  (typeof EVENT_SCORING_BOOLEAN_FACTORS)[number];

export const EVENT_SCORING_NUMERIC_OPERATORS = [
  ">",
  ">=",
  "<",
  "<=",
  "==",
  "!=",
] as const;
export type EventScoringNumericOperator =
  (typeof EVENT_SCORING_NUMERIC_OPERATORS)[number];

export const EVENT_SCORING_CONDITION_TYPES = [
  "NUMERIC",
  "BOOLEAN",
  "KILL_TIME_IN_WINDOW",
  "RESPAWN_WINDOW_COVERAGE",
] as const;

export const EVENT_SCORING_ACTION_TYPES = [
  "SET_BASE",
  "ADD_BONUS",
  "ZERO_BASE",
] as const;

export type EventScoringCondition =
  | {
      type: "NUMERIC";
      factor: EventScoringNumericFactor;
      operator: EventScoringNumericOperator;
      value: number;
    }
  | {
      type: "BOOLEAN";
      factor: EventScoringBooleanFactor;
      value: boolean;
    }
  | {
      type: "KILL_TIME_IN_WINDOW";
      from: string;
      to: string;
    }
  | {
      type: "RESPAWN_WINDOW_COVERAGE";
      from: string;
      to: string;
      operator: EventScoringNumericOperator;
      value: number;
    };

export type EventScoringAction =
  | {
      type: "SET_BASE";
      points: number;
    }
  | {
      type: "ADD_BONUS";
      points: number;
    }
  | {
      type: "ZERO_BASE";
    };

export interface EventScoringRule {
  id: string;
  name?: string;
  enabled?: boolean;
  conditions: EventScoringCondition[];
  action: EventScoringAction;
}

export interface EventScoringRules {
  version: 1;
  timezone: string;
  hardCapPoints: number;
  minTrackingPercentForBonuses: number;
  rules: EventScoringRule[];
}

export const DEFAULT_ADVANCED_EVENT_SCORING_RULES: EventScoringRules = {
  version: 1,
  timezone: EVENT_SCORING_TIMEZONE,
  hardCapPoints: 2,
  minTrackingPercentForBonuses: 50,
  rules: [
    {
      id: "base-25",
      name: "Base 25%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 25,
        },
      ],
      action: { type: "SET_BASE", points: 0.25 },
    },
    {
      id: "base-50",
      name: "Base 50%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 50,
        },
      ],
      action: { type: "SET_BASE", points: 0.5 },
    },
    {
      id: "base-75",
      name: "Base 75%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 75,
        },
      ],
      action: { type: "SET_BASE", points: 1 },
    },
    {
      id: "leave-grace",
      name: "Leave grace >10 min",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 75,
        },
        {
          type: "BOOLEAN",
          factor: "memberPresentAtKill",
          value: false,
        },
        {
          type: "NUMERIC",
          factor: "minutesSinceLeaveToKill",
          operator: ">",
          value: 10,
        },
      ],
      action: { type: "ZERO_BASE" },
    },
    {
      id: "bonus-small-group",
      name: "Bonus small group",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "assignedMembersCount",
          operator: ">=",
          value: 1,
        },
        {
          type: "NUMERIC",
          factor: "assignedMembersCount",
          operator: "<=",
          value: 4,
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
    {
      id: "bonus-night",
      name: "Bonus night watch",
      enabled: true,
      conditions: [
        {
          type: "RESPAWN_WINDOW_COVERAGE",
          from: "03:00",
          to: "08:00",
          operator: ">=",
          value: 75,
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
    {
      id: "bonus-pvp",
      name: "Bonus pvp window",
      enabled: true,
      conditions: [
        {
          type: "KILL_TIME_IN_WINDOW",
          from: "08:00",
          to: "11:00",
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
  ],
};
