import type { TFunction } from "i18next";
import {
  getGroupTimeShare,
  type EventKillPresence,
  type GroupMembership,
  type ParticipantPresence,
  type PresenceParticipantId,
} from "@lootlog/domain/scoring-presence";
import {
  resolveEventScoringJoin,
  type EventScoringCondition,
  type EventScoringConditionOutcome,
} from "@lootlog/domain/scoring";
import { formatTime } from "./format-date";
import {
  formatScoringDuration,
  formatScoringPercentage,
  getGroupCountingLabel,
} from "./scoring-rule-labels";

const msToSeconds = (ms: number) => Math.round(ms / 1000);

/** A participant's counted time per concurrent group size, smallest first. */
const getGroupSizeDistribution = (participant: ParticipantPresence) =>
  [...participant.msByGroupSize]
    .sort(([left], [right]) => left - right)
    .map(([size, ms]) => ({
      size,
      ms,
      percentage:
        participant.countedMs > 0 ? (ms / participant.countedMs) * 100 : 0,
    }));

/** "1 osoba: 95 min, 95%; 2 osoby: 5 min, 5%". */
const formatGroupSizeDistribution = (
  participant: ParticipantPresence,
  t: TFunction,
) =>
  getGroupSizeDistribution(participant)
    .map((entry) =>
      t("events.scoring.presence.distributionEntry", {
        count: entry.size,
        duration: formatScoringDuration(msToSeconds(entry.ms), t),
        percentage: formatScoringPercentage(entry.percentage),
      }),
    )
    .join("; ");

const formatUnknownReason = (
  outcome: EventScoringConditionOutcome,
  t: TFunction,
) =>
  outcome.status === "UNKNOWN"
    ? t(`events.scoring.presence.unknownReason.${outcome.reason}`)
    : null;

export type PresenceFacts = {
  window: string;
  join: string;
  counted: string;
  distribution: string | null;
};

/** The participant's window, join, counted time and group sizes as text. */
export const getPresenceFacts = (
  analysis: EventKillPresence,
  participantId: PresenceParticipantId,
  t: TFunction,
): PresenceFacts => {
  const participant = analysis.participants.get(participantId);
  const { start, end } = analysis.window;

  const window =
    start && analysis.windowMs !== null
      ? t("events.scoring.presence.windowRange", {
          start: formatTime(start),
          end: formatTime(end),
          duration: formatScoringDuration(msToSeconds(analysis.windowMs), t),
        })
      : t("events.scoring.presence.unknownReason.WINDOW_UNKNOWN");

  const join = resolveEventScoringJoin({ analysis, participantId });

  const joinText =
    join.status === "UNKNOWN"
      ? t(`events.scoring.presence.unknownReason.${join.reason}`)
      : join.status === "ABSENT" || !participant?.firstJoinAt
        ? t("events.scoring.presence.absent")
        : t("events.scoring.presence.joinedAt", {
            time: formatTime(participant.firstJoinAt),
            delay: formatScoringDuration(msToSeconds(join.delayMs), t),
          });

  return {
    window,
    join: joinText,
    counted: t("events.scoring.presence.countedTime", {
      duration: formatScoringDuration(
        msToSeconds(participant?.countedMs ?? 0),
        t,
      ),
      share: formatScoringPercentage((participant?.windowShare ?? 0) * 100),
    }),
    distribution:
      participant && participant.countedMs > 0
        ? formatGroupSizeDistribution(participant, t)
        : null,
  };
};

const formatMembership = (
  membership: readonly GroupMembership[],
  minSharePercentage: number,
  nameOf: (participantId: PresenceParticipantId) => string,
  t: TFunction,
) => {
  const included = membership.filter((member) => member.included);
  const excluded = membership.filter((member) => !member.included);

  const includedText = included
    .map((member) =>
      t("events.scoring.presence.memberShare", {
        name: nameOf(member.participantId),
        share: formatScoringPercentage(member.windowShare * 100),
      }),
    )
    .join(", ");

  const excludedText = excluded
    .map((member) =>
      t(`events.scoring.presence.exclusion.${member.exclusion}`, {
        name: nameOf(member.participantId),
        share: formatScoringPercentage(member.windowShare * 100),
        threshold: minSharePercentage,
      }),
    )
    .join(", ");

  return [
    included.length > 0
      ? t("events.scoring.presence.included", { members: includedText })
      : null,
    excluded.length > 0
      ? t("events.scoring.presence.excluded", { members: excludedText })
      : null,
  ].filter((part) => part !== null);
};

/**
 * What a presence condition measured for this participant, such as the
 * matching share of their own time or who the group count included.
 */
export const getConditionMeasurement = (params: {
  condition: EventScoringCondition;
  outcome: EventScoringConditionOutcome;
  analysis: EventKillPresence | null;
  participantId: PresenceParticipantId;
  nameOf: (participantId: PresenceParticipantId) => string;
  t: TFunction;
}): string[] => {
  const { condition, analysis, participantId, nameOf, t } = params;
  const unknownReason = formatUnknownReason(params.outcome, t);

  if (unknownReason) return [unknownReason];

  if (!analysis) return [];

  const participant = analysis.participants.get(participantId);

  if (condition.type === "RESPAWN_JOIN") {
    const join = resolveEventScoringJoin({ analysis, participantId });

    return [
      join.status === "JOINED"
        ? t("events.scoring.presence.joinMeasurement", {
            delay: formatScoringDuration(msToSeconds(join.delayMs), t),
            tolerance: formatScoringDuration(condition.toleranceSeconds, t),
          })
        : t("events.scoring.presence.absent"),
    ];
  }

  if (condition.type !== "GROUP_SIZE") return [];

  const counting = getGroupCountingLabel(condition.counting, t);

  if (condition.counting === "TIMELINE") {
    if (!participant) return [];

    const share = getGroupTimeShare(participant, condition.size);

    return [
      t("events.scoring.presence.timeShareMeasurement", {
        matched: formatScoringDuration(msToSeconds(share.matchedMs), t),
        own: formatScoringDuration(msToSeconds(share.ownMs), t),
        percentage: formatScoringPercentage(share.percentage),
        counting,
      }),
    ];
  }

  const membership = analysis.groupMembership(
    condition.counting,
    condition.minSharePercentage,
  );

  return [
    t("events.scoring.presence.countMeasurement", {
      count: membership.filter((member) => member.included).length,
      counting,
    }),
    ...formatMembership(membership, condition.minSharePercentage, nameOf, t),
  ];
};
