import type { FightLogRow } from "./fight-battle-log";
import type { FightEvent } from "./fight-events";
import type { FighterSnapshot } from "./fight-snapshot";

export type RecordedEvent = {
  readonly event: FightEvent;
  readonly turn: number;
  readonly after: readonly FighterSnapshot[];
};

type FightTurnEntry = {
  readonly row: number;
  readonly event: FightEvent | null;
};

export type FightTurn = {
  readonly number: number | null;
  readonly phase: "start" | "fight" | "end";
  readonly entries: readonly FightTurnEntry[];
  readonly before: readonly FighterSnapshot[];
  readonly after: readonly FighterSnapshot[];
};

type Group = {
  phase: FightTurn["phase"];
  entries: FightTurnEntry[];
  first: number;
  last: number;
};

const phaseKey = (row: FightLogRow, recorded: readonly RecordedEvent[]) => {
  if (row.event !== null) return `turn-${recorded[row.event]?.turn}`;

  return row.at === 0 ? "start" : "end";
};

export const groupFightTurns = (
  rows: readonly FightLogRow[],
  recorded: readonly RecordedEvent[],
  initial: readonly FighterSnapshot[],
) => {
  const groups = new Map<string, Group>();

  const turnOfRow = rows.map((row, index) => {
    const key = phaseKey(row, recorded);
    const at = row.event ?? (row.at === 0 ? -1 : recorded.length - 1);

    const group = groups.get(key) ?? {
      phase: row.event !== null ? "fight" : row.at === 0 ? "start" : "end",
      entries: [],
      first: at,
      last: at,
    };

    group.entries.push({
      row: index + 1,
      event: row.event === null ? null : (recorded[row.event]?.event ?? null),
    });
    group.last = Math.max(group.last, at);
    groups.set(key, group);

    return [...groups.keys()].indexOf(key);
  });

  const snapshotAfter = (index: number) =>
    index < 0 ? initial : (recorded[index]?.after ?? initial);

  let number = 0;

  const turns = [...groups.values()].map((group): FightTurn => {
    if (group.phase === "fight") number += 1;

    return {
      number: group.phase === "fight" ? number : null,
      phase: group.phase,
      entries: group.entries,
      before:
        group.phase === "fight"
          ? snapshotAfter(group.first - 1)
          : snapshotAfter(group.first),
      after: snapshotAfter(group.last),
    };
  });

  return { turns, turnOfRow };
};
