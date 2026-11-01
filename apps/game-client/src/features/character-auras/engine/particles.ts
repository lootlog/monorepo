import { clamp, noise1, range, TAU, type Rng } from "./math";

/** How a particle moves and how the renderer draws it. */
export type ParticleKind =
  | "mote"
  | "ember"
  | "spark"
  | "glint"
  | "flake"
  | "bubble"
  | "leaf"
  | "feather"
  | "shard"
  | "smoke"
  | "wisp"
  | "firefly"
  | "ring"
  | "drop"
  | "grain"
  | "rock"
  | "bat"
  | "dust"
  | "scorch"
  | "puddle"
  | "print";

/**
 * What a falling particle does when it reaches the ground:
 * - `vanish`: dies there;
 * - `bounce`: bounces with restitution until it rests, then settles;
 * - `settle`: lies where it lands for a few seconds (leaves, snow, sand);
 * - `splash`: bursts into droplets and a ripple;
 * - `shatter`: bounces once, then breaks into smaller pieces;
 * - `scorch`: bounces once, then leaves a glowing mark that cools;
 * - `puddle`: joins or starts a puddle that bubbles and dries.
 */
export type LandMode =
  | "none"
  | "vanish"
  | "bounce"
  | "settle"
  | "splash"
  | "shatter"
  | "scorch"
  | "puddle";

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds lived and total; the particle dies when `age >= life`. */
  age: number;
  life: number;
  size: number;
  /** Index into the preset's particle palette. */
  color: number;
  rot: number;
  spin: number;
  /** Per-particle phase for sway, blink and flutter. */
  seed: number;
  /** Drawn over the character (true) or behind it. */
  front: boolean;
  gravity: number;
  drag: number;
  sway: number;
  /** Vertical scale of rings, < 1 lays them flat on the ground. */
  squash: number;
  /** Spawns a `ring` where it dies (bubbles popping). */
  pop: boolean;
  /** Ground height under the particle in particle space; Infinity where there is no ground (tooltips). */
  floor: number;
  land: LandMode;
  /** Lying on the ground: no motion until kicked. */
  settled: boolean;
  bounces: number;
  /** How strongly wind carries it, 0..1. */
  wind: number;
  /** Pull towards the nearest attractor, px/s² at 10 px. */
  attract: number;
}

