import type {
  EventWrappedLeaderDto,
  EventWrappedLeaderResultDto,
} from "#src/events/wrapped/event-wrapped.model";

type EventWrappedLeaderCandidate = {
  memberId: number;
  member?: { id: number; name: string; avatar: string | null };
  name?: string;
  avatar?: string | null;
};

const roundToTwo = (value: number): number => Math.round(value * 100) / 100;

const toLeader = <T extends EventWrappedLeaderCandidate>(
  entry: T,
  primaryValue: number,
  secondaryValue: number | null,
): EventWrappedLeaderDto => {
  if (entry.member) {
    return {
      memberId: entry.member.id,
      name: entry.member.name,
      avatar: entry.member.avatar,
      primaryValue: roundToTwo(primaryValue),
      secondaryValue:
        secondaryValue === null ? null : roundToTwo(secondaryValue),
    };
  }

  return {
    memberId: entry.memberId,
    name: entry.name ?? "Unknown",
    avatar: entry.avatar ?? null,
    primaryValue: roundToTwo(primaryValue),
    secondaryValue: secondaryValue === null ? null : roundToTwo(secondaryValue),
  };
};

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
