/** Small deterministic helpers shared by the aura simulation and its renderer. */

export type Rng = () => number;

/** Seeded PRNG (mulberry32): same seed, same particles, so tests can pin behaviour. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

export function range(rng: Rng, [min, max]: readonly [number, number]): number {
  return min + (max - min) * rng();
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;

  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1, 1]; `seed` picks an independent curve. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);

  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
}

/**
 * Lub-dub heartbeat in [0, 1]: a strong beat at the start of each `period` and a weaker
 * one a fifth of the period later, each a fast attack with an exponential release.
 */
export function heartbeat(time: number, period: number): number {
  const phase = (((time % period) + period) % period) / period;

  const beat = (at: number, strength: number) => {
    const d = phase - at;

    if (d < 0) return 0;

    return strength * Math.exp(-d * 22) * Math.min(1, d * 60);
  };

  return clamp(beat(0, 1) + beat(0.2, 0.65), 0, 1);
}

/** Alpha envelope over a life in [0, 1]: fade in over `fadeIn`, out over the last `fadeOut`. */
export function envelope(age: number, fadeIn: number, fadeOut: number): number {
  if (age < fadeIn) return fadeIn > 0 ? age / fadeIn : 1;

  if (age > 1 - fadeOut)
    return fadeOut > 0 ? Math.max(0, (1 - age) / fadeOut) : 0;

  return 1;
}

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace("#", ""), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgba([r, g, b]: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1).toFixed(3)})`;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

/** Colour along a multi-stop ramp, `t` in [0, 1]. */
export function ramp(stops: readonly Rgb[], t: number): Rgb {
  const only = stops[0];

  if (stops.length === 1 && only) return only;
  const scaled = clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const from = stops[i];
  const to = stops[i + 1];

  if (!from || !to) {
    throw new RangeError("A colour ramp needs stops and a finite position.");
  }

  return mixRgb(from, to, scaled - i);
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const channel = (t: number) => {
    const x = ((t % 1) + 1) % 1;

    if (x < 1 / 6) return p + (q - p) * 6 * x;

    if (x < 1 / 2) return q;

    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;

    return p;
  };

  return [
    Math.round(channel(hue + 1 / 3) * 255),
    Math.round(channel(hue) * 255),
    Math.round(channel(hue - 1 / 3) * 255),
  ];
}