/** A point on the shape's outline with its outward normal. */
export interface EdgeSite {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

/**
 * Where particles may spawn this frame and what moves them, in particle space (world pixels
 * for characters, overlay pixels for tooltips).
 */
export interface SpawnFrame {
  /** Outline sites, relative to (`ox`, `oy`) so a cached shape needs no copy per frame. */
  edge: readonly EdgeSite[];
  ox: number;
  oy: number;
  /** Ellipse on the ground under the feet. */
  feet: { x: number; y: number; rx: number; ry: number };
  /** Opaque bounds of the shape. */
  body: { x: number; y: number; w: number; h: number };
  center: { x: number; y: number };
  /** Whether there is ground to land on (characters) or not (tooltips). */
  ground: boolean;
  /** The character's velocity, px/s: walking kicks up what lies and drags what floats. */
  motion: { vx: number; vy: number };
  /** Points that pull `attract` particles, e.g. the orbiting stars. */
  attractors?: readonly { x: number; y: number }[];
  /** Where rain falls from, e.g. a cloud over the head. */
  cloud?: { x: number; y: number; w: number };
  /** Steady wind, px/s, added to the gusts. */
  wind?: number;
}

/** `above`: a band over the head; `cloud`: under the frame's cloud; `orbit`: on a circle round the centre. */
export type SpawnFrom =
  | "edge"
  | "edge-low"
  | "edge-high"
  | "edge-under"
  | "feet"
  | "feet-rim"
  | "body"
  | "above"
  | "cloud"
  | "orbit"
  | "around";

export interface EmitterSpec {
  kind: ParticleKind;
  /** Particles per second at intensity 1. */
  rate: number;
  from: SpawnFrom;
  life: readonly [number, number];
  speed: readonly [number, number];
  /** Direction in radians (screen space, -π/2 is up) and the spread around it. */
  dir?: number;
  spread?: number;
  /** 0..1 blend of the direction towards the spawn site's outward normal. */
  outward?: number;
  /** px/s², positive falls. */
  gravity?: number;
  /** Fraction of velocity lost per second. */
  drag?: number;
  size: readonly [number, number];
  /** How many colours of the preset palette this emitter picks from, from `colorFrom`. */
  colors?: number;
  colorFrom?: number;
  /** Probability of drawing over the character. */
  front?: number;
  /** Horizontal wobble acceleration, px/s². */
  sway?: number;
  spin?: readonly [number, number];
  squash?: number;
  pop?: boolean;
  /** `around`/`orbit`: distance from the centre. */
  radius?: readonly [number, number];
  swirl?: number;
  land?: LandMode;
  wind?: number;
  attract?: number;
  /** Only round characters, never on a tooltip (things that would cross its text). */
  groundOnly?: boolean;
}

/** Upper bound per aura, so a long frame hitch can't flood the field. */
export const MAX_PARTICLES = 260;

/** Gusts plus the frame's steady wind, px/s, the same for every particle at a time. */
export function windAt(time: number, steady = 0): number {
  return steady + noise1(time * 0.25, 77) * 18 + noise1(time * 1.1, 78) * 6;
}

/** Below this speed, px/s, the character counts as standing. */
const WALKING = 8;

/** Orbit strength of `rock` debris: acceleration GM / r². */
const ROCK_GM = 9000;

export class ParticleField {
  readonly particles: Particle[] = [];
  private readonly carry: number[] = [];
  /** Particles born inside `step` (splashes, shards, bubbles), added once it finishes. */
  private readonly born: Particle[] = [];

  constructor(private readonly rng: Rng) {}

  /** Spawns by rate, then advances every particle by `dt` seconds. */
  update(
    dt: number,
    emitters: readonly EmitterSpec[],
    frame: SpawnFrame | null,
    intensity: number,
    time: number,
  ): void {
    const step = clamp(dt, 0, 0.1);

    if (frame) {
      for (const [i, spec] of emitters.entries()) {
        if (spec.groundOnly && !frame.ground) continue;

        const due =
          (this.carry[i] ?? this.rng()) + spec.rate * intensity * step;

        const count = Math.floor(due);
        this.carry[i] = due - count;
        this.emit(spec, frame, count);
      }
    }

    this.step(step, frame, time);
  }

  emit(spec: EmitterSpec, frame: SpawnFrame, count: number): void {
    if (spec.groundOnly && !frame.ground) return;

    for (let n = 0; n < count && this.particles.length < MAX_PARTICLES; n++)
      this.particles.push(this.spawn(spec, frame));
  }

  /** Adds a ready-made particle, e.g. a footprint. */
  add(p: Particle): void {
    if (this.particles.length < MAX_PARTICLES) this.particles.push(p);
  }

  clear(): void {
    this.particles.length = 0;
  }

  /** Moves every particle by `dx`, `dy`, used when particle space jumps (map change). */
  shift(dx: number, dy: number): void {
    for (const p of this.particles) {
      p.x += dx;
      p.y += dy;
      p.floor += dy;
    }
  }

