import { clamp } from "es-toolkit";
import { hexToRgb } from "@lootlog/domain/color";
import {
  envelope,
  hslToRgb,
  mulberry32,
  rgba,
  smoothstep,
  TAU,
  type Rgb,
  type Rng,
} from "./math";
import {
  footprint,
  ParticleField,
  type EmitterSpec,
  type SpawnFrame,
} from "./particles";
import { Spring } from "./physics";
import {
  bindLightPixels,
  jagged,
  LightPixels,
  pixelEllipse,
  pixelGlint,
  pixelLine,
  softEllipse,
} from "./paint";
import {
  Dragon,
  drawClouds,
  drawDragon,
  drawPearl,
  project,
  type Point3,
} from "./dragon";
import { alphaBounds, posterizeAlpha, type PixelBounds } from "./pixel";
import {
  drawCloud,
  drawCurtain,
  drawDustSwirl,
  drawGlyphOrbit,
  drawSkulls,
  drawTipDeco,
  type Brush,
} from "./decor";
import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import { AURAS, type AuraPreset, type BurstKind } from "./presets";
import { context2d, createCanvas, type AuraSilhouette } from "./silhouette";
import { groundRadius, spawnFrame, type AuraPlacement } from "./placement";
import { drawBurstScene } from "./bursts";
import { drawGround } from "./ground";
import { ARRIVAL_BURST, eventStrength, pulseStarted } from "./arrival";
import { avatarTop, drawAvatar } from "./avatar";
import { drawStorm, STORM_GLOOM } from "./storm";
import {
  drawAirCracks,
  drawEclipse,
  drawMoon,
  drawOrbits,
  drawRays,
  drawCrown,
  drawFireDragon,
  drawHalo,
  drawShards,
  drawWings,
  drawTongues,
  orbitHeads,
} from "./signatures";
import {
  COVERING_PARTICLES,
  PARTICLE_PAINTERS,
  SOFT_PARTICLES,
} from "./particle-painters";

/**
 * The animation steps at 10 fps, as the game's own animated item icons do (120 ms frames);
 * a smooth 60 fps glow looks pasted onto pixel art.
 */
const TICK = 0.1;

/** Room around the padded silhouette for particles drifting away from it. */
const MARGIN = 28;

/** Alpha and colour steps of the pixel finish. */
const ALPHA_LEVELS = 4;

const COLOR_LEVELS = 7;

/**
 * How often a lite aura's body pieces, outline and inner light step, s, instead of every
 * tick; particles still move every tick.
 */
const LITE_STEP = 0.2;

/** The black core of a conqueror's bolt. */
const HAKI_CORE: Rgb = [14, 0, 4];

/** Where a conqueror's bolt's red rim sits round its core, in units of the rim width. */
const HAKI_RIM = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

interface Bolt {
  /** Silhouette-local points, so a bolt rides along while the character walks. */
  points: number[];
  ax: number;
  ay: number;
  bx: number;
  by: number;
  age: number;
  life: number;
  /** A strike from the sky: drawn thicker. */
  heavy?: boolean;
  /** Conqueror's will: a black core in a red glow instead of white in blue. */
  haki?: boolean;
}

/** How long each burst runs, in seconds. */
const BURST_DURATION: Record<BurstKind, number> = {
  descend: 1.2,
  eruption: 0.6,
  freeze: 1,
  implode: 0.9,
  strike: 0.4,
  spores: 0.5,
  bloodrain: 1.6,
  comet: 0.9,
  sweep: 0.8,
  bloom: 1.4,
  whirl: 1.4,
  sandspout: 1.2,
  souls: 1.6,
  splash: 1,
  ascend: 1.2,
  "aurora-flare": 1.2,
  conqueror: 0.9,
  roar: 1.6,
  coronation: 1.4,
  judgement: 0.6,
  rebirth: 1.2,
  quake: 0.9,
};

/** An offscreen buffer of one side's light (`lit`) or covering (`dim`) pixels. */
interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  used: boolean;
  /** Something soft (gradient blobs) was drawn, so it needs the pixel finish; pixel-only layers skip it. */
  soft: boolean;
  /**
   * What the finish found drawn, so every frame copies only that: a layer's content
   * covers about a tenth of its box, and copying the rest costs the most without a GPU.
   */
  bounds: PixelBounds | null;
}

/** A point in screen or particle space, px. */
interface Point {
  x: number;
  y: number;
}

interface Box {
  ox: number;
  oy: number;
  w: number;
  h: number;
}

function createLayer(): Layer {
  const canvas = createCanvas(1, 1);

  return {
    canvas,
    ctx: context2d(canvas, { willReadFrequently: true }),
    used: false,
    soft: true,
    bounds: null,
  };
}

/**
 * One side (behind or in front of the character) rendered at a tick. What hangs on the body
 * (ground, rays, flames, orbits…) and the particles, which live on the map, sit in separate
 * buffers: between ticks the first moves with the character and the second with the camera,
 * so neither needs redrawing until the next tick.
 */
interface Snapshot {
  key: string;
  box: Box;
  /**
   * What the body buffers were last rendered for: the tick for most auras, a coarser step
   * for lite ones (`AuraPreset.lite`), whose body buffers outlive ticks.
   */
  bodyKey: string;
  bodySilhouette: AuraSilhouette | null;
  bodyBox: Box;
  /** The character's screen position when the body buffers were rendered. */
  x: number;
  y: number;
  /** The camera's screen position when the world buffers were rendered. */
  viewX: number;
  viewY: number;
  bodyLit: Layer;
  bodyDim: Layer;
  worldLit: Layer;
  worldDim: Layer;
}

function createSnapshot(): Snapshot {
  return {
    key: "",
    box: { ox: 0, oy: 0, w: 0, h: 0 },
    bodyKey: "",
    bodySilhouette: null,
    bodyBox: { ox: 0, oy: 0, w: 0, h: 0 },
    x: 0,
    y: 0,
    viewX: 0,
    viewY: 0,
    bodyLit: createLayer(),
    bodyDim: createLayer(),
    worldLit: createLayer(),
    worldDim: createLayer(),
  };
}

/** A tinted mask composited once per tick and silhouette, then only copied each frame. */
interface Composite {
  silhouette: AuraSilhouette | null;
  key: string;
  canvas: HTMLCanvasElement;
  /** The pixel buffer written into `canvas`, reused while its size holds. */
  image: ImageData | null;
}

function createComposite(): Composite {
  return { silhouette: null, key: "", canvas: createCanvas(1, 1), image: null };
}

/** The outline bands' alpha, inner to outer. */
const BAND_ALPHAS = [0.95, 0.8, 0.7, 0.55] as const;

/** Which of the three aura tones each outline band takes. */
const BAND_TONES = [0, 1, 2, 2] as const;

/** A live aura on one character or tooltip: its own particles, clock and signature effects. */
export class Aura {
  private readonly rng: Rng;
  private readonly field: ParticleField;
  private preset: AuraPreset;
  /** Stepped clock, advanced by whole ticks. */
  private time = 0;
  private tick = 0;
  private carry = 0;
  /** Lightning or burst flash, decays to 0. */
  private flash = 0;
  private bolts: Bolt[] = [];
  private nextBolt = 0.3;
  private beatIndex = -1;
  /** The preset's burst animation: progress 0..1, or -1 while resting. */
  private burst = -1;
  private nextBurst = 2.5;
  /** Seconds since the aura showed, for an admin's arrival. */
  private age = 0;
  /** Shapes the quake's crack in the air; a new one each quake. */
  private quakeSeed = 1;
  /** Props follow the head through this spring, so they trail a walk. */
  private spring: Spring | null = null;
  private lastCenter: { x: number; y: number } | null = null;
  private motion = { vx: 0, vy: 0 };
  private lastPrint: { x: number; y: number; side: number } | null = null;
  /** Heavenly Dragon: the dragon and the pearl it chases, in particle space. */
  private dragon: Dragon | null = null;
  private pearl: Point3 = { x: 0, y: 0, z: 0 };
  /** The head in particle space at the last tick: where the spring is pulled to. */
  private headTarget = { x: 0, y: 0 };
  private rgb: AuraColors;
  private readonly back = createSnapshot();
  private readonly front = createSnapshot();
  private readonly outline = createComposite();
  private readonly inner = createComposite();
  /** The lit layer's single pixels while it renders (`prepare` to `finish`). */
  private readonly lightPixels = new LightPixels();
  /** The layer pair drawn into right now; draw helpers pick `lit` (additive) or `dim` (covering). */
  private litCtx!: CanvasRenderingContext2D;
  private dim!: CanvasRenderingContext2D;
  private dimLayer!: Layer;
  private litLayer!: Layer;

