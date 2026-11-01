import { describe, expect, test } from "vitest";
import { heartbeat, mulberry32, ramp } from "./math";
import {
  MAX_PARTICLES,
  ParticleField,
  type EmitterSpec,
  type SpawnFrame,
} from "./particles";
import { CHARACTER_AURA_IDS } from "@lootlog/schema/character-aura";
import { AURAS } from "./presets";

const frame: SpawnFrame = {
  edge: [
    { x: 0, y: 0, nx: 0, ny: -1 },
    { x: 10, y: 30, nx: 1, ny: 0 },
  ],
  ox: 100,
  oy: 200,
  feet: { x: 110, y: 248, rx: 20, ry: 7 },
  body: { x: 100, y: 200, w: 20, h: 48 },
  center: { x: 110, y: 222 },
  ground: true,
  motion: { vx: 0, vy: 0 },
};

const mote: EmitterSpec = {
  kind: "mote",
  rate: 10,
  from: "edge",
  life: [1, 1],
  speed: [10, 10],
  size: [1, 1],
};

describe("ParticleField", () => {
  test("spawns by rate over time, on the outline offset by the frame origin", () => {
    const field = new ParticleField(mulberry32(1));

    for (let i = 0; i < 10; i++) field.update(0.1, [mote], frame, 1, i * 0.1);
    expect(field.particles.length).toBeGreaterThanOrEqual(9);
    expect(field.particles.length).toBeLessThanOrEqual(11);

    for (const p of field.particles) {
      expect(p.x).toBeGreaterThanOrEqual(99);
      expect(p.y).toBeLessThanOrEqual(231);
    }
  });

  test("scales the rate by intensity and stops spawning without a frame", () => {
    const field = new ParticleField(mulberry32(2));

    for (let i = 0; i < 10; i++) field.update(0.1, [mote], frame, 0.5, i * 0.1);
    expect(field.particles.length).toBeLessThanOrEqual(6);
    const count = field.particles.length;
    field.update(0.1, [mote], null, 1, 1);
    expect(field.particles.length).toBeLessThanOrEqual(count);
  });

  test("removes particles at the end of their life and pops bubbles into rings", () => {
    const field = new ParticleField(mulberry32(3));
    field.emit({ ...mote, kind: "bubble", pop: true }, frame, 3);
    field.update(0.1, [], null, 1, 0);

    for (let i = 0; i < 12; i++) field.update(0.1, [], null, 1, i * 0.1);
    expect(field.particles.every((p) => p.kind === "ring")).toBe(true);

    for (let i = 0; i < 5; i++) field.update(0.1, [], null, 1, 2 + i * 0.1);
    expect(field.particles).toHaveLength(0);
  });

  test("caps the field however long the frame", () => {
    const field = new ParticleField(mulberry32(4));

    for (let i = 0; i < 50; i++)
      field.update(1, [{ ...mote, rate: 500, life: [100, 100] }], frame, 1, i);
    expect(field.particles.length).toBe(MAX_PARTICLES);
  });

  test("void wisps spiral into the centre and die there", () => {
    const field = new ParticleField(mulberry32(5));
    field.emit(
      {
        kind: "wisp",
        rate: 0,
        from: "around",
        radius: [30, 30],
        life: [10, 10],
        speed: [25, 25],
        size: [2, 2],
      },
      frame,
      1,
    );

    const start = Math.hypot(
      field.particles[0]!.x - frame.center.x,
      field.particles[0]!.y - frame.center.y,
    );

    let closest = start;

    for (let i = 0; i < 100 && field.particles.length; i++) {
      field.update(0.05, [], frame, 1, i * 0.05);
      const p = field.particles[0];

      if (p)
        closest = Math.min(
          closest,
          Math.hypot(p.x - frame.center.x, p.y - frame.center.y),
        );
    }

    expect(closest).toBeLessThan(start / 2);
  });
});

describe("math", () => {
  test("heartbeat peaks at the beat and its echo, rests in between", () => {
    expect(heartbeat(0.02, 1)).toBeGreaterThan(0.6);
    expect(heartbeat(0.21, 1)).toBeGreaterThan(0.3);
    expect(heartbeat(0.7, 1)).toBeLessThan(0.05);
  });

  test("ramp interpolates across stops", () => {
    expect(
      ramp(
        [
          [0, 0, 0],
          [255, 255, 255],
        ],
        0.5,
      ),
    ).toEqual([128, 128, 128]);
    expect(
      ramp(
        [
          [0, 0, 0],
          [100, 0, 0],
          [200, 0, 0],
        ],
        1,
      ),
    ).toEqual([200, 0, 0]);
  });
});