  private spawn(spec: EmitterSpec, frame: SpawnFrame): Particle {
    const rng = this.rng;
    const { x, y, vx, vy } = launch(spec, frame, rng);
    const colors = Math.max(1, spec.colors ?? 1);
    const land = frame.ground ? (spec.land ?? "none") : "none";

    // The ground under a particle is somewhere on the feet ellipse's depth, never above where it starts.
    const floor =
      land === "none"
        ? Infinity
        : Math.max(frame.feet.y + (rng() * 2 - 1) * frame.feet.ry * 0.9, y + 2);

    return {
      kind: spec.kind,
      x,
      y,
      vx,
      vy,
      age: 0,
      life: range(rng, spec.life),
      size: range(rng, spec.size),
      color: (spec.colorFrom ?? 0) + Math.floor(rng() * colors),
      rot: rng() * TAU,
      spin: spec.spin ? range(rng, spec.spin) : 0,
      seed: rng() * 1000,
      front: rng() < (spec.front ?? 0.5),
      gravity: spec.gravity ?? 0,
      drag: spec.drag ?? 0,
      sway: spec.sway ?? 0,
      squash: spec.squash ?? 1,
      pop: spec.pop ?? false,
      floor,
      land,
      settled: false,
      bounces: 0,
      wind: spec.wind ?? 0,
      attract: spec.attract ?? 0,
    };
  }

  private step(dt: number, frame: SpawnFrame | null, time: number): void {
    const list = this.particles;
    const wind = windAt(time, frame?.wind);

    const moving =
      !!frame && Math.hypot(frame.motion.vx, frame.motion.vy) > WALKING;

    const bats = list.filter((p) => p.kind === "bat");

    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];

      if (!p) continue;
      p.age += dt;

      if (p.age >= p.life) {
        if (p.pop && !p.settled) this.born.push(popRing(p));
        removeAt(list, i);
        continue;
      }

      if (p.settled) {
        if (moving && frame && underFoot(p, frame)) this.kick(p, frame);
        else continue;
      }

      if (frame) steer(p, bats, frame, time, dt);
      drift(p, frame, wind, moving, dt);

      if (p.y >= p.floor && p.vy > 0) this.landed(p, list, i);
    }

    for (const p of this.born.splice(0))
      if (list.length < MAX_PARTICLES) list.push(p);
  }

  /** The ground response; may remove `p` (index `i`) from `list`. */
  private landed(p: Particle, list: Particle[], i: number): void {
    const rng = this.rng;

    const remove = () => removeAt(list, i);

    p.y = p.floor;

    const bounce = (restitution: number) => {
      p.vy = -p.vy * restitution;
      p.vx *= 0.7;
      p.spin *= 0.6;
      p.bounces++;
    };

    switch (p.land) {
      case "none":
        return;
      case "vanish":
        remove();

        return;
      case "bounce":
        bounce(0.5);

        if (Math.abs(p.vy) < 14) this.settle(p, 1.5);

        return;
      case "settle":
        this.settle(p, 2.5 + rng() * 2.5);

        return;
      case "shatter":
        if (p.bounces < 1) {
          bounce(0.55);

          return;
        }

        // Breaks into three smaller pieces flying apart, which vanish when they land.
        for (let k = 0; k < 3; k++) {
          this.born.push({
            ...p,
            size: p.size * 0.5,
            vx: (rng() - 0.5) * 60,
            vy: -20 - rng() * 30,
            age: 0,
            life: 0.6,
            land: "vanish",
            bounces: 9,
            gravity: 220,
            spin: (rng() - 0.5) * 12,
          });
        }

        remove();

        return;
      case "splash":
        // A ripple where it hit and two droplets thrown back up, which vanish on landing.
        this.born.push({
          ...p,
          kind: "ring",
          vx: 0,
          vy: 0,
          age: 0,
          life: 0.45,
          size: 3 + p.size,
          squash: 0.36,
          land: "none",
          front: false,
          pop: false,
          gravity: 0,
        });

        for (let k = 0; k < 2; k++) {
          this.born.push({
            ...p,
            size: 1,
            vx: (k ? 1 : -1) * (12 + rng() * 18),
            vy: -30 - rng() * 25,
            age: 0,
            life: 0.5,
            land: "vanish",
            gravity: 240,
            pop: false,
          });
        }

        remove();

        return;
      case "scorch":
        if (p.bounces < 1) {
          bounce(0.4);

          return;
        }

        this.born.push(decal(p, "scorch", 1.8 + rng() * 1.2));
        remove();

        return;
      case "puddle": {
        // Drops close to an existing puddle feed it; otherwise a new one starts.
        const pool = list.find(
          (q) =>
            q.kind === "puddle" &&
            Math.abs(q.x - p.x) < 5 + q.size &&
            Math.abs(q.y - p.y) < 3,
        );

        if (pool) {
          pool.size = Math.min(6, pool.size + 0.5);
          pool.life = Math.max(pool.life, pool.age + 2.5);
        } else {
          this.born.push(decal(p, "puddle", 3 + rng()));
        }

        remove();
      }
    }
  }

  private settle(p: Particle, seconds: number): void {
    p.settled = true;
    p.vx = 0;
    p.vy = 0;
    p.spin = 0;
    p.front = false;
    p.life = Math.max(p.life, p.age + seconds);
  }

  /** Feet walking through lying things toss them up, forward with the stride. */
  private kick(p: Particle, frame: SpawnFrame): void {
    const rng = this.rng;
    p.settled = false;
    p.vy = -(25 + rng() * 35);
    p.vx = frame.motion.vx * 0.7 + (rng() - 0.5) * 30;
    p.spin = (rng() - 0.5) * 8;
    p.bounces = 0;

    if (p.land === "none") p.land = "settle";
  }

  /** Puddles bubble now and then. */
  bubbleUp(dt: number): void {
    for (const p of this.particles) {
      if (
        p.kind !== "puddle" ||
        this.rng() > dt * 1.4 ||
        this.particles.length >= MAX_PARTICLES
      )
        continue;
      this.particles.push({
        ...p,
        kind: "bubble",
        settled: false,
        land: "none",
        floor: Infinity,
        x: p.x + (this.rng() - 0.5) * p.size * 2,
        vy: -8,
        vx: 0,
        age: 0,
        life: 0.5,
        size: 1,
        pop: true,
        gravity: 0,
      });
    }
  }
}

