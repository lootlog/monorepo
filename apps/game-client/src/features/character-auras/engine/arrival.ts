export const ARRIVAL_BURST = 0.55;

const ARRIVAL_LENGTH = 2;

const PULSE_EVERY = 30;

const PULSE_SPEED = 1.6;

const PULSE_STRENGTH = 0.6;

export function arrivalEvent(
  age: number,
): { t: number; strength: number } | null {
  const pulse = Math.floor(age / PULSE_EVERY);
  const since = age - pulse * PULSE_EVERY;
  const t = pulse === 0 ? since : since * PULSE_SPEED;

  if (t >= ARRIVAL_LENGTH) return null;

  return { t, strength: pulse === 0 ? 1 : PULSE_STRENGTH };
}

export function pulseStarted(before: number, age: number): boolean {
  return Math.floor(age / PULSE_EVERY) > Math.floor(before / PULSE_EVERY);
}