  /**
   * `phase` (0..1) shifts when this aura's ticks land, so auras on one screen render their
   * ticks on different frames instead of all on the same one.
   */
  constructor(
    id: CharacterAuraId,
    seed = Math.floor(Math.random() * 1e9),
    phase = 0,
  ) {
    this.carry = clamp(phase, 0, 1) * TICK;
    this.rng = mulberry32(seed);
    this.field = new ParticleField(this.rng);
    this.preset = AURAS[id];
    this.rgb = colorsOf(this.preset);

    // An admin arrives with a burst.
    if (this.preset.herald) this.nextBurst = ARRIVAL_BURST;
  }

  /** How dark the aura makes the whole map, 0..1: the storm's overcast; 0 for every other aura. */
  mapDarkness(): number {
    return this.preset.storm ? STORM_GLOOM : 0;
  }

  /**
   * Draws the aura's effects over the whole map, `width` × `height` in the context's units:
   * the storm.
   */
  drawMapEffects(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    width: number,
    height: number,
  ): void {
    const p = this.preset;

    if (!place.ground || !p.storm) return;
    const [light, mid] = this.rgb.tones;
    ctx.save();

    try {
      if (p.storm)
        drawStorm(
          ctx,
          width,
          height,
          this.time,
          [place.viewX, place.viewY],
          light,
          mid,
        );
    } finally {
      ctx.restore();
    }
  }

  /** How far the transformation's giant has risen, 0..1: through events and bursts. */
  private avatarStrength(): number {
    const burst =
      this.burst >= 0 ? Math.sin(Math.PI * clamp(this.burst, 0, 1)) : 0;

    return Math.max(eventStrength(this.age), burst);
  }

  /** How far above its box the aura paints at `place`: the admin's giant at full height. */
  reachAbove(place: AuraPlacement): number {
    if (!this.preset.herald || !place.ground) return 0;

    return Math.max(0, boxOf(place).oy - avatarTop(place));
  }

  setPreset(id: CharacterAuraId): void {
    if (id === this.preset.id) return;
    this.preset = AURAS[id];
    this.rgb = colorsOf(this.preset);
    this.field.clear();
    this.bolts = [];
    this.dragon = null;
    this.burst = -1;
    this.back.key = "";
    this.front.key = "";
    this.back.bodyKey = "";
    this.front.bodyKey = "";
    this.outline.key = "";
    this.inner.key = "";
  }

  update(dt: number, place: AuraPlacement | null, intensity: number): void {
    const before = this.age;
    this.age += Math.max(0, dt);

    // Each later pulse over the map brings the burst too.
    if (this.preset.herald && pulseStarted(before, this.age))
      this.nextBurst = Math.min(this.nextBurst, ARRIVAL_BURST);
    this.carry += Math.max(0, dt);
    let steps = 0;

    while (this.carry >= TICK) {
      this.carry -= TICK;

      // After a long stall (hidden tab), catch up a little and drop the rest.
      if (++steps > 4) {
        this.carry = 0;
        break;
      }

      this.step(place, intensity);
    }
  }

  private step(place: AuraPlacement | null, intensity: number): void {
    this.time += TICK;
    this.tick++;
    this.flash = Math.max(0, this.flash - TICK * 4);
    const frame = place ? this.physicsFrame(place) : null;

    const emitters =
      place && !place.ground && this.preset.tipEmitters
        ? [...this.preset.emitters, ...this.preset.tipEmitters]
        : this.preset.emitters;

    this.field.update(TICK, emitters, frame, intensity, this.time);
    this.field.bubbleUp(TICK);

    if (!place || !frame) return;
    const fx = this.preset.fx;

    if (fx.includes("footprints") && place.ground) this.stepPrints(frame);

    if (fx.includes("lightning")) this.updateBolts(place, frame, intensity);

    if (fx.includes("heartbeat") && place.ground) this.updateHeartbeat(frame);
    this.updateBurst(place, frame, intensity);
  }

  /** The spawn frame plus what moves things: the walk, the spring-hung props, stars, wind. */
  private physicsFrame(place: AuraPlacement): SpawnFrame {
    const frame = spawnFrame(place);
    const head = { x: frame.body.x + frame.body.w / 2, y: frame.body.y };
    const last = this.lastCenter;
    this.lastCenter = { ...frame.center };
    let teleported = !last;

    if (last) {
      this.motion = {
        vx: (frame.center.x - last.x) / TICK,
        vy: (frame.center.y - last.y) / TICK,
      };

      // A jump of more than a few tiles in one tick is a teleport, not a walk.
      if (Math.hypot(this.motion.vx, this.motion.vy) > 400) {
        this.motion = { vx: 0, vy: 0 };
        teleported = true;
      }
    }

    this.headTarget = head;

    if (!this.spring || teleported) this.spring = new Spring(head.x, head.y);
    else this.spring.step(head.x, head.y, TICK);
    frame.motion = this.motion;
    frame.ground = place.ground;
    frame.wind = this.preset.wind ?? 0;
    const fx = this.preset.fx;

    if (fx.includes("raincloud")) {
      const cloud = this.cloudAt(place);
      // Wider than the body, so most rain falls beside the character where it can be seen.
      frame.cloud = {
        x: cloud.x + place.viewX,
        y: cloud.y + place.viewY + 3,
        w: place.silhouette.bounds.w + 18,
      };
    }

    if (fx.includes("dragon")) this.stepDragon(place, frame, teleported);

    if (fx.includes("orbits"))
      frame.attractors = orbitHeads(place, this.time).map(([x, y]) => ({
        x: x + place.viewX,
        y: y + place.viewY,
      }));

    return frame;
  }

  /** How far the spring-hung props lag behind the head, px. */
  private lag(): Point {
    if (!this.spring) return { x: 0, y: 0 };

    return {
      x: clamp(this.spring.x - this.headTarget.x, -14, 14),
      y: clamp(this.spring.y - this.headTarget.y, -10, 10),
    };
  }

  /** Storm: the rain cloud's centre on screen, hung over the head on the spring. */
  private cloudAt(place: AuraPlacement): Point {
    const { bounds } = place.silhouette;
    const lag = this.lag();

    return {
      x: place.x + bounds.x + bounds.w / 2 + lag.x,
      y: place.y + bounds.y - 16 + lag.y,
    };
  }

  private get roaring(): boolean {
    return this.burst >= 0 && this.burstKind === "roar";
  }

  /**
   * Heavenly Dragon: the pearl circles the body on a tilted, bobbing ring (or runs round the
   * tooltip's frame); during the roar it hangs over the head. The dragon chases it, the
   * pearl sheds sparks and, mid-roar, golden fire streams from the jaws.
   */
  private stepDragon(
    place: AuraPlacement,
    frame: SpawnFrame,
    teleported: boolean,
  ): void {
    const roaring = this.roaring;

    if (place.ground) {
      const { body, center } = frame;
      const r = body.w * 0.7 + 12;
      const a = this.time * 1.25;

      this.pearl = roaring
        ? { x: center.x + Math.sin(this.time * 3) * 6, y: body.y - 24, z: 0 }
        : {
            x: center.x + Math.cos(a) * r,
            y: body.y + body.h * (0.45 + 0.3 * Math.sin(a * 0.55)),
            z: Math.sin(a) * r,
          };
    } else {
      this.pearl = {
        ...tipPathAt(frame.body, this.time * (roaring ? 90 : 45)),
        z: 0,
      };
    }

    if (!this.dragon || teleported) this.dragon = new Dragon(this.pearl);
    // Round a box the dragon stays flat (z 0): it must keep off the tip's text.
    this.dragon.step(this.pearl, TICK, place.ground ? 5 : 7);

    if (!place.ground) pushOutOfBox(this.dragon, frame.body, 4);
    const [px, py] = project(this.pearl, 0, 0);

    // A spark falls off the pearl every other tick, so its path glitters behind it.
    if (this.tick % 2 === 0)
      this.field.emit(
        PEARL_SPARK,
        {
          ...frame,
          feet: { x: px, y: py, rx: 1, ry: 1 },
        },
        1,
      );

    if (!roaring || !place.ground || this.burst < 0.25 || this.burst > 0.85)
      return;
    const head = this.dragon.head;
    const dir = this.dragon.heading;
    const [hx, hy] = project(head, 0, 0);
    this.field.emit(
      {
        ...DRAGON_FIRE,
        dir: Math.atan2(dir.y + dir.z * 0.22, dir.x),
        front: head.z > 0 ? 1 : 0,
      },
      {
        ...frame,
        feet: { x: hx + dir.x * 3, y: hy + dir.y * 3, rx: 0.5, ry: 0.5 },
      },
      6,
    );
  }

  /** Frost and sand: footprints left and right of the stride while walking. */
  private stepPrints(frame: SpawnFrame): void {
    if (Math.hypot(this.motion.vx, this.motion.vy) < 8) return;
    const { x, y } = frame.feet;
    const last = this.lastPrint;

    if (last && Math.hypot(x - last.x, y - last.y) < 8) return;
    const side = last ? -last.side : 1;
    this.lastPrint = { x, y, side };
    this.field.add(
      footprint(Math.round(x + side * 3), Math.round(y + 1), side, 3, 2),
    );
  }