function decal(
  p: Particle,
  kind: "scorch" | "puddle" | "print",
  life: number,
): Particle {
  return {
    ...p,
    kind,
    vx: 0,
    vy: 0,
    age: 0,
    life,
    settled: true,
    land: "none",
    front: false,
    pop: false,
    spin: 0,
    gravity: 0,
    size: kind === "puddle" ? 2 : p.size,
  };
}

/** A footprint decal at a point on the ground. */
export function footprint(
  x: number,
  y: number,
  side: number,
  life: number,
  color: number,
): Particle {
  return {
    kind: "print",
    x,
    y,
    vx: 0,
    vy: 0,
    age: 0,
    life,
    size: 1,
    color,
    rot: side,
    spin: 0,
    seed: 0,
    front: false,
    gravity: 0,
    drag: 0,
    sway: 0,
    squash: 1,
    pop: false,
    floor: y,
    land: "none",
    settled: true,
    bounces: 0,
    wind: 0,
    attract: 0,
  };
}

function underFoot(p: Particle, frame: SpawnFrame): boolean {
  const dx = (p.x - frame.feet.x) / (frame.feet.rx * 0.9);
  const dy = (p.y - frame.feet.y) / (frame.feet.ry * 1.6);

  return dx * dx + dy * dy < 1;
}

function near(p: Particle, body: SpawnFrame["body"], margin: number): boolean {
  return (
    p.x > body.x - margin &&
    p.x < body.x + body.w + margin &&
    p.y > body.y - margin &&
    p.y < body.y + body.h + margin
  );
}

/**
 * Falling-leaf motion: the leaf swings like a pendulum, gliding sideways at the bottom of the
 * swing and sinking fastest at its turning points.
 */
