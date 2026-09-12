import type { Timer } from "@/api/timers.api";

/** Margonem type reserved for timers created by hand; they have no NPC record. */
export const MANUAL_TIMER_MARGONEM_TYPE = 999;

export const isManualTimer = (timer: Pick<Timer, "npc">) =>
  Number(timer.npc.margonemType) === MANUAL_TIMER_MARGONEM_TYPE;