  private glow(intensity: number): number {
    return (
      clamp(this.preset.pulse(this.time) + this.flash * 0.6, 0, 2) * intensity
    );
  }

  drawBack(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    intensity: number,
  ): void {
    const p = this.preset;
    const glow = this.glow(intensity);

    this.snapshot(this.back, place, false, intensity, () => {
      const b = this.brush(intensity);

      if (place.ground && p.ground)
        drawGround(b, place, p.ground, p.pulse(this.time), this.flash);

      if (place.ground) this.drawLitePieces(b, place, false);

      if (p.fx.includes("rays")) drawRays(b, place);

      if (p.fx.includes("moon")) drawMoon(b, place, p.pulse(this.time));

      if (p.fx.includes("eclipse")) drawEclipse(b, place, p.pulse(this.time));

      if (p.fx.includes("flicker-tongues"))
        drawTongues(b, place, this.burstSwell("eruption"));

      if (p.fx.includes("orbits")) drawOrbits(b, place, false, this.rgb.rim);

      if (p.fx.includes("frost-shards") && place.ground)
        drawShards(b, place, false, this.burstSwell("freeze"));
      this.drawDecor(b, place, false);
      this.drawBurst(b, place, false);
    });

    // The game's context goes back as it came, even if a draw throws.
    ctx.save();

    try {
      if (p.herald && place.ground) {
        const giant = this.avatarStrength();

        if (giant > 0.02)
          drawAvatar(
            ctx,
            place,
            this.rgb.tones[1],
            Boolean(p.darkHaze),
            giant * intensity,
          );
      }

      this.blit(ctx, this.back, place, "dim");

      if (!(p.bare && place.ground))
        this.drawOutline(ctx, place, glow, this.compositeKey(intensity));
      this.blit(ctx, this.back, place, "lit");
    } finally {
      ctx.restore();
    }
  }

  drawFront(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    intensity: number,
  ): void {
    const p = this.preset;
    const glow = this.glow(intensity);

    this.snapshot(this.front, place, true, intensity, () => {
      const b = this.brush(intensity);

      if (place.ground) this.drawLitePieces(b, place, true);

      if (p.fx.includes("frost-shards") && place.ground)
        drawShards(b, place, true, this.burstSwell("freeze"));

      if (p.fx.includes("orbits")) drawOrbits(b, place, true, this.rgb.rim);

      if (p.fx.includes("lightning")) this.drawBolts(place, intensity);

      // A faint crack hangs in the air between quakes and flashes with each one.
      if (p.fx.includes("quake") && place.ground)
        drawAirCracks(
          b,
          place,
          this.quakeSeed,
          0.3 + 0.7 * this.burstSwell("quake"),
        );
      this.drawDecor(b, place, true);
      this.drawBurst(b, place, true);
    });

    ctx.save();

    try {
      if (place.ground)
        this.drawInner(ctx, place, glow, this.compositeKey(intensity));
      this.blit(ctx, this.front, place, "dim");
      this.blit(ctx, this.front, place, "lit");
    } finally {
      ctx.restore();
    }
  }

  /**
   * Renders a side's buffers once per tick: the body pieces through `body`, then the
   * particles. The animation only changes on ticks, so other frames just move the buffers.
   * A lite aura's body buffers are kept across ticks while nothing in them changes.
   */
  private snapshot(
    snap: Snapshot,
    place: AuraPlacement,
    front: boolean,
    intensity: number,
    body: () => void,
  ): void {
    const box = boxOf(place);
    const key = `${this.tick}|${box.w}x${box.h}`;

    if (snap.key === key) return;
    snap.key = key;
    snap.box = box;
    const bodyKey = this.bodyKey(place, box, key, intensity);

    if (snap.bodyKey !== bodyKey || snap.bodySilhouette !== place.silhouette) {
      snap.bodyKey = bodyKey;
      snap.bodySilhouette = place.silhouette;
      snap.bodyBox = box;
      snap.x = Math.round(place.x);
      snap.y = Math.round(place.y);
      this.prepare(snap.bodyLit, snap.bodyDim, box);

      // Lite body pieces are pixels only, so they skip the pixel finish.
      if (this.preset.lite) {
        snap.bodyLit.soft = false;
        snap.bodyDim.soft = false;
      }

      body();
      this.finish(snap.bodyLit, snap.bodyDim, box);
    }

    snap.viewX = Math.round(place.viewX);
    snap.viewY = Math.round(place.viewY);
    this.prepare(snap.worldLit, snap.worldDim, box);
    // Particles are plotted pixel by pixel; only smoke, wisps and firefly glows are soft.
    snap.worldLit.soft = false;
    snap.worldDim.soft = false;
    this.drawParticles(place, front);
    this.drawDragonWorld(place, front, intensity);
    this.finish(snap.worldLit, snap.worldDim, box);
  }

  /**
   * What a side's body buffers depend on: the tick `key` for most auras; for a lite one round
   * a character, its size, intensity and coarse step, unless a burst or flash is changing it.
   */
  private bodyKey(
    place: AuraPlacement,
    box: Box,
    key: string,
    intensity: number,
  ): string {
    const steady = this.steadyKey(intensity);

    if (!steady || !place.ground) return key;

    return `lite|${box.w}x${box.h}|${steady}`;
  }

  /** What the outline and inner light composites are rebuilt for: the tick, or a lite step. */
  private compositeKey(intensity: number): string {
    return this.steadyKey(intensity) ?? String(this.tick);
  }

  /**
   * A lite aura's coarse animation step while no burst or flash is changing it, with the
   * intensity it was drawn at; null when it has to be drawn every tick.
   */
  private steadyKey(intensity: number): string | null {
    if (!this.preset.lite || this.burst >= 0 || this.flash > 0) return null;

    return `${intensity}|${this.liteStep()}`;
  }

  /** The coarse step a lite aura's body pieces animate by. */
  private liteStep(): number {
    return Math.floor(this.time / LITE_STEP);
  }

  /** The lite auras' pieces round a character, stepped by `liteStep`; `front` picks the pass. */
  private drawLitePieces(b: Brush, place: AuraPlacement, front: boolean): void {
    const fx = this.preset.fx;
    const step = this.liteStep();
    // Floating pieces bob a pixel up and down, four steps each way.
    const raised = Math.floor(step / 4) % 2 === 1;

    if (fx.includes("halo")) drawHalo(b, place, front, raised);

    if (fx.includes("fire-dragon")) drawFireDragon(b, place, front, step);

    if (fx.includes("crown") && front) drawCrown(b, place, raised, step);

    if (fx.includes("wings") && !front) drawWings(b, place, step);
  }

  /** Copies a side's buffers to the screen: body ones follow the character, world ones the camera. */
  private blit(
    ctx: CanvasRenderingContext2D,
    snap: Snapshot,
    place: AuraPlacement,
    which: "lit" | "dim",
  ): void {
    const mode = which === "lit" ? "lighter" : "source-over";
    const bodyX = Math.round(place.x) - snap.x;
    const bodyY = Math.round(place.y) - snap.y;
    const worldX = snap.viewX - Math.round(place.viewX);
    const worldY = snap.viewY - Math.round(place.viewY);

    blitLayer(
      ctx,
      which === "lit" ? snap.bodyLit : snap.bodyDim,
      snap.bodyBox,
      mode,
      bodyX,
      bodyY,
    );
    blitLayer(
      ctx,
      which === "lit" ? snap.worldLit : snap.worldDim,
      snap.box,
      mode,
      worldX,
      worldY,
    );
  }

  /** Clears a buffer pair for a render at `box`. */
  private prepare(lit: Layer, dim: Layer, box: Box): void {
    for (const layer of [lit, dim]) {
      const { canvas, ctx } = layer;

      if (canvas.width < box.w || canvas.height < box.h) {
        canvas.width = Math.max(canvas.width, box.w);
        canvas.height = Math.max(canvas.height, box.h);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, box.w, box.h);
      ctx.setTransform(1, 0, 0, 1, -box.ox, -box.oy);

      if (layer === lit) ctx.globalCompositeOperation = "lighter";
      layer.used = false;
      layer.soft = true;
    }

    this.lightPixels.reset(box.ox, box.oy, box.w, box.h);
    bindLightPixels(lit.ctx, this.lightPixels);

    this.litCtx = lit.ctx;
    this.dim = dim.ctx;
    this.litLayer = lit;
    this.dimLayer = dim;
  }