function flutter(p: Particle, dt: number): void {
  const phase = p.age * 3.2 + p.seed;
  const sink = 9 + 16 * Math.abs(Math.cos(phase));

  if (p.gravity >= 0) p.vy += (sink - p.vy) * 3 * dt;
  p.vx += Math.sin(phase) * 46 * dt;
  p.rot = Math.sin(phase) * 0.9;
}

/** Debris round the void: inverse-square gravity towards the centre, softened near it. */
function orbit(p: Particle, frame: SpawnFrame, dt: number): void {
  const dx = frame.center.x - p.x;
  const dy = frame.center.y - p.y;
  const r2 = dx * dx + dy * dy + 40;
  const r = Math.sqrt(r2);
  const a = ROCK_GM / r2;
  p.vx += (dx / r) * a * dt;
  p.vy += (dy / r) * a * dt;
}

/** Pull towards the nearest attractor, falling off with distance. */
function pull(
  p: Particle,
  attractors: readonly { x: number; y: number }[],
  dt: number,
): void {
  let best = attractors[0];
  let bestD = Infinity;

  if (!best) return;

  for (const a of attractors) {
    const d = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;

    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }

  const d = Math.sqrt(bestD) + 1;
  const a = (p.attract * 100) / (bestD + 100);
  p.vx += ((best.x - p.x) / d) * a * dt;
  p.vy += ((best.y - p.y) / d) * a * dt;
}

/**
 * Bats as a small flock: each seeks its own point on a wobbling ring above the head, keeps
 * away from its neighbours and caps its speed, so they wheel round together.
 */
function flock(
  p: Particle,
  bats: readonly Particle[],
  frame: SpawnFrame,
  time: number,
  dt: number,
): void {
  const angle = time * 1.1 + (p.seed % TAU);
  const tx = frame.center.x + Math.cos(angle) * (frame.body.w * 0.8 + 14);
  const ty = frame.body.y - 6 + Math.sin(angle * 2) * 8;
  p.vx += (tx - p.x) * 3 * dt;
  p.vy += (ty - p.y) * 3 * dt;

  for (const q of bats) {
    if (q === p) continue;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const d2 = dx * dx + dy * dy;

    if (d2 < 64 && d2 > 0) {
      p.vx += (dx / d2) * 300 * dt;
      p.vy += (dy / d2) * 300 * dt;
    }
  }

  const speed = Math.hypot(p.vx, p.vy);

  if (speed > 48) {
    p.vx *= 48 / speed;
    p.vy *= 48 / speed;
  }

  p.front = Math.sin(angle) > 0;
}

function pickSite(
  from: SpawnFrom,
  frame: SpawnFrame,
  rng: Rng,
): EdgeSite | null {
  const { feet, body } = frame;

  switch (from) {
    case "edge":
    case "edge-low":
    case "edge-high":
    case "edge-under":
      return pickEdgeSite(from, frame, rng);

    case "feet": {
      const a = rng() * TAU;
      const r = Math.sqrt(rng());

      return {
        x: feet.x + Math.cos(a) * feet.rx * r,
        y: feet.y + Math.sin(a) * feet.ry * r,
        nx: Math.cos(a),
        ny: Math.sin(a),
      };
    }

    case "feet-rim": {
      const a = rng() * TAU;

      return {
        x: feet.x + Math.cos(a) * feet.rx,
        y: feet.y + Math.sin(a) * feet.ry,
        nx: Math.cos(a),
        ny: Math.sin(a),
      };
    }

    case "body":
      return {
        x: body.x + rng() * body.w,
        y: body.y + rng() * body.h,
        nx: 0,
        ny: -1,
      };
    case "above":
      return {
        x: body.x - 12 + rng() * (body.w + 24),
        y: body.y - 32 + rng() * 20,
        nx: 0,
        ny: 1,
      };
    case "cloud": {
      const cloud = frame.cloud;

      if (!cloud)
        return { x: body.x + rng() * body.w, y: body.y - 20, nx: 0, ny: 1 };

      return {
        x: cloud.x - cloud.w / 2 + rng() * cloud.w,
        y: cloud.y,
        nx: 0,
        ny: 1,
      };
    }

    case "orbit":
    case "around":
      return null;
  }
}

