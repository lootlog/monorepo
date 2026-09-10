import {
  GROUP_FIGHT_FULL_TEAM_SIZE,
  GROUP_FIGHT_MIN_TEAM_SIZE,
  type GroupFightCollectionMode,
  type GroupFightOutcome,
  type GroupFightParticipantResult,
  type GroupFightTeam,
} from "@lootlog/schema/group-fights";

export interface GroupFightTeamSizes {
  readonly teamOne: number;
  readonly teamTwo: number;
}

export interface GroupFightTeamMember {
  readonly team: number;
}

export interface GroupFightScoredParticipant extends GroupFightTeamMember {
  readonly fled: boolean;
}

export interface GroupFightNamedWarrior extends GroupFightTeamMember {
  readonly id: string;
  readonly name: string;
}

export type GroupFightOutcomeMove =
  | { readonly kind: "winner"; readonly names: ReadonlyArray<string> }
  | { readonly kind: "loser"; readonly names: ReadonlyArray<string> }
  | { readonly kind: "flee"; readonly actorId: string | null };

export interface GroupFightResolution {
  readonly outcome: GroupFightOutcome;
  readonly effectiveWinningTeam: GroupFightTeam | null;
}

export const isGroupFightTeam = (value: unknown): value is GroupFightTeam =>
  value === 1 || value === 2;

export const getOpposingGroupFightTeam = (
  team: GroupFightTeam,
): GroupFightTeam => (team === 1 ? 2 : 1);

/** Counts participants already deduplicated by character; unknown teams are ignored. */
export const countGroupFightTeamSizes = (
  participants: ReadonlyArray<GroupFightTeamMember>,
): GroupFightTeamSizes => {
  let teamOne = 0;
  let teamTwo = 0;
  for (const participant of participants) {
    if (participant.team === 1) teamOne += 1;
    else if (participant.team === 2) teamTwo += 1;
  }
  return { teamOne, teamTwo };
};

/** Maps the organization toggle onto the collection mode. */
export const resolveGroupFightCollectionMode = (
  includeIncomplete: boolean,
): GroupFightCollectionMode => (includeIncomplete ? "ALL" : "FULL_TEAMS");

/** A group fight has one to ten players per side and at least one group. */
export const isGroupFightComposition = (
  sizes: GroupFightTeamSizes,
): boolean => {
  const larger = Math.max(sizes.teamOne, sizes.teamTwo);
  const smaller = Math.min(sizes.teamOne, sizes.teamTwo);
  return (
    Number.isInteger(sizes.teamOne) &&
    Number.isInteger(sizes.teamTwo) &&
    smaller >= 1 &&
    larger >= 2 &&
    larger <= GROUP_FIGHT_FULL_TEAM_SIZE
  );
};

/**
 * FULL_TEAMS keeps at least 8v8. ALL keeps every qualifying group fight,
 * including 2v1 and 10v1.
 */
export const isQualifyingGroupFightComposition = (
  sizes: GroupFightTeamSizes,
  mode: GroupFightCollectionMode = "FULL_TEAMS",
): boolean => {
  if (!isGroupFightComposition(sizes)) return false;
  if (mode === "ALL") return true;
  const larger = Math.max(sizes.teamOne, sizes.teamTwo);
  const smaller = Math.min(sizes.teamOne, sizes.teamTwo);
  return (
    larger >= GROUP_FIGHT_MIN_TEAM_SIZE && smaller >= GROUP_FIGHT_MIN_TEAM_SIZE
  );
};

/**
 * Resolves who is credited with the fight. A logged winner wins. When the log
 * ends without a winner ("walka nie wyłoniła zwycięzcy") and exactly one side
 * used an escape potion, the other side is credited. Otherwise it is a draw.
 */
export const resolveGroupFightResolution = (input: {
  readonly winningTeam: GroupFightTeam | null;
  readonly participants: ReadonlyArray<GroupFightScoredParticipant>;
}): GroupFightResolution => {
  if (input.winningTeam !== null) {
    return { outcome: "TEAM_WON", effectiveWinningTeam: input.winningTeam };
  }

  const fledTeams = new Set<GroupFightTeam>();
  for (const participant of input.participants) {
    if (participant.fled && isGroupFightTeam(participant.team)) {
      fledTeams.add(participant.team);
    }
  }

  const [fledTeam] = fledTeams;
  if (fledTeams.size === 1 && fledTeam !== undefined) {
    return {
      outcome: "NO_WINNER",
      effectiveWinningTeam: getOpposingGroupFightTeam(fledTeam),
    };
  }

  return { outcome: "NO_WINNER", effectiveWinningTeam: null };
};

export const resolveGroupFightParticipantResult = (
  participant: GroupFightScoredParticipant,
  effectiveWinningTeam: GroupFightTeam | null,
): GroupFightParticipantResult => {
  if (participant.fled) return "FLEE";
  if (effectiveWinningTeam === null) return "DRAW";
  return participant.team === effectiveWinningTeam ? "WIN" : "LOSS";
};

const splitOutcomeNames = (value: string): string[] =>
  value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name !== "?");

const parseActorId = (segment: string | undefined): string | null => {
  if (!segment) return null;
  const [id] = segment.split("=");
  return id && id !== "0" ? id : null;
};

/**
 * Parses a Margonem combat log row for outcome markers. Rows look like
 * `0;0;winner=?`, `0;0;winner=Nick1, Nick2`, or `123=100.00;0;flee`.
 */
export const parseGroupFightOutcomeMove = (
  row: string,
): GroupFightOutcomeMove | null => {
  const [actorSegment, , ...actions] = row.split(";");
  for (const action of actions) {
    const [key, ...rest] = action.split("=");
    const value = rest.join("=");
    if (key === "winner")
      return { kind: "winner", names: splitOutcomeNames(value) };
    if (key === "loser")
      return { kind: "loser", names: splitOutcomeNames(value) };
    if (key === "flee")
      return { kind: "flee", actorId: parseActorId(actorSegment) };
  }
  return null;
};

export const normalizeGroupFightName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Resolves the team named by a winner/loser row; majority wins ties are null. */
export const resolveGroupFightTeamFromNames = (
  names: ReadonlyArray<string>,
  warriors: ReadonlyArray<GroupFightNamedWarrior>,
): GroupFightTeam | null => {
  if (names.length === 0) return null;
  const wanted = new Set(names.map(normalizeGroupFightName));
  const wantedIds = new Set(names.filter((name) => /^\d+$/.test(name)));
  const votes = new Map<GroupFightTeam, number>();

  for (const warrior of warriors) {
    if (!isGroupFightTeam(warrior.team)) continue;
    if (
      wantedIds.has(warrior.id) ||
      wanted.has(normalizeGroupFightName(warrior.name))
    ) {
      votes.set(warrior.team, (votes.get(warrior.team) ?? 0) + 1);
    }
  }

  const teamOne = votes.get(1) ?? 0;
  const teamTwo = votes.get(2) ?? 0;
  if (teamOne === teamTwo) return null;
  return teamOne > teamTwo ? 1 : 2;
};

/** Seconds a participant spent in the fight, clamped to the fight bounds. */
export const calculateGroupFightParticipationSeconds = (input: {
  readonly joinedAt: number;
  readonly startedAt: number;
  readonly endedAt: number;
}): number => {
  const joinedAt = Math.max(input.joinedAt, input.startedAt);
  const seconds = input.endedAt - joinedAt;
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.round(seconds);
};

export const calculateGroupFightDurationSeconds = (input: {
  readonly startedAt: number;
  readonly endedAt: number;
}): number => {
  const seconds = input.endedAt - input.startedAt;
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.round(seconds);
};
