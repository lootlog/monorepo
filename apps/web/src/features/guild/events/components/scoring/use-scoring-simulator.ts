import { useState } from "react";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import {
  evaluateEventScoring,
  type EvaluationContext,
} from "../../utils/scoring-applied-rules";

function buildContext(params: {
  trackingPercent: number;
  trackingDurationSeconds: number | null;
  assignedMembers: number;
  presentAtKill: boolean;
  afkPercent: number;
  killTimeHour: number;
  killTimeMinute: number;
  minutesSinceLeave: number;
  respawnDurationMin: number;
  maxRespawnDurationMin: number;
  timeOnMapSeconds: number | null;
  wasPresent: boolean;
  timezone: string;
}): EvaluationContext {
  const respawnDurationSeconds = params.respawnDurationMin * 60;
  const maxRespawnDurationSeconds = params.maxRespawnDurationMin * 60;
  const derivedTrackingSeconds =
    (params.trackingPercent / 100) * respawnDurationSeconds;
  const trackingSeconds =
    params.trackingDurationSeconds ?? derivedTrackingSeconds;
  const derivedTimeOnMap = trackingSeconds * (1 - params.afkPercent / 100);
  const timeOnMapSeconds = params.timeOnMapSeconds ?? derivedTimeOnMap;

  const now = new Date();
  const killTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    params.killTimeHour,
    params.killTimeMinute,
    0,
    0,
  );
  const respawnStartTime = new Date(
    killTime.getTime() - respawnDurationSeconds * 1000,
  );

  const minutesSinceLeaveToKill = params.presentAtKill
    ? null
    : params.minutesSinceLeave;

  const respawnProgressPercentage =
    maxRespawnDurationSeconds > 0
      ? Math.round(
          (Math.min(respawnDurationSeconds, maxRespawnDurationSeconds) /
            maxRespawnDurationSeconds) *
            100,
        )
      : undefined;

  return {
    trackingDurationPercentage: params.trackingPercent,
    trackingDurationSeconds: trackingSeconds,
    assignedMembersCount: params.assignedMembers,
    killTime,
    respawnStartTime,
    respawnDurationSeconds,
    respawnProgressPercentage,
    minutesSinceLeaveToKill,
    memberPresentAtKill: params.presentAtKill,
    timeOnMapSeconds,
    afkPercentage: params.afkPercent,
    wasPresent: params.wasPresent,
  };
}

export function useScoringSimulator(scoringRules: EventScoringRules) {
  const [trackingPercent, setTrackingPercent] = useState(80);
  const [assignedMembers, setAssignedMembers] = useState(3);
  const [presentAtKill, setPresentAtKill] = useState(true);
  const [afkPercent, setAfkPercent] = useState(0);
  const [killTimeHour, setKillTimeHour] = useState(10);
  const [killTimeMinute, setKillTimeMinute] = useState(0);
  const [minutesSinceLeave, setMinutesSinceLeave] = useState(5);
  const [respawnDurationMin, setRespawnDurationMin] = useState(120);
  const [maxRespawnDurationMin, setMaxRespawnDurationMin] = useState(180);
  const [trackingDurationSecondsOverride, setTrackingDurationSecondsOverride] =
    useState<string>("");
  const [timeOnMapSecondsOverride, setTimeOnMapSecondsOverride] =
    useState<string>("");
  const [wasPresent, setWasPresent] = useState(true);

  const [ruleOverrides, setRuleOverrides] = useState<Record<string, boolean>>(
    {},
  );

  const toggleRule = (ruleId: string, currentEnabled: boolean) => {
    setRuleOverrides((prev) => ({ ...prev, [ruleId]: !currentEnabled }));
  };

  const rulesWithOverrides: EventScoringRules = {
    ...scoringRules,
    rules: scoringRules.rules.map((rule) => ({
      ...rule,
      enabled: ruleOverrides[rule.id] ?? rule.enabled !== false,
    })),
  };

  const context = buildContext({
    trackingPercent,
    trackingDurationSeconds:
      trackingDurationSecondsOverride !== ""
        ? Number(trackingDurationSecondsOverride)
        : null,
    assignedMembers,
    presentAtKill,
    afkPercent,
    killTimeHour,
    killTimeMinute,
    minutesSinceLeave,
    respawnDurationMin,
    maxRespawnDurationMin,
    timeOnMapSeconds:
      timeOnMapSecondsOverride !== "" ? Number(timeOnMapSecondsOverride) : null,
    wasPresent,
    timezone: scoringRules.timezone,
  });

  const result = evaluateEventScoring(rulesWithOverrides, context);

  const killTimeStr = `${String(killTimeHour).padStart(2, "0")}:${String(killTimeMinute).padStart(2, "0")}`;

  return {
    trackingPercent,
    setTrackingPercent,
    assignedMembers,
    setAssignedMembers,
    presentAtKill,
    setPresentAtKill,
    afkPercent,
    setAfkPercent,
    minutesSinceLeave,
    setMinutesSinceLeave,
    respawnDurationMin,
    setRespawnDurationMin,
    maxRespawnDurationMin,
    setMaxRespawnDurationMin,
    trackingDurationSecondsOverride,
    setTrackingDurationSecondsOverride,
    timeOnMapSecondsOverride,
    setTimeOnMapSecondsOverride,
    wasPresent,
    setWasPresent,
    ruleOverrides,
    toggleRule,
    result,
    killTimeStr,
    setKillTimeHour,
    setKillTimeMinute,
  };
}