/** Low/high take the bottom or top 60% of the outline by y: flames lick from below, motes leave the head. */
function pickEdgeSite(
  from: "edge" | "edge-low" | "edge-high" | "edge-under",
  frame: SpawnFrame,
  rng: Rng,
): EdgeSite | null {
  const { edge, body } = frame;

  if (!edge.length) return null;

  for (let tries = 0; tries < (from === "edge-under" ? 24 : 6); tries++) {
    const site = edge[Math.floor(rng() * edge.length)];

    if (!site) continue;
    const v = (site.y + frame.oy - body.y) / Math.max(1, body.h);

    if (
      from === "edge" ||
      (from === "edge-low" && v > 0.4) ||
      (from === "edge-high" && v < 0.6) ||
      (from === "edge-under" && site.ny > 0.5)
    ) {
      return offset(site, frame);
    }
  }

  const site = edge[Math.floor(rng() * edge.length)];

  return site ? offset(site, frame) : null;
}

function offset(site: EdgeSite, frame: SpawnFrame): EdgeSite {
  return {
    x: site.x + frame.ox,
    y: site.y + frame.oy,
    nx: site.nx,
    ny: site.ny,
  };
}

/** Fireflies drift on smooth noise and are pulled back when they stray from the body. */
function steerFirefly(
  p: Particle,
  frame: SpawnFrame,
  time: number,
  dt: number,
): void {
  const t = time * 0.6 + p.seed;
  const wander = 26;
  p.vx += noise1(t, 1) * wander * dt * 4;
  p.vy += noise1(t, 2) * wander * dt * 4;
  const dx = frame.center.x - p.x;
  const dy = frame.center.y - p.y;
  const reach = Math.max(frame.body.w, frame.body.h) * 0.9;
  const dist = Math.hypot(dx, dy);

  if (dist > reach) {
    const pull = ((dist - reach) / reach) * 60 * dt;
    p.vx += (dx / dist) * pull;
    p.vy += (dy / dist) * pull;
  }

  const speed = Math.hypot(p.vx, p.vy);
  const max = 22;

  if (speed > max) {
    p.vx *= max / speed;
    p.vy *= max / speed;
  }
}

/** Void wisps orbit the centre while falling into it; they die on arrival. */
function swirlInwards(p: Particle, frame: SpawnFrame, dt: number): void {
  const dx = p.x - frame.center.x;
  const dy = p.y - frame.center.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 5) {
    p.age = p.life;

    return;
  }

  const speed = Math.hypot(p.vx, p.vy) || 1;
  // Tangent plus inward pull keeps a spiral whose radius shrinks at a steady pace.
  const tx = -dy / dist;
  const ty = dx / dist;
  const swirl = 1.5;
  const inward = 1;
  const bx = tx * swirl - (dx / dist) * inward;
  const by = ty * swirl - (dy / dist) * inward;
  const len = Math.hypot(bx, by);
  const target = speed * (1 + dt * 0.8);
  p.vx = (bx / len) * target;
  p.vy = (by / len) * target;
}

/** Removes `list[i]` by moving the last particle into its slot. */
function removeAt(list: Particle[], i: number): void {
  const last = list.pop();

  if (last && i < list.length) list[i] = last;
}

