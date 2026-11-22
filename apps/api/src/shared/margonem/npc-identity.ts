import { randomInt } from "node:crypto";

const MIN_MANUAL_TIMER_NPC_ID = 1_000_000_000;

const MAX_INTEGER_COLUMN = 2_147_483_647;

export const newManualTimerNpcId = (): number =>
  randomInt(MIN_MANUAL_TIMER_NPC_ID, MAX_INTEGER_COLUMN);
