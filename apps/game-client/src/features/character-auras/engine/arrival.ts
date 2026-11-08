/**
 * An admin's arrival on the map: the aura bursts and the giant rises behind the admin.
 * Every `PULSE_EVERY` seconds after, a shorter, fainter pulse of the same.
 */

/** Seconds from the aura showing: rising by `RISE`, the burst at `ARRIVAL_BURST`, gone by `END`. */
const RISE = 0.5;

export const ARRIVAL_BURST = 0.55;

const FADE = 2.6;

const END = 3.6;

/** Seconds between the pulses that follow the arrival. */
const PULSE_EVERY = 30;

/** A pulse runs its timeline this much faster than the arrival, and this much fainter. */
const PULSE_SPEED = 1.6;

const PULSE_STRENGTH = 0.6;

/**
 * Where the aura's event stands `age` seconds after it showed: the arrival's timeline
 * second `t` and the event's `strength`; null between events.
 */
function mapEvent(age: number): { t: number; strength: number } | null {
  const pulse = Math.floor(age / PULSE_EVERY);
  const since = age - pulse * PULSE_EVERY;
  const t = pulse === 0 ? since : since * PULSE_SPEED;

  if (t >= END) return null;

  return { t, strength: pulse === 0 ? 1 : PULSE_STRENGTH };
}

/** Whether an event starts between `before` and `age` seconds: a pulse after the arrival. */
export function pulseStarted(before: number, age: number): boolean {
  return Math.floor(age / PULSE_EVERY) > Math.floor(before / PULSE_EVERY);
}

/** How strong an event is `t` seconds into its timeline, 0..1. */
function strengthAt(t: number): number {
  if (t >= END) return 0;

  if (t < RISE) return t / RISE;

  if (t < FADE) return 1;

  return 1 - (t - FADE) / (END - FADE);
}

/** How strong the aura's events are `age` seconds after it showed, 0..1. */
export function eventStrength(age: number): number {
  const event = mapEvent(age);

  return event ? strengthAt(event.t) * event.strength : 0;
}