/** Where a new particle starts and how fast it moves off. */
interface Launch {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Start of a particle: its site and heading, then the `around` and `rock` overrides. */
function launch(spec: EmitterSpec, frame: SpawnFrame, rng: Rng): Launch {
  const site = pickSite(spec.from, frame, rng);
  const nx = site ? site.nx : 0;
  const ny = site ? site.ny : -1;
  let angle = (spec.dir ?? -Math.PI / 2) + (rng() - 0.5) * (spec.spread ?? 0);
  const outward = spec.outward ?? 0;

  if (outward > 0) {
    const bx = Math.cos(angle) * (1 - outward) + nx * outward;
    const by = Math.sin(angle) * (1 - outward) + ny * outward;
    angle = Math.atan2(by, bx);
  }

  const speed = range(rng, spec.speed);

  let start: Launch = {
    x: site ? site.x : frame.center.x,
    y: site ? site.y : frame.center.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };

  if (spec.from === "around") start = fromRing(spec, frame, speed, rng);

  if (spec.kind === "rock") start = onOrbit(spec, frame, rng);

  return start;
}

/** `around`: a point on a ring round the centre, heading inwards. */
function fromRing(
  spec: EmitterSpec,
  frame: SpawnFrame,
  speed: number,
  rng: Rng,
): Launch {
  const a = rng() * TAU;
  const r = range(rng, spec.radius ?? [30, 40]);

  return {
    x: frame.center.x + Math.cos(a) * r,
    y: frame.center.y + Math.sin(a) * r * 0.8,
    vx: -Math.cos(a) * speed,
    vy: -Math.sin(a) * speed,
  };
}

/** Debris starts on a circular orbit: tangential speed √(GM / r), either way round. */
function onOrbit(spec: EmitterSpec, frame: SpawnFrame, rng: Rng): Launch {
  const a = rng() * TAU;
  const r = range(rng, spec.radius ?? [18, 26]);

  const v =
    Math.sqrt(ROCK_GM / r) * (0.9 + rng() * 0.2) * (rng() < 0.5 ? 1 : -1);

  return {
    x: frame.center.x + Math.cos(a) * r,
    y: frame.center.y + Math.sin(a) * r,
    vx: -Math.sin(a) * v,
    vy: Math.cos(a) * v,
  };
}

/** The kind's own steering: fireflies wander, wisps spiral in, rocks orbit, bats flock. */
function steer(
  p: Particle,
  bats: readonly Particle[],
  frame: SpawnFrame,
  time: number,
  dt: number,
): void {
  if (p.kind === "firefly") steerFirefly(p, frame, time, dt);
  else if (p.kind === "wisp") swirlInwards(p, frame, dt);
  else if (p.kind === "rock") orbit(p, frame, dt);
  else if (p.kind === "bat") flock(p, bats, frame, time, dt);
}

/** Forces every particle feels (attractors, flutter, sway, wind, the walking body, gravity, drag), then the move. */
function drift(
  p: Particle,
  frame: SpawnFrame | null,
  wind: number,
  moving: boolean,
  dt: number,
): void {
  if (p.attract && frame?.attractors?.length) pull(p, frame.attractors, dt);

  if (p.kind === "leaf" || p.kind === "feather") flutter(p, dt);

  if (p.sway) p.vx += Math.cos(p.age * 2.3 + p.seed) * p.sway * dt;

  // Light things relax towards the wind's speed.
  if (p.wind) p.vx += (wind - p.vx) * p.wind * dt;

  // A walking body drags the air round it: what floats close by is pulled along.
  if (moving && frame && near(p, frame.body, 6)) {
    p.vx += frame.motion.vx * 2.2 * dt;
    p.vy += frame.motion.vy * 2.2 * dt;
  }

  p.vy += p.gravity * dt;

  if (p.drag) {
    const keep = Math.max(0, 1 - p.drag * dt);
    p.vx *= keep;
    p.vy *= keep;
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.rot += p.spin * dt;
}

function popRing(p: Particle): Particle {
  return {
    ...p,
    kind: "ring",
    vx: 0,
    vy: 0,
    age: 0,
    life: 0.28,
    size: p.size * 1.6,
    gravity: 0,
    drag: 0,
    sway: 0,
    squash: 1,
    pop: false,
    land: "none",
  };
}
