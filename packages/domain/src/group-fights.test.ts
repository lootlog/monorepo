import { describe, expect, it } from "bun:test";
import {
  calculateGroupFightDurationSeconds,
  calculateGroupFightParticipationSeconds,
  countGroupFightTeamSizes,
  isGroupFightComposition,
  isQualifyingGroupFightComposition,
  resolveGroupFightCollectionMode,
  parseGroupFightOutcomeMove,
  resolveGroupFightParticipantResult,
  resolveGroupFightResolution,
  resolveGroupFightTeamFromNames,
} from "./group-fights.js";
import {
  isGroupFightMap,
  isQualifyingGroupFightMap,
} from "./group-fight-maps.js";

const team = (size: number, teamId: number, fled = false) =>
  Array.from({ length: size }, () => ({ team: teamId, fled }));

describe("group fight composition", () => {
  it("counts participants per team", () => {
    expect(countGroupFightTeamSizes([...team(10, 1), ...team(2, 2)])).toEqual({
      teamOne: 10,
      teamTwo: 2,
    });
  });

  it.each([
    [2, 1, true],
    [1, 2, true],
    [10, 1, true],
    [1, 10, true],
    [1, 1, false],
    [10, 0, false],
    [11, 5, false],
    [2.5, 2, false],
  ])("validates %sv%s composition", (teamOne, teamTwo, expected) => {
    expect(isGroupFightComposition({ teamOne, teamTwo })).toBe(expected);
  });

  it.each([
    [8, 8, true],
    [10, 9, true],
    [9, 10, true],
    [10, 8, true],
    [8, 10, true],
    [10, 10, true],
    [9, 9, true],
    [8, 7, false],
    [10, 7, false],
    [7, 10, false],
    [10, 1, false],
    [11, 8, false],
  ])("applies the default threshold to %sv%s", (teamOne, teamTwo, expected) => {
    expect(isQualifyingGroupFightComposition({ teamOne, teamTwo })).toBe(
      expected,
    );
  });

  it.each([
    [2, 1, true],
    [1, 2, true],
    [10, 1, true],
    [1, 10, true],
    [2, 2, true],
    [8, 8, true],
    [10, 10, true],
    [1, 1, false],
    [0, 10, false],
    [10, 11, false],
  ])("applies ALL mode to %sv%s", (teamOne, teamTwo, expected) => {
    expect(isQualifyingGroupFightComposition({ teamOne, teamTwo }, "ALL")).toBe(
      expected,
    );
  });

  it("maps the organization toggle to a mode", () => {
    expect(resolveGroupFightCollectionMode(false)).toBe("FULL_TEAMS");
    expect(resolveGroupFightCollectionMode(true)).toBe("ALL");
  });
});

describe("group fight resolution", () => {
  it("credits the logged winner", () => {
    expect(
      resolveGroupFightResolution({
        winningTeam: 2,
        participants: [...team(2, 1), ...team(2, 2)],
      }),
    ).toEqual({ outcome: "TEAM_WON", effectiveWinningTeam: 2 });
  });

  it("credits the side that did not flee when there is no winner", () => {
    expect(
      resolveGroupFightResolution({
        winningTeam: null,
        participants: [...team(2, 1), ...team(1, 2), ...team(1, 2, true)],
      }),
    ).toEqual({ outcome: "NO_WINNER", effectiveWinningTeam: 1 });
  });

  it("treats no winner without escapes or with escapes on both sides as a draw", () => {
    expect(
      resolveGroupFightResolution({
        winningTeam: null,
        participants: [...team(2, 1), ...team(2, 2)],
      }),
    ).toEqual({ outcome: "NO_WINNER", effectiveWinningTeam: null });
    expect(
      resolveGroupFightResolution({
        winningTeam: null,
        participants: [...team(1, 1, true), ...team(1, 2, true)],
      }),
    ).toEqual({ outcome: "NO_WINNER", effectiveWinningTeam: null });
  });

  it("maps participant results", () => {
    expect(
      resolveGroupFightParticipantResult({ team: 1, fled: false }, 1),
    ).toBe("WIN");
    expect(
      resolveGroupFightParticipantResult({ team: 2, fled: false }, 1),
    ).toBe("LOSS");
    expect(resolveGroupFightParticipantResult({ team: 2, fled: true }, 1)).toBe(
      "FLEE",
    );
    expect(
      resolveGroupFightParticipantResult({ team: 2, fled: false }, null),
    ).toBe("DRAW");
  });
});

