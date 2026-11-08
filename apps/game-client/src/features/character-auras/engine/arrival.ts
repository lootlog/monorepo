/**
 * An admin's arrival on the map, summoned at their feet as the aura bursts. Every
 * `PULSE_EVERY` seconds after, a shorter, fainter pulse of the same.
 */

/** Seconds from the aura showing to its burst, and to the arrival's end. */
export const ARRIVAL_BURST = 0.55;

const ARRIVAL_LENGTH = 2;

/** Seconds between the pulses that follow the arrival. */
const PULSE_EVERY = 30;

/** A pulse runs its timeline this much faster than the arrival, and this much fainter. */
const PULSE_SPEED = 1.6;

const PULSE_STRENGTH = 0.6;

/**
 * Where the aura's event stands `age` seconds after it showed: the arrival's timeline
 * second `t` and the event's `strength`; null between events.
 */
export function arrivalEvent(
  age: number,
): { t: number; strength: number } | null {
  const pulse = Math.floor(age / PULSE_EVERY);
  const since = age - pulse * PULSE_EVERY;
  const t = pulse === 0 ? since : since * PULSE_SPEED;

  if (t >= ARRIVAL_LENGTH) return null;

  return { t, strength: pulse === 0 ? 1 : PULSE_STRENGTH };
}

/** Whether an event starts between `before` and `age` seconds: a pulse after the arrival. */
export function pulseStarted(before: number, age: number): boolean {
  return Math.floor(age / PULSE_EVERY) > Math.floor(before / PULSE_EVERY);
}
