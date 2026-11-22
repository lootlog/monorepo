const BATTLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isBattleId = (value: string) => BATTLE_ID_PATTERN.test(value);

export const createBattleId = (now: number) => ({
  id: Bun.randomUUIDv7("hex", now),
  createdAt: new Date(now),
});

const boundaryId = (time: Date, tail: string) => {
  const prefix = time.getTime().toString(16).padStart(12, "0");

  return `${prefix.slice(0, 8)}-${prefix.slice(8)}-${tail}`;
};

export const firstBattleIdAt = (time: Date) =>
  boundaryId(time, "7000-8000-000000000000");

export const lastBattleIdAt = (time: Date) =>
  boundaryId(time, "7fff-bfff-ffffffffffff");