describe("presets", () => {
  test("every aura has three tones, a name and particle colours its emitters can index", () => {
    for (const id of CHARACTER_AURA_IDS) {
      const preset = AURAS[id];
      expect(preset.id).toBe(id);
      expect(preset.tones).toHaveLength(3);

      for (const emitter of preset.emitters) {
        expect(
          (emitter.colorFrom ?? 0) + (emitter.colors ?? 1),
        ).toBeLessThanOrEqual(preset.particles.length);
      }
    }
  });
});

describe("physics", () => {
  const fall = (
    land: EmitterSpec["land"],
    extra: Partial<EmitterSpec> = {},
  ): EmitterSpec => ({
    kind: "drop",
    rate: 0,
    from: "body",
    life: [10, 10],
    speed: [0, 0],
    dir: Math.PI / 2,
    gravity: 300,
    size: [1, 1],
    land,
    ...extra,
  });

  test("falling particles stop at the ground under the feet and settle there", () => {
    const field = new ParticleField(mulberry32(7));
    field.emit(fall("settle"), frame, 5);

    for (let i = 0; i < 30; i++) field.update(0.1, [], frame, 1, i * 0.1);

    for (const p of field.particles) {
      expect(p.settled).toBe(true);
      expect(Math.abs(p.y - frame.feet.y)).toBeLessThanOrEqual(frame.feet.ry);
    }
  });

  test("bouncing loses height each bounce, then rests", () => {
    const field = new ParticleField(mulberry32(8));
    field.emit(fall("bounce"), frame, 1);
    const p = field.particles[0]!;
    let peaks = 0;
    let rising = false;

    for (let i = 0; i < 80 && !p.settled; i++) {
      field.update(0.05, [], frame, 1, i * 0.05);

      if (p.vy < 0) rising = true;
      else if (rising) {
        peaks++;
        rising = false;
      }
    }

    expect(peaks).toBeGreaterThan(0);
    expect(p.settled).toBe(true);
  });

  test("splashes replace the drop with a ripple and droplets", () => {
    const field = new ParticleField(mulberry32(9));
    field.emit(fall("splash"), frame, 1);

    for (let i = 0; i < 12; i++) field.update(0.1, [], frame, 1, i * 0.1);
    const kinds = field.particles.map((p) => p.kind);
    expect(kinds).not.toContain("drop");
  });

  test("walking through lying things kicks them up", () => {
    const field = new ParticleField(mulberry32(10));
    field.emit({ ...fall("settle"), from: "feet" }, frame, 4);

    for (let i = 0; i < 20; i++) field.update(0.1, [], frame, 1, i * 0.1);
    expect(field.particles.every((p) => p.settled)).toBe(true);
    field.update(0.1, [], { ...frame, motion: { vx: 60, vy: 0 } }, 1, 3);
    expect(field.particles.some((p) => !p.settled && p.vy < 0)).toBe(true);
  });

  test("tooltips have no ground: nothing lands", () => {
    const field = new ParticleField(mulberry32(11));
    field.emit(fall("settle"), { ...frame, ground: false }, 3);

    for (let i = 0; i < 20; i++)
      field.update(0.1, [], { ...frame, ground: false }, 1, i * 0.1);
    expect(
      field.particles.every((p) => !p.settled && p.y > frame.feet.y + 20),
    ).toBe(true);
  });

  test("debris keeps orbiting the centre instead of falling in or flying off", () => {
    const field = new ParticleField(mulberry32(12));
    field.emit(
      {
        kind: "rock",
        rate: 0,
        from: "orbit",
        radius: [20, 20],
        life: [100, 100],
        speed: [0, 0],
        size: [1, 1],
      },
      frame,
      1,
    );
    const p = field.particles[0]!;
    let min = Infinity;
    let max = 0;

    for (let i = 0; i < 400; i++) {
      field.update(0.01, [], frame, 1, i * 0.01);
      const r = Math.hypot(p.x - frame.center.x, p.y - frame.center.y);
      min = Math.min(min, r);
      max = Math.max(max, r);
    }

    expect(min).toBeGreaterThan(8);
    expect(max).toBeLessThan(45);
  });
});

describe("Spring", () => {
  test("follows its target, overshoots a little and settles", async () => {
    const { Spring } = await import("./physics");
    const spring = new Spring(0, 0);
    let overshoot = 0;

    for (let i = 0; i < 60; i++) {
      spring.step(10, 0, 0.1);
      overshoot = Math.max(overshoot, spring.x - 10);
    }

    expect(overshoot).toBeGreaterThan(0);
    expect(Math.abs(spring.x - 10)).toBeLessThan(0.1);
  });
});
