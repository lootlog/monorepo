import { selectEventWrappedLeader } from "./select-event-wrapped-leader.js";

const candidate = (
  memberId: number,
  name: string,
  primaryValue: number,
  secondaryValue = 0,
) => ({
  memberId,
  name,
  avatar: null,
  primaryValue,
  secondaryValue,
});

describe("selectEventWrappedLeader", () => {
  it("returns a unique positive winner with evidence", () => {
    const result = selectEventWrappedLeader(
      [candidate(1, "Ada", 12, 3), candidate(2, "Bartek", 7, 2)],
      (entry) => entry.primaryValue,
      (entry) => entry.secondaryValue,
    );

    expect(result).toEqual({
      winner: {
        memberId: 1,
        name: "Ada",
        avatar: null,
        primaryValue: 12,
        secondaryValue: 3,
      },
      candidateCount: 2,
      tiedWinnerCount: 1,
    });
  });

  it("does not choose a winner from an empty candidate set", () => {
    expect(selectEventWrappedLeader([], (entry) => entry.primaryValue)).toEqual(
      {
        winner: null,
        candidateCount: 0,
        tiedWinnerCount: 0,
      },
    );
  });

  it("does not choose a non-positive winner", () => {
    expect(
      selectEventWrappedLeader(
        [candidate(1, "Ada", 0), candidate(2, "Bartek", -1)],
        (entry) => entry.primaryValue,
      ),
    ).toEqual({
      winner: null,
      candidateCount: 2,
      tiedWinnerCount: 1,
    });
  });

  it("reports a tie instead of breaking it with a secondary value", () => {
    const result = selectEventWrappedLeader(
      [candidate(1, "Ada", 5, 8), candidate(2, "Bartek", 5, 2)],
      (entry) => entry.primaryValue,
      (entry) => entry.secondaryValue,
    );

    expect(result).toEqual({
      winner: null,
      candidateCount: 2,
      tiedWinnerCount: 2,
    });
  });

  it("excludes candidates with non-finite primary values", () => {
    const result = selectEventWrappedLeader(
      [candidate(1, "Ada", Number.NaN), candidate(2, "Bartek", 4)],
      (entry) => entry.primaryValue,
    );

    expect(result.candidateCount).toBe(1);
    expect(result.winner?.name).toBe("Bartek");
  });

  it("omits a non-finite secondary value without rejecting the candidate", () => {
    const result = selectEventWrappedLeader(
      [candidate(1, "Ada", 4, Number.POSITIVE_INFINITY)],
      (entry) => entry.primaryValue,
      (entry) => entry.secondaryValue,
    );

    expect(result.winner?.secondaryValue).toBeNull();
  });
});
