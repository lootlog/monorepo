export interface EventScoringThreshold {
  percentage: number;
  points: number;
}

export interface EventScoringRules {
  baseThresholds: EventScoringThreshold[];
  leaveGraceMinutes: number;
  groupBonus: {
    minAssignedMembers: number;
    maxAssignedMembers: number;
    points: number;
  };
  nightBonus: {
    windowStart: string;
    windowEnd: string;
    requiredCoveragePercentage: number;
    points: number;
  };
  pvpBonus: {
    windowStart: string;
    windowEnd: string;
    points: number;
  };
  hardCapPoints: number;
  timezone: string;
}

export const DEFAULT_EVENT_SCORING_RULES: EventScoringRules = {
  baseThresholds: [
    { percentage: 75, points: 1 },
    { percentage: 50, points: 0.5 },
    { percentage: 25, points: 0.25 },
  ],
  leaveGraceMinutes: 10,
  groupBonus: {
    minAssignedMembers: 1,
    maxAssignedMembers: 4,
    points: 0.5,
  },
  nightBonus: {
    windowStart: "03:00",
    windowEnd: "08:00",
    requiredCoveragePercentage: 75,
    points: 0.5,
  },
  pvpBonus: {
    windowStart: "08:00",
    windowEnd: "11:00",
    points: 0.5,
  },
  hardCapPoints: 2,
  timezone: "Europe/Warsaw",
};
