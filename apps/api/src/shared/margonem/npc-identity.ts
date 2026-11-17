import { randomInt } from "node:crypto";

// Margonem runtime ids stay far below this bound; ids Lootlog derives from a
// Margonem NPC live in `@lootlog/domain/npc-identity`.
const MIN_MANUAL_TIMER_NPC_ID = 1_000_000_000;

const MAX_INTEGER_COLUMN = 2_147_483_647;

/** A new id for a manual timer, which has no Margonem NPC behind it. */
export const newManualTimerNpcId = (): number =>
  randomInt(MIN_MANUAL_TIMER_NPC_ID, MAX_INTEGER_COLUMN);