  /**
   * Adds the plotted light, snaps soft layers to the pixel grid (stepped alpha and flat,
   * dithered tones) and finds what each layer holds.
   */
  private finish(lit: Layer, dim: Layer, box: Box): void {
    bindLightPixels(lit.ctx, null);
    const light = this.lightPixels;
    const plotted = !light.empty;

    if (plotted) lit.used = true;

    for (const layer of [lit, dim]) {
      layer.bounds = null;

      if (!layer.used) continue;
      const image = layer.ctx.getImageData(0, 0, box.w, box.h);
      const addsLight = layer === lit && plotted;

      if (addsLight) light.addInto(image.data);

      if (!layer.soft) {
        layer.bounds = alphaBounds(image.data, box.w, box.h);

        if (addsLight) layer.ctx.putImageData(image, 0, 0);
        continue;
      }

      layer.bounds = posterizeAlpha(
        image.data,
        box.w,
        box.h,
        ALPHA_LEVELS,
        0.07,
        box.ox,
        box.oy,
        COLOR_LEVELS,
      );
      layer.ctx.putImageData(image, 0, 0);
    }
  }

  /** The additive buffer; reaching for it marks it drawn, so `finish` skips untouched ones. */
  private get lit(): CanvasRenderingContext2D {
    this.litLayer.used = true;

    return this.litCtx;
  }

  private useDim(): CanvasRenderingContext2D {
    this.dimLayer.used = true;

    return this.dim;
  }

  // --- outline -----------------------------------------------------------------------------

  /** The pixel outline bands in three tones; blurred glows when the sprite can't be read. */
  private drawOutline(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    glow: number,
    key: string,
  ): void {
    const { silhouette } = place;
    const p = this.preset;

    if (silhouette.pixels) {
      const { outline, band } = silhouette.pixels;
      const prism = p.fx.includes("prism");

      const bandAlpha = BAND_ALPHAS.map((alpha, index) => {
        // The outer dither only shows near the top of a pulse, so the glow visibly breathes.
        const a =
          index === 3
            ? smoothstep(0.75, 1.05, glow) * alpha
            : clamp(alpha * glow, 0, 1);

        return a > 0.02 ? a : 0;
      });

      const bandColors = BAND_ALPHAS.map((_, index) =>
        prism ? this.rainbowStops(index) : [this.rgb.tones[BAND_TONES[index]]],
      );

      const flash = this.flash > 0.05 ? this.flash * 0.7 : 0;
      // The flash adds white over the inner band (the prism's own rainbow on the prism).
      const flashColors = prism ? (bandColors[0] ?? []) : [WHITE];

      const composite = this.composite(this.outline, silhouette, key, (octx) =>
        this.paintPixels(octx, this.outline, (data, width, height) => {
          for (let n = 0; n < outline.length; n++) {
            const b = band[n] ?? 0;
            const a = bandAlpha[b] ?? 0;
            const f = b === 0 ? flash : 0;

            if (a === 0 && f === 0) continue;
            const i = outline[n] ?? 0;
            const color = colorAt(bandColors[b] ?? [], i, width, height);

            if (f === 0) {
              writePixel(data, i, color, a);
              continue;
            }

            // `lighter` over the band: premultiplied colours add, then clamp.
            const light = colorAt(flashColors, i, width, height);
            const alpha = Math.min(1, a + f);

            writePixel(
              data,
              i,
              [
                Math.min(255, color[0] * a + light[0] * f) / alpha,
                Math.min(255, color[1] * a + light[1] * f) / alpha,
                Math.min(255, color[2] * a + light[2] * f) / alpha,
              ],
              alpha,
            );
          }
        }),
      );

      ctx.globalCompositeOperation = "source-over";
      this.blitComposite(ctx, place, composite);

      return;
    }

    if (!silhouette.glow) return;
    const { near, far } = silhouette.glow;
    ctx.globalCompositeOperation = p.darkHaze ? "source-over" : "lighter";
    this.blitMask(ctx, place, far, this.rgb.haze, Math.min(1, p.far * glow));
    ctx.globalCompositeOperation = "lighter";
    this.blitMask(ctx, place, near, this.rgb.rim, Math.min(1, p.near * glow));
  }

  /** The character lit by its own aura: its silhouette tinted and added over it. */
  private drawInner(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    glow: number,
    key: string,
  ): void {
    const alpha = Math.min(0.5, this.preset.inner * glow);

    if (alpha <= 0.02) return;

    const { pixels } = place.silhouette;

    const colors = this.preset.fx.includes("prism")
      ? this.rainbowStops(0)
      : [this.rgb.tones[0]];

    const composite = this.composite(
      this.inner,
      place.silhouette,
      key,
      (octx) => {
        if (!pixels) {
          const glow = place.silhouette.glow;

          if (glow) this.paintMask(octx, glow.sil, this.rgb.tones[0], alpha);

          return;
        }

        const { body, bodyAlpha } = pixels;
        this.paintPixels(octx, this.inner, (data, width, height) => {
          for (let n = 0; n < body.length; n++) {
            const i = body[n] ?? 0;
            const a = (alpha * (bodyAlpha[n] ?? 0)) / 255;
            writePixel(data, i, colorAt(colors, i, width, height), a);
          }
        });
      },
    );

    ctx.globalCompositeOperation = "lighter";
    this.blitComposite(ctx, place, composite);
  }