describe("group fight outcome rows", () => {
  it("parses winner rows with unknown and named winners", () => {
    expect(parseGroupFightOutcomeMove("0;0;winner=?")).toEqual({
      kind: "winner",
      names: [],
    });
    expect(parseGroupFightOutcomeMove("0;0;winner=Zbójnik, Łucznik")).toEqual({
      kind: "winner",
      names: ["Zbójnik", "Łucznik"],
    });
  });

  it("parses flee rows with the actor id", () => {
    expect(parseGroupFightOutcomeMove("1485905=100.00;0;flee")).toEqual({
      kind: "flee",
      actorId: "1485905",
    });
  });

  it("ignores regular combat rows", () => {
    expect(
      parseGroupFightOutcomeMove("1489098=100.00;1491861=88.53;+dmgd=2356"),
    ).toBeNull();
  });

  it("resolves the team from winner names and ids", () => {
    const warriors = [
      { id: "1", name: "Łucznik", team: 1 },
      { id: "2", name: "Mag", team: 1 },
      { id: "3", name: "Wojownik", team: 2 },
    ];
    expect(resolveGroupFightTeamFromNames(["lucznik", "Mag"], warriors)).toBe(
      1,
    );
    expect(resolveGroupFightTeamFromNames(["3"], warriors)).toBe(2);
    expect(resolveGroupFightTeamFromNames([], warriors)).toBeNull();
    expect(
      resolveGroupFightTeamFromNames(
        ["Same  Name"],
        [{ id: "4", name: "Same Name", team: 2 }],
      ),
    ).toBe(2);
  });
});

describe("group fight timing", () => {
  it("measures duration and participation in whole seconds", () => {
    expect(
      calculateGroupFightDurationSeconds({
        startedAt: 1788688596.4,
        endedAt: 1788688627.4,
      }),
    ).toBe(31);
    expect(
      calculateGroupFightParticipationSeconds({
        joinedAt: 1788688610,
        startedAt: 1788688596.4,
        endedAt: 1788688627.4,
      }),
    ).toBe(17);
    expect(
      calculateGroupFightParticipationSeconds({
        joinedAt: 1788688500,
        startedAt: 1788688596.4,
        endedAt: 1788688627.4,
      }),
    ).toBe(31);
  });
});

describe("group fight map catalog", () => {
  it("requires a red map and catalog membership or an observed elite II or titan", () => {
    expect(isQualifyingGroupFightMap({ name: "Sala Tronowa", pvp: 2 })).toBe(
      true,
    );
    for (const pvp of [0, 1, undefined]) {
      expect(
        isQualifyingGroupFightMap({
          name: "Sala Tronowa",
          pvp,
          observedNpcWeight: 100,
        }),
      ).toBe(false);
    }
    for (const observedNpcWeight of [20, 29, 100]) {
      expect(
        isQualifyingGroupFightMap({
          name: "Unknown map",
          pvp: 2,
          observedNpcWeight,
        }),
      ).toBe(true);
    }
    for (const observedNpcWeight of [
      10,
      30,
      80,
      90,
      Number.POSITIVE_INFINITY,
      undefined,
    ]) {
      expect(
        isQualifyingGroupFightMap({
          name: "Unknown map",
          pvp: 2,
          observedNpcWeight,
        }),
      ).toBe(false);
    }
  });
  it("matches catalog maps ignoring case, spacing and diacritics", () => {
    expect(isGroupFightMap("Sala Tronowa")).toBe(true);
    expect(isGroupFightMap("  sala   tronowa ")).toBe(true);
    expect(isGroupFightMap("Zrodlo Wspomnien")).toBe(true);
    expect(isGroupFightMap("Ithan")).toBe(false);
    expect(isGroupFightMap(null)).toBe(false);
  });
});
