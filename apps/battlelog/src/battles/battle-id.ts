// A battle ID is a UUIDv7 whose first 48 bits are the battle's `createdAt` in
// Unix milliseconds, so ordering by ID orders battles by when they were saved.
// The database enforces that both values agree.

const BATTLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isBattleId = (value: string) => BATTLE_ID_PATTERN.test(value);

/** `createdAt` is truncated to milliseconds, the precision the ID keeps. */
export const createBattleId = (now: number) => ({
  id: Bun.randomUUIDv7("hex", now),
  createdAt: new Date(now),
});

// TimescaleDB compares its UUID partition column only with UUIDv7 values, so a
// bound is the smallest or largest UUIDv7 of its millisecond.
const boundaryId = (time: Date, tail: string) => {
  const prefix = time.getTime().toString(16).padStart(12, "0");

  return `${prefix.slice(0, 8)}-${prefix.slice(8)}-${tail}`;
};

/** Every battle saved at or after `time` has an ID greater than or equal to this. */
export const firstBattleIdAt = (time: Date) =>
  boundaryId(time, "7000-8000-000000000000");

/** Every battle saved at or before `time` has an ID less than or equal to this. */
export const lastBattleIdAt = (time: Date) =>
  boundaryId(time, "7fff-bfff-ffffffffffff");