  /** Rebuilds `composite` for `key` and the silhouette when stale, via `paint` on a cleared canvas. */
  private composite(
    composite: Composite,
    silhouette: AuraSilhouette,
    key: string,
    paint: (ctx: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement {
    if (composite.silhouette === silhouette && composite.key === key)
      return composite.canvas;
    composite.silhouette = silhouette;
    composite.key = key;
    const { canvas } = composite;
    const width = silhouette.width + silhouette.pad * 2;
    const height = silhouette.height + silhouette.pad * 2;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const octx = context2d(canvas);
    octx.globalCompositeOperation = "source-over";
    octx.globalAlpha = 1;
    octx.clearRect(0, 0, canvas.width, canvas.height);
    paint(octx);
    octx.globalAlpha = 1;
    octx.globalCompositeOperation = "source-over";

    return canvas;
  }

  /** Writes `fill`'s pixels into a cleared composite through its reused buffer. */
  private paintPixels(
    octx: CanvasRenderingContext2D,
    composite: Composite,
    fill: (data: Uint8ClampedArray, width: number, height: number) => void,
  ): void {
    const { width, height } = composite.canvas;
    let image = composite.image;

    if (image?.width === width && image.height === height) image.data.fill(0);
    else image = composite.image = new ImageData(width, height);
    fill(image.data, width, height);
    octx.putImageData(image, 0, 0);
  }

  private blitComposite(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    canvas: HTMLCanvasElement,
  ): void {
    const pad = place.silhouette.pad;
    ctx.globalAlpha = 1;
    ctx.drawImage(canvas, Math.round(place.x) - pad, Math.round(place.y) - pad);
  }

  /** Draws `mask` tinted (rainbow for the prism) at `alpha` onto a padded-silhouette-sized canvas. */
  private paintMask(
    octx: CanvasRenderingContext2D,
    mask: HTMLCanvasElement,
    color: Rgb,
    alpha: number,
    band = 0,
  ): void {
    if (alpha <= 0.02) return;
    const prism = this.preset.fx.includes("prism");

    const tinted = tint(mask, (sctx, w, h) =>
      prism ? this.rainbow(sctx, w, h, band) : rgba(color, 1),
    );

    octx.globalAlpha = alpha;
    octx.drawImage(
      tinted,
      0,
      0,
      mask.width,
      mask.height,
      0,
      0,
      mask.width,
      mask.height,
    );
  }

  private blitMask(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    mask: HTMLCanvasElement,
    color: Rgb,
    alpha: number,
    band = 0,
  ): void {
    if (alpha <= 0.02) return;
    const prism = this.preset.fx.includes("prism");

    const tinted = tint(mask, (sctx, w, h) =>
      prism ? this.rainbow(sctx, w, h, band) : rgba(color, 1),
    );

    const pad = place.silhouette.pad;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      tinted,
      0,
      0,
      mask.width,
      mask.height,
      Math.round(place.x) - pad,
      Math.round(place.y) - pad,
      mask.width,
      mask.height,
    );
    ctx.globalAlpha = 1;
  }

  /** Prism: hues run down the body and roll over time; outer bands trail the inner ones. */
  private rainbow(
    sctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    band: number,
  ): CanvasGradient {
    const gradient = sctx.createLinearGradient(0, 0, w * RAINBOW_RUN, h);

    for (const [i, stop] of this.rainbowStops(band).entries())
      gradient.addColorStop(i / 6, rgba(stop, 1));

    return gradient;
  }

  /** The rainbow's seven evenly spaced stops for `band`. */
  private rainbowStops(band: number): Rgb[] {
    const shift = this.time * 90 + band * 40;

    return Array.from({ length: 7 }, (_, i) =>
      hslToRgb(shift + i * 60, 1, band ? 0.55 : 0.72),
    );
  }

  // --- decorations ---------------------------------------------------------------------------

  private brush(intensity: number): Brush {
    return {
      lit: () => this.lit,
      dim: () => this.useDim(),
      time: this.time,
      tick: this.tick,
      tones: this.rgb.tones,
      palette: this.rgb.particles,
      intensity,
      lag: this.lag(),
    };
  }

  /** The newer auras' signature pieces round a character, or the aura's dressing on a tooltip. */
  private drawDecor(b: Brush, place: AuraPlacement, front: boolean): void {
    const { bounds } = place.silhouette;

    const box = {
      x: place.x + bounds.x,
      y: place.y + bounds.y,
      w: bounds.w,
      h: bounds.h,
    };

    if (!place.ground) {
      drawTipDeco(
        b,
        this.preset.tip,
        box,
        front,
        this.burstSwell("aurora-flare"),
      );

      return;
    }

    const fx = this.preset.fx;

    if (fx.includes("curtain") && !front)
      drawCurtain(
        b,
        box.x + box.w / 2,
        box.y - 26,
        box.w / 2 + 24,
        34,
        this.burstSwell("aurora-flare"),
      );

    if (fx.includes("raincloud") && !front)
      drawCloud(b, this.cloudAt(place), this.flash);

    if (fx.includes("skulls")) drawSkulls(b, box, front);

    if (fx.includes("glyph-orbit")) drawGlyphOrbit(b, box, front);

    if (fx.includes("dust-swirl")) drawDustSwirl(b, box, front);

    if (fx.includes("dragon") && !front) {
      // Auspicious clouds drifting under the feet, on a faint golden glow.
      const rx = groundRadius(place);
      const x = Math.round(place.feetX);
      const y = Math.round(place.feetY) - 2;
      softEllipse(
        b.lit(),
        x,
        y,
        rx,
        rx * 0.36,
        this.rgb.particles[1] ?? this.rgb.rim,
        0.18 * b.intensity,
      );
      drawClouds(b, x, y + 1, rx);
    }
  }

  // --- bursts ------------------------------------------------------------------------------

  private get burstKind(): BurstKind {
    return this.preset.burst;
  }

  /** 0..1..0 over the running burst, for effects that swell and settle. */
  private burstSwell(kind: BurstKind): number {
    if (this.burst < 0 || this.burstKind !== kind) return 0;

    return Math.sin(Math.PI * clamp(this.burst, 0, 1));
  }

  /** Every few seconds the preset's own burst: starts, per-tick spawns and the closing beat. */
  private updateBurst(
    place: AuraPlacement,
    frame: SpawnFrame,
    intensity: number,
  ): void {
    const kind = this.burstKind;
    const k = clamp(intensity, 0.5, 1.5);

    if (this.burst >= 0) {
      this.advanceBurst(kind, place, frame, k);

      return;
    }

    this.nextBurst -= TICK;

    if (this.nextBurst > 0) return;
    this.nextBurst = 4.5 + this.rng() * 3;
    this.burst = 0;
    this.startBurst(kind, place, frame, k);
  }

  /** The running burst's per-tick spawns and the beats it crosses this tick. */
  private advanceBurst(
    kind: BurstKind,
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
  ): void {
    const before = this.burst;
    this.burst += TICK / BURST_DURATION[kind];
    const crossed = (at: number) => before < at && this.burst >= at;

    if (kind === "bloodrain" && this.burst < 0.8) {
      this.field.emit(
        {
          kind: "drop",
          rate: 0,
          from: "above",
          life: [0.4, 0.6],
          speed: [30, 50],
          dir: Math.PI / 2,
          spread: 0.1,
          gravity: 260,
          size: [1, 1.6],
          colors: 2,
          front: 0.5,
          pop: true,
        },
        frame,
        Math.round(3 * k),
      );
    }

    if (kind === "descend" && crossed(0.85)) {
      this.flash = 0.7;
      this.field.emit(
        {
          kind: "mote",
          rate: 0,
          from: "feet-rim",
          life: [0.6, 1],
          speed: [20, 40],
          spread: 0.5,
          drag: 1,
          size: [1.3, 2],
          colors: 2,
          front: 0.5,
        },
        frame,
        Math.round(12 * k),
      );
    }

    if (kind === "implode" && crossed(0.85)) {
      this.flash = 1;
      this.field.emit(
        {
          kind: "spark",
          rate: 0,
          from: "body",
          life: [0.3, 0.6],
          speed: [40, 80],
          spread: TAU,
          drag: 1.5,
          size: [0.8, 1.2],
          colors: 3,
          front: 0.6,
        },
        frame,
        Math.round(16 * k),
      );
    }

    if (kind === "comet" && crossed(0.95)) {
      this.field.emit(
        {
          kind: "glint",
          rate: 0,
          from: "body",
          life: [0.4, 0.7],
          speed: [0, 3],
          size: [4, 7],
          colors: 4,
          front: 0.7,
        },
        frame,
        Math.round(6 * k),
      );
    }

    // The halo lands: a flash, two rings and gold raining round the character.
    if ((kind === "coronation" || kind === "rebirth") && crossed(0.85)) {
      this.flash = 1;
      this.field.emit(GOLD_RAIN, frame, Math.round(16 * k));
      this.burstRing(place, frame, frame.feet.rx * 2.4, 1);
      this.burstRing(place, frame, frame.feet.rx * 1.5, 0);
    }

    if (kind === "roar" && crossed(0.85)) {
      // The fire dies out in a thunderclap: a flash and gold raining round the character.
      this.flash = 1;
      this.field.emit(GOLD_RAIN, frame, Math.round(14 * k));
    }

    if (this.burst > 1) this.burst = -1;
  }

  /** A ring spreading on the ground under the feet, while the ground piece shows. */
  private burstRing(
    place: AuraPlacement,
    frame: SpawnFrame,
    size: number,
    color: number,
  ): void {
    if (!place.ground) return;
    this.field.emit(
      {
        kind: "ring",
        rate: 0,
        from: "feet",
        life: [0.7, 0.7],
        speed: [0, 0],
        size: [size, size],
        squash: 0.36,
        colorFrom: color,
        front: 0,
      },
      { ...frame, feet: { ...frame.feet, rx: 0.1, ry: 0.1 } },
      1,
    );
  }

  /** The opening beat of a new burst. */
  private startBurst(
    kind: BurstKind,
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
  ): void {
    if (this.startMythicBurst(kind, place, frame, k)) return;

    switch (kind) {
      case "eruption":
        this.flash = 0.6;
        this.field.emit(
          {
            kind: "ember",
            rate: 0,
            from: "edge-low",
            life: [0.5, 0.9],
            speed: [55, 95],
            spread: 0.7,
            drag: 0.8,
            size: [2, 3.2],
            colors: 4,
            front: 0.5,
          },
          frame,
          Math.round(20 * k),
        );
        this.burstRing(place, frame, frame.feet.rx * 1.6, 1);
        break;
      case "freeze":
        this.flash = 0.8;
        this.field.emit(
          {
            kind: "flake",
            rate: 0,
            from: "body",
            life: [0.8, 1.3],
            speed: [15, 30],
            spread: TAU,
            drag: 1.2,
            size: [2.8, 3.6],
            colors: 3,
            front: 0.6,
          },
          frame,
          Math.round(10 * k),
        );
        this.burstRing(place, frame, frame.feet.rx * 1.7, 0);
        break;
      case "strike":
        this.startStrike(place, frame, k);
        break;
      case "spores":
        this.flash = 0.4;
        this.field.emit(
          {
            kind: "bubble",
            rate: 0,
            from: "body",
            life: [0.6, 1.1],
            speed: [16, 32],
            spread: TAU,
            drag: 1.4,
            size: [2, 3.6],
            colors: 3,
            colorFrom: 1,
            front: 0.5,
            pop: true,
          },
          frame,
          Math.round(14 * k),
        );
        this.burstRing(place, frame, frame.feet.rx * 1.5, 2);
        break;
      case "splash":
        this.startSplash(place, frame, k);
        break;
      case "conqueror":
        this.startConqueror(place, frame, k);
        break;
      case "roar":
        // The dragon rises after the pearl over the head; the fire streams in `stepDragon`.
        this.flash = 0.8;
        this.field.emit(
          {
            kind: "mote",
            rate: 0,
            from: "feet-rim",
            life: [0.8, 1.4],
            speed: [30, 60],
            spread: 0.6,
            drag: 1,
            size: [1.2, 2],
            colors: 2,
            front: 0.5,
          },
          frame,
          Math.round(14 * k),
        );
        this.burstRing(place, frame, frame.feet.rx * 2, 1);
        this.burstRing(place, frame, frame.feet.rx * 1.3, 0);
        break;
      case "sandspout":
        this.field.emit(
          {
            kind: "smoke",
            rate: 0,
            from: "feet-rim",
            life: [0.8, 1.2],
            speed: [20, 40],
            spread: 1,
            size: [4, 7],
            colorFrom: 2,
            colors: 2,
            front: 0.4,
          },
          frame,
          Math.round(8 * k),
        );
        break;
      case "whirl":
        this.field.emit(
          {
            kind: "leaf",
            rate: 0,
            from: "feet-rim",
            life: [1.4, 2],
            speed: [20, 40],
            spread: 1.2,
            sway: 30,
            size: [2.4, 3.4],
            colors: 3,
            front: 0.5,
            spin: [-2, 2],
          },
          frame,
          Math.round(8 * k),
        );
        break;
      case "ascend":
      case "aurora-flare":
      case "souls":
        this.flash = 0.5;
        this.field.emit(
          {
            kind: "glint",
            rate: 0,
            from: "body",
            life: [0.5, 0.9],
            speed: [0, 3],
            size: [4, 7],
            colors: 4,
            front: 0.7,
          },
          frame,
          Math.round(5 * k),
        );
        break;
      case "bloom":
        this.field.emit(
          {
            kind: "firefly",
            rate: 0,
            from: "feet-rim",
            life: [2.5, 4],
            speed: [8, 14],
            spread: 1,
            size: [1.2, 1.9],
            colors: 3,
            front: 0.5,
          },
          frame,
          Math.round(5 * k),
        );
        break;
      case "descend":
      case "implode":
      case "bloodrain":
      case "comet":
      case "sweep":
        this.flash = Math.max(this.flash, 0.3);
        break;
    }
  }

  /** The admin auras' own bursts; false for every other kind. */
  private startMythicBurst(
    kind: BurstKind,
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
  ): boolean {
    switch (kind) {
      case "coronation":
        this.flash = 0.6;
        this.field.emit(
          {
            kind: "glint",
            rate: 0,
            from: "edge-high",
            life: [0.5, 0.9],
            speed: [0, 3],
            size: [4, 7],
            colors: 2,
            front: 0.7,
          },
          frame,
          Math.round(6 * k),
        );

        return true;
      case "rebirth":
        // The phoenix flares up: a fountain of embers, then the pillar of fire falls.
        this.flash = 1;
        this.field.emit(
          {
            kind: "ember",
            rate: 0,
            from: "edge",
            life: [0.6, 1.1],
            speed: [55, 100],
            spread: 1,
            drag: 0.8,
            size: [2, 3.4],
            colors: 4,
            front: 0.5,
          },
          frame,
          Math.round(26 * k),
        );
        this.burstRing(place, frame, frame.feet.rx * 1.8, 1);

        return true;
      case "quake":
        // A new crack in the air, and the ground heaves.
        this.quakeSeed = Math.floor(this.rng() * 1e9);
        this.flash = 1;
        this.startConqueror(place, frame, k, false);
        this.burstRing(place, frame, frame.feet.rx * 3, 0);

        return true;
      case "judgement":
        this.startJudgement(place, frame, k);

        return true;
      default:
        return false;
    }
  }

  /**
   * Judgement: three heavy bolts from the sky striking round the character at once, a
   * shockwave of two rings and gold sparks raining down. Tooltips get the middle one.
   */
  private startJudgement(
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
  ): void {
    this.flash = 1;
    const { silhouette } = place;
    const offsets = place.ground ? [-16, 0, 16] : [0];

    for (const dx of offsets) {
      const ax = silhouette.head.x + dx * 1.6 + (this.rng() - 0.5) * 6;
      const ay = silhouette.head.y - 48;

      const bx =
        (place.ground ? place.feetX - place.x : silhouette.head.x) + dx;

      const by = place.ground
        ? place.feetY - place.y - 2 + Math.abs(dx) * 0.2
        : silhouette.head.y;

      this.bolts.push({
        points: jagged(ax, ay, bx, by, this.rng),
        ax,
        ay,
        bx,
        by,
        age: 0,
        life: TICK * 5,
        heavy: true,
      });
    }

    this.field.emit(GOLD_RAIN, frame, Math.round(18 * k));
    this.burstRing(place, frame, frame.feet.rx * 2.6, 1);
    this.burstRing(place, frame, frame.feet.rx * 1.6, 0);
  }

  /** Strike: one heavy bolt from the cloud (or above the head) down to the feet. */
  private startStrike(
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
  ): void {
    this.flash = 1;
    const { silhouette } = place;
    const cloud = place.ground ? this.cloudAt(place) : null;

    const ax = cloud
      ? cloud.x - place.x
      : silhouette.head.x + (this.rng() - 0.5) * 16;

    const ay = cloud ? cloud.y - place.y + 2 : silhouette.head.y - 40;
    const bx = place.ground ? place.feetX - place.x : silhouette.head.x;
    const by = place.ground ? place.feetY - place.y - 2 : silhouette.head.y;
    this.bolts.push({
      points: jagged(ax, ay, bx, by, this.rng),
      ax,
      ay,
      bx,
      by,
      age: 0,
      life: TICK * 4,
      heavy: true,
    });

    if (place.ground) {
      this.field.emit(
        {
          kind: "spark",
          rate: 0,
          from: "feet",
          life: [0.3, 0.6],
          speed: [40, 80],
          dir: -Math.PI / 2,
          spread: 2.6,
          gravity: 180,
          size: [0.8, 1.2],
          colors: 2,
          front: 0.6,
        },
        frame,
        Math.round(14 * k),
      );
      this.burstRing(place, frame, frame.feet.rx * 1.8, 1);
    }
  }

  /** Conqueror: the will released at once, a ring of heavy bolts outwards, stones thrown up, a shockwave. */
  private startConqueror(
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
    bolts = true,
  ): void {
    if (bolts) this.hakiBolts(place, 7, true);
    this.field.emit(
      {
        kind: "grain",
        rate: 0,
        from: "feet",
        life: [1.5, 2.2],
        speed: [60, 100],
        spread: 1.4,
        gravity: 160,
        size: [1.6, 2],
        colors: 2,
        colorFrom: 3,
        front: 0.5,
        land: "bounce",
        groundOnly: true,
      },
      frame,
      Math.round(14 * k),
    );
    this.burstRing(place, frame, frame.feet.rx * 2.2, 1);
    this.burstRing(place, frame, frame.feet.rx * 1.4, 0);
  }

  /** Splash: drops thrown up from the feet, or off the bottom edge of a tooltip. */
  private startSplash(
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
  ): void {
    this.flash = 0.5;

    if (place.ground) {
      this.field.emit(
        {
          kind: "drop",
          rate: 0,
          from: "feet",
          life: [0.6, 0.9],
          speed: [70, 110],
          dir: -Math.PI / 2,
          spread: 0.9,
          gravity: 260,
          size: [1, 1.6],
          colors: 3,
          front: 0.5,
          pop: true,
        },
        frame,
        Math.round(18 * k),
      );
      this.burstRing(place, frame, frame.feet.rx * 1.4, 1);
      this.burstRing(place, frame, frame.feet.rx * 2, 2);
    } else {
      this.field.emit(
        {
          kind: "drop",
          rate: 0,
          from: "edge-under",
          life: [0.5, 0.8],
          speed: [30, 60],
          dir: -Math.PI / 2,
          spread: 1.2,
          gravity: 200,
          size: [1, 1.5],
          colors: 3,
          front: 1,
          pop: true,
        },
        frame,
        Math.round(12 * k),
      );
    }
  }

  /** Burst visuals in the layer buffers; `front` picks the half in front of the character. */
  private drawBurst(b: Brush, place: AuraPlacement, front: boolean): void {
    if (this.burst < 0) return;
    const intensity = b.intensity;
    const t = clamp(this.burst, 0, 1);
    const { bounds } = place.silhouette;
    const [light, mid, dark] = this.rgb.tones;
    const cx = place.x + bounds.x + bounds.w / 2;
    const fade = envelope(t, 0.1, 0.2) * intensity;

    // On a tooltip only the back halves of rings show, so nothing crosses the text.
    if (
      !place.ground &&
      front &&
      (this.burstKind === "descend" ||
        this.burstKind === "implode" ||
        this.burstKind === "ascend")
    )
      return;

    if (this.burstKind === "roar") {
      this.drawRoar(place, front, t, light, intensity);

      return;
    }

    drawBurstScene(this.burstKind, b, {
      place,
      intensity,
      front,
      t,
      bounds,
      light,
      mid,
      dark,
      cx,
      fade,
    });
  }

  /** The roar: golden rings spreading from the dragon's jaws (not round a tooltip's text). */
  private drawRoar(
    place: AuraPlacement,
    front: boolean,
    t: number,
    light: Rgb,
    intensity: number,
  ): void {
    if (!front || !this.dragon || !place.ground || t > 0.7) return;
    const [hx, hy] = project(this.dragon.head, place.viewX, place.viewY);

    for (const delay of [0, 0.15, 0.3]) {
      const u = (t - delay) / 0.4;

      if (u < 0 || u > 1) continue;
      const r = 4 + u * 26;
      pixelEllipse(
        this.lit,
        hx,
        hy,
        r,
        r * 0.8,
        light,
        (1 - u) * intensity,
        0,
        2,
      );
    }
  }

  /** The dragon and its pearl, which live on the map, into the side's world buffers. */
  private drawDragonWorld(
    place: AuraPlacement,
    front: boolean,
    intensity: number,
  ): void {
    if (!this.dragon || !this.preset.fx.includes("dragon")) return;
    const b = this.brush(intensity);

    // Round a tooltip the dragon is flat and all drawn over the frame.
    if (place.ground)
      drawDragon(
        b,
        this.dragon,
        place.viewX,
        place.viewY,
        front,
        false,
        this.roaring,
        this.preset.dragonScales,
      );
    else if (front)
      drawDragon(
        b,
        this.dragon,
        place.viewX,
        place.viewY,
        front,
        true,
        this.roaring,
        this.preset.dragonScales,
      );

    if (place.ground ? this.pearl.z > 0 !== front : !front) return;
    const [px, py] = project(this.pearl, place.viewX, place.viewY);
    // The pearl's glow is soft and needs the pixel finish.
    this.litLayer.soft = true;
    drawPearl(b, px, py);
  }

  // --- lightning -----------------------------------------------------------------------------

  private updateBolts(
    place: AuraPlacement,
    frame: SpawnFrame,
    intensity: number,
  ): void {
    const edge = place.silhouette.edge;

    for (const bolt of this.bolts) {
      bolt.age += TICK;
      bolt.points = jagged(bolt.ax, bolt.ay, bolt.bx, bolt.by, this.rng);
    }

    this.bolts = this.bolts.filter((bolt) => bolt.age < bolt.life);
    this.nextBolt -= TICK * clamp(intensity, 0.3, 1.5);

    if (this.nextBolt > 0 || edge.length < 2) return;

    if (this.preset.fx.includes("haki")) {
      this.nextBolt = 0.15 + this.rng() * 0.3;
      this.hakiBolts(place, 1 + Math.floor(this.rng() * 2), false);

      return;
    }

    this.nextBolt = 0.4 + this.rng() * 1;
    const ground = place.ground && this.rng() < 0.4;
    const a = edge[Math.floor(this.rng() * edge.length)];

    if (!a) return;
    let bx: number;
    let by: number;

    if (ground) {
      const angle = this.rng() * TAU;
      const rx = groundRadius(place);
      bx = place.feetX - place.x + Math.cos(angle) * rx;
      by = place.feetY - place.y - 2 + Math.sin(angle) * rx * 0.36;
    } else {
      // Characters: the farthest of a few candidates, so arcs cross the body. Boxes: one about
      // 30 px away, so arcs crackle along the border instead of over the text.
      let best = edge[0] ?? a;
      let bestScore = -Infinity;

      for (let i = 0; i < 6; i++) {
        const c = edge[Math.floor(this.rng() * edge.length)];

        if (!c) continue;
        const d = Math.hypot(c.x - a.x, c.y - a.y);
        const score = place.ground ? d : -Math.abs(d - 30);

        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }

      bx = best.x + best.nx * 4;
      by = best.y + best.ny * 4;
    }

    const ax = a.x + a.nx * 4;
    const ay = a.y + a.ny * 4;
    this.bolts.push({
      points: jagged(ax, ay, bx, by, this.rng),
      ax,
      ay,
      bx,
      by,
      age: 0,
      life: TICK * (2 + Math.floor(this.rng() * 2)),
    });
    this.flash = 1;

    if (ground) {
      this.field.emit(
        {
          kind: "spark",
          rate: 0,
          from: "feet-rim",
          life: [0.25, 0.5],
          speed: [30, 70],
          spread: 2.2,
          gravity: 160,
          size: [0.7, 1.2],
          colors: 2,
          front: 0.6,
        },
        {
          ...frame,
          feet: { x: frame.ox + bx, y: frame.oy + by, rx: 1, ry: 1 },
        },
        7,
      );
    }
  }

  /**
   * Conqueror's will: black bolts cracking outwards from the outline, a few px to a couple of
   * tiles long, rather than arcing between two points of the body.
   */
  private hakiBolts(place: AuraPlacement, count: number, heavy: boolean): void {
    const edge = place.silhouette.edge;

    for (let n = 0; n < count; n++) {
      const a = edge[Math.floor(this.rng() * edge.length)];

      if (!a) continue;
      const reach = (heavy ? 22 : 10) + this.rng() * (heavy ? 22 : 16);
      const side = (this.rng() - 0.5) * reach * 0.6;
      const ax = a.x + a.nx;
      const ay = a.y + a.ny;
      const bx = a.x + a.nx * reach - a.ny * side;
      const by = a.y + a.ny * reach + a.nx * side;
      this.bolts.push({
        points: jagged(ax, ay, bx, by, this.rng),
        ax,
        ay,
        bx,
        by,
        age: 0,
        life: TICK * (heavy ? 3 : 2),
        heavy,
        haki: true,
      });
    }

    this.flash = Math.max(this.flash, heavy ? 1 : 0.4);
  }

  /**
   * A black bolt in a red rim, all in pixels on the covering layer (additive light can't draw
   * black): red on the neighbouring pixels first, the black core over it, a hot tip.
   */
  private drawHakiBolt(place: AuraPlacement, bolt: Bolt, alpha: number): void {
    const dim = this.useDim();
    const [light, mid] = this.rgb.tones;
    const points = bolt.points;

    const segments = (
      fn: (x0: number, y0: number, x1: number, y1: number) => void,
    ) => {
      for (let i = 0; i < points.length - 2; i += 2)
        fn(
          place.x + (points[i] ?? 0),
          place.y + (points[i + 1] ?? 0),
          place.x + (points[i + 2] ?? 0),
          place.y + (points[i + 3] ?? 0),
        );
    };

    const rim = bolt.heavy ? 2 : 1;

    for (const [ox, oy] of HAKI_RIM) {
      const dx = ox * rim;
      const dy = oy * rim;
      segments((x0, y0, x1, y1) =>
        pixelLine(
          dim,
          x0 + dx,
          y0 + dy,
          x1 + dx,
          y1 + dy,
          mid,
          alpha * 0.9,
          alpha * 0.6,
        ),
      );
    }

    segments((x0, y0, x1, y1) =>
      pixelLine(dim, x0, y0, x1, y1, HAKI_CORE, alpha, alpha),
    );

    if (bolt.heavy)
      segments((x0, y0, x1, y1) =>
        pixelLine(dim, x0 + 1, y0, x1 + 1, y1, HAKI_CORE, alpha, alpha),
      );
    const tipX = place.x + (points[points.length - 2] ?? 0);
    const tipY = place.y + (points[points.length - 1] ?? 0);
    pixelGlint(this.lit, tipX, tipY, 1, [255, 220, 220], light, alpha);
  }

  private drawBolts(place: AuraPlacement, intensity: number): void {
    const ctx = this.lit;
    const mid = this.rgb.tones[1];

    for (const bolt of this.bolts) {
      const fade = bolt.age < TICK ? 1 : 0.6;

      if (bolt.haki) {
        this.drawHakiBolt(place, bolt, fade * Math.min(1, intensity));
        continue;
      }

      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = rgba(mid, 0.6 * fade * intensity);
      ctx.lineWidth = bolt.heavy ? 5 : 3;
      ctx.beginPath();

      for (let i = 0; i < bolt.points.length; i += 2) {
        const x = place.x + (bolt.points[i] ?? 0);
        const y = place.y + (bolt.points[i + 1] ?? 0);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      const a = fade * Math.min(1, intensity);

      for (let i = 0; i < bolt.points.length - 2; i += 2) {
        const x0 = place.x + (bolt.points[i] ?? 0);
        const y0 = place.y + (bolt.points[i + 1] ?? 0);
        const x1 = place.x + (bolt.points[i + 2] ?? 0);
        const y1 = place.y + (bolt.points[i + 3] ?? 0);

        pixelLine(ctx, x0, y0, x1, y1, [255, 255, 255], a, a);

        if (bolt.heavy)
          pixelLine(ctx, x0 + 1, y0, x1 + 1, y1, [255, 255, 255], a, a);
      }
    }
  }

  private updateHeartbeat(frame: SpawnFrame): void {
    // Two rings per beat period: the strong beat and the echo a fifth of it later (`heartbeat`).
    const period = 1.15;
    const index = Math.floor((this.time / period) * 5);

    if (index === this.beatIndex) return;
    this.beatIndex = index;
    const phase = index % 5;

    if (phase !== 0 && phase !== 1) return;
    const size = frame.feet.rx * (phase ? 1.05 : 1.35);
    this.field.emit(
      {
        kind: "ring",
        rate: 0,
        from: "feet",
        life: [0.9, 0.9],
        speed: [0, 0],
        size: [size, size],
        squash: 0.36,
        front: 0,
      },
      { ...frame, feet: { ...frame.feet, rx: 0.1, ry: 0.1 } },
      1,
    );
  }

  // --- particles -----------------------------------------------------------------------------

  private drawParticles(place: AuraPlacement, front: boolean): void {
    const palette = this.rgb.particles;

    for (const p of this.field.particles) {
      if (p.front !== front) continue;
      this.litLayer.used = true;
      const x = Math.round(p.x - place.viewX);
      const y = Math.round(p.y - place.viewY);
      const age = p.age / p.life;
      const color = palette[p.color % palette.length] ?? this.rgb.rim;

      const covering = COVERING_PARTICLES.has(p.kind);

      if (SOFT_PARTICLES.has(p.kind)) {
        this.litLayer.soft = true;
        this.dimLayer.soft = true;
      }

      PARTICLE_PAINTERS[p.kind](
        this.lit,
        covering ? this.useDim() : this.dim,
        p,
        x,
        y,
        age,
        color,
        palette,
        this.tick,
      );
    }
  }
}

// --- helpers -----------------------------------------------------------------------------

/** A preset's colours, parsed once per preset. */
interface AuraColors {
  rim: Rgb;
  haze: Rgb;
  /** Outline tones, light to dark. */
  tones: readonly [Rgb, Rgb, Rgb];
  particles: Rgb[];
}

function colorsOf(preset: AuraPreset): AuraColors {
  const [light, mid, dark] = preset.tones;

  return {
    rim: hexToRgb(preset.rim),
    haze: hexToRgb(preset.haze),
    tones: [hexToRgb(light), hexToRgb(mid), hexToRgb(dark)],
    particles: preset.particles.map(hexToRgb),
  };
}

/** Heavenly Dragon: the spark the pearl sheds, drifting down as it fades. */
const PEARL_SPARK: EmitterSpec = {
  kind: "mote",
  rate: 0,
  from: "feet",
  life: [0.5, 0.9],
  speed: [2, 6],
  dir: Math.PI / 2,
  spread: 1,
  size: [0.8, 1.2],
  colors: 2,
  front: 0.5,
};

/** Heavenly Dragon: golden fire from the jaws; `dir` and `front` follow the head. */
const DRAGON_FIRE: EmitterSpec = {
  kind: "ember",
  rate: 0,
  from: "feet",
  life: [0.45, 0.8],
  speed: [70, 110],
  spread: 0.45,
  drag: 0.6,
  size: [2.6, 3.6],
  colors: 4,
  front: 0.5,
};

/** Heavenly Dragon: the gold raining round the character as the roar ends. */
const GOLD_RAIN: EmitterSpec = {
  kind: "spark",
  rate: 0,
  from: "above",
  life: [0.6, 1],
  speed: [20, 40],
  dir: Math.PI / 2,
  spread: 0.5,
  gravity: 160,
  size: [0.8, 1.2],
  colors: 2,
  front: 0.5,
  groundOnly: true,
};

/** A point `distance` px along a path running round a tooltip's box, 8 px outside its sides. */
function tipPathAt(
  { x, y, w, h }: { x: number; y: number; w: number; h: number },
  distance: number,
): Point {
  const out = 8;
  const top = w + 2 * out;
  const side = h + 2 * out;
  let d = distance % (2 * (top + side));

  if (d < top) return { x: x - out + d, y: y - out };

  if ((d -= top) < side) return { x: x + w + out, y: y - out + d };

  if ((d -= side) < top) return { x: x + w + out - d, y: y + h + out };

  return { x: x - out, y: y + h + out - (d - top) };
}

/**
 * Keeps the dragon flat and out of a tooltip: a segment that cut a corner into the box,
 * grown by `margin`, is pushed back out through its nearest side, so it never crosses the text.
 */
function pushOutOfBox(
  dragon: Dragon,
  { x, y, w, h }: { x: number; y: number; w: number; h: number },
  margin: number,
): void {
  for (const seg of dragon.segments) {
    seg.z = 0;
    const left = seg.x - (x - margin);
    const right = x + w + margin - seg.x;
    const top = seg.y - (y - margin);
    const bottom = y + h + margin - seg.y;

    if (left <= 0 || right <= 0 || top <= 0 || bottom <= 0) continue;
    const nearest = Math.min(left, right, top, bottom);

    if (nearest === left) seg.x = x - margin;
    else if (nearest === right) seg.x = x + w + margin;
    else if (nearest === top) seg.y = y - margin;
    else seg.y = y + h + margin;
  }
}

/** Camera drift a world buffer can move by between ticks. */
const VIEW_SLACK = 16;

/** Whether an aura at `place` lands inside a `width`×`height` view at all. */
export function isAuraInView(
  place: AuraPlacement,
  width: number,
  height: number,
  above = 0,
): boolean {
  const box = boxOf(place);

  return (
    box.ox < width + VIEW_SLACK &&
    box.oy - above < height + VIEW_SLACK &&
    box.ox + box.w > -VIEW_SLACK &&
    box.oy + box.h > -VIEW_SLACK
  );
}

/**
 * The screen rect an aura at `place` can paint into this frame: its buffers
 * plus the drift a character or the camera makes between ticks.
 */
export function auraScreenBox(place: AuraPlacement, above = 0) {
  const box = boxOf(place);

  return {
    x: box.ox - VIEW_SLACK,
    y: box.oy - above - VIEW_SLACK,
    width: box.w + VIEW_SLACK * 2,
    height: box.h + above + VIEW_SLACK * 2,
  };
}

function boxOf(place: AuraPlacement): Box {
  const pad = place.silhouette.pad + MARGIN;

  return {
    ox: Math.round(place.x) - pad,
    oy: Math.round(place.y) - pad,
    w: place.silhouette.width + pad * 2,
    h: place.silhouette.height + pad * 2,
  };
}

function blitLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  box: Box,
  mode: GlobalCompositeOperation,
  dx: number,
  dy: number,
): void {
  const { bounds } = layer;

  if (!layer.used || !bounds) return;
  const w = bounds.right - bounds.left + 1;
  const h = bounds.bottom - bounds.top + 1;
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = 1;
  ctx.drawImage(
    layer.canvas,
    bounds.left,
    bounds.top,
    w,
    h,
    box.ox + dx + bounds.left,
    box.oy + dy + bounds.top,
    w,
    h,
  );
}

const WHITE: Rgb = [255, 255, 255];

/** The prism gradient runs from the top-left corner to this fraction of the width at the bottom. */
const RAINBOW_RUN = 0.3;

/**
 * The colour at pixel `i` of a `width`×`height` buffer: the only colour, or the rainbow
 * gradient through evenly spaced `stops` sampled at the pixel centre, as `rainbow` paints it.
 */
function colorAt(
  stops: readonly Rgb[],
  i: number,
  width: number,
  height: number,
): Rgb {
  const first = stops[0] ?? WHITE;

  if (stops.length < 2) return first;
  const gx = width * RAINBOW_RUN;
  const x = (i % width) + 0.5;
  const y = Math.floor(i / width) + 0.5;
  const t = clamp((x * gx + y * height) / (gx * gx + height * height), 0, 1);
  const position = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const from = stops[index] ?? first;
  const to = stops[index + 1] ?? from;
  const k = position - index;

  return [
    from[0] + (to[0] - from[0]) * k,
    from[1] + (to[1] - from[1]) * k,
    from[2] + (to[2] - from[2]) * k,
  ];
}

/** Sets pixel `i` to `color` at `alpha`; the clamped buffer rounds the channels. */
function writePixel(
  data: Uint8ClampedArray,
  i: number,
  color: Rgb,
  alpha: number,
): void {
  const o = i * 4;
  data[o] = color[0];
  data[o + 1] = color[1];
  data[o + 2] = color[2];
  data[o + 3] = alpha * 255;
}

let scratch: HTMLCanvasElement | null = null;

/** `mask` filled with `fill` through its alpha, on a shared scratch canvas valid until the next call. */
function tint(
  mask: HTMLCanvasElement,
  fill: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) => string | CanvasGradient,
): HTMLCanvasElement {
  if (!scratch || scratch.width < mask.width || scratch.height < mask.height) {
    scratch = createCanvas(
      Math.max(mask.width, scratch?.width ?? 0),
      Math.max(mask.height, scratch?.height ?? 0),
    );
  }

  const ctx = context2d(scratch);
  ctx.globalCompositeOperation = "copy";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = fill(ctx, mask.width, mask.height);
  ctx.fillRect(0, 0, mask.width, mask.height);
  ctx.globalCompositeOperation = "source-over";

  return scratch;
}
