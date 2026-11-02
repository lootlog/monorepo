import { roundEventDisplayValue } from "#src/events/round-event-display-value";
import type {
  EventWrappedLeaderDto,
  EventWrappedLeaderResultDto,
} from "#src/events/wrapped/event-wrapped.model";
import type { MemberSummary } from "#src/contracts/shared";

type EventWrappedLeaderCandidate = { member: MemberSummary };

const toLeader = (
  { member: { id, name, avatar, userId } }: EventWrappedLeaderCandidate,
  primaryValue: number,
  secondaryValue: number | null,
): EventWrappedLeaderDto => ({
  member: { id, name, avatar, userId },
  primaryValue: roundEventDisplayValue(primaryValue),
  secondaryValue:
    secondaryValue === null ? null : roundEventDisplayValue(secondaryValue),
});

export const selectEventWrappedLeader = <T extends EventWrappedLeaderCandidate>(
  entries: T[],
  getPrimaryValue: (entry: T) => number,
  getSecondaryValue?: (entry: T) => number,
): EventWrappedLeaderResultDto => {
  const candidates = entries.flatMap((entry) => {
    const primaryValue = getPrimaryValue(entry);

    if (!Number.isFinite(primaryValue)) {
      return [];
    }

    const rawSecondaryValue = getSecondaryValue?.(entry);

    const secondaryValue =
      rawSecondaryValue === undefined || !Number.isFinite(rawSecondaryValue)
        ? null
        : rawSecondaryValue;

    return [{ entry, primaryValue, secondaryValue }];
  });

  if (candidates.length === 0) {
    return {
      winner: null,
      candidateCount: 0,
      tiedWinnerCount: 0,
    };
  }

  const maximumValue = Math.max(
    ...candidates.map((candidate) => candidate.primaryValue),
  );

  const tiedWinners = candidates.filter(
    (candidate) => candidate.primaryValue === maximumValue,
  );

  if (maximumValue <= 0 || tiedWinners.length !== 1) {
    return {
      winner: null,
      candidateCount: candidates.length,
      tiedWinnerCount: tiedWinners.length,
    };
  }

  const [winner] = tiedWinners;

  return {
    winner: toLeader(winner.entry, winner.primaryValue, winner.secondaryValue),
    candidateCount: candidates.length,
    tiedWinnerCount: 1,
  };
};
