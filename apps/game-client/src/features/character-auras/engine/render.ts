import {
  clamp,
  envelope,
  hexToRgb,
  hslToRgb,
  mulberry32,
  noise1,
  ramp,
  rgba,
  smoothstep,
  TAU,
  type Rgb,
  type Rng,
} from "./math";
import {
  footprint,
  ParticleField,
  type Particle,
  type ParticleKind,
  type SpawnFrame,
} from "./particles";
import { Spring } from "./physics";
import {
  DIAG,
  LEAF_POSES,
  ORTHO,
  drawDot,
  drawRunes,
  hot,
  jagged,
  pixelArc,
  pixelDisc,
  pixelEllipse,
  pixelGlint,
  pixelLine,
  pixelPlus,
  plot,
  softEllipse,
} from "./paint";
import { posterizeAlpha } from "./pixel";
import {
  drawCloud,
  drawCurtain,
  drawDustSwirl,
  drawGlyphOrbit,
  drawMagicCircle,
  drawSkulls,
  drawSouls,
  drawTipDeco,
  type Brush,
} from "./decor";
import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import { AURAS, type AuraPreset, type BurstKind } from "./presets";
import { context2d, createCanvas, type AuraSilhouette } from "./silhouette";

/** Where one frame of an aura goes. */
export interface AuraPlacement {
  silhouette: AuraSilhouette;
  /** Screen position of the unpadded silhouette's top-left. */
  x: number;
  y: number;
  /** Particle space minus screen space: the camera for characters, 0 for tooltips. */
  viewX: number;
  viewY: number;
  /** Ground under the feet; tooltips have none. */
  ground: boolean;
  /** Bottom centre of the silhouette on screen. */
  feetX: number;
  feetY: number;
}

/**
 * The animation steps at 10 fps, as the game's own animated item icons do (120 ms frames);
 * a smooth 60 fps glow looks pasted onto pixel art.
 */
export const TICK = 0.1;

/** Room around the padded silhouette for particles drifting away from it. */
const MARGIN = 28;

/** Alpha and colour steps of the pixel finish. */
const ALPHA_LEVELS = 4;

const COLOR_LEVELS = 7;

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
};

/** Astral orbits: height on the body, angular speed, tilt and palette colour. */
const ORBITS = [
  { at: 0.3, speed: 1.7, tilt: -0.22, color: 0 },
  { at: 0.58, speed: -1.25, tilt: 0.16, color: 3 },
  { at: 0.86, speed: 2.1, tilt: -0.08, color: 2 },
];

/** An offscreen layer, re-rendered only when its tick or position changes. */
interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  key: string;
  used: boolean;
}

/** What every burst visual draws from: the placement, the burst's progress and the tones. */
interface BurstScene {
  place: AuraPlacement;
  intensity: number;
  /** Which half is drawn: in front of the character or behind it. */
  front: boolean;
  /** Burst progress, 0..1. */
  t: number;
  bounds: AuraSilhouette["bounds"];
  light: Rgb;
  mid: Rgb;
  dark: Rgb;
  /** Horizontal centre of the opaque bounds on screen. */
  cx: number;
  /** `intensity` faded in and out over the burst. */
  fade: number;
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
    key: "",
    used: false,
  };
}

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
  /** Whether the periodic burst plays; one already running finishes. */
  bursts = true;
  /** Whether the ground piece under the feet (circle, runes, ripples…) is drawn. */
  showGround = true;
  /** Props follow the head through this spring, so they trail a walk. */
  private spring: Spring | null = null;
  private lastCenter: { x: number; y: number } | null = null;
  private motion = { vx: 0, vy: 0 };
  private lastPrint: { x: number; y: number; side: number } | null = null;
  /** The head in particle space at the last tick: where the spring is pulled to. */
  private headTarget = { x: 0, y: 0 };
  private rgb: AuraColors;
  private readonly layers = {
    backDim: createLayer(),
    backLit: createLayer(),
    frontDim: createLayer(),
    frontLit: createLayer(),
  };
  /** The layer pair drawn into right now; draw helpers pick `lit` (additive) or `dim` (covering). */
  private lit!: CanvasRenderingContext2D;
  private dim!: CanvasRenderingContext2D;
  private dimLayer!: Layer;

  constructor(id: CharacterAuraId, seed = Math.floor(Math.random() * 1e9)) {
    this.rng = mulberry32(seed);
    this.field = new ParticleField(this.rng);
    this.preset = AURAS[id];
    this.rgb = colorsOf(this.preset);
  }

  get id(): CharacterAuraId {
    return this.preset.id;
  }

  setPreset(id: CharacterAuraId): void {
    if (id === this.preset.id) return;
    this.preset = AURAS[id];
    this.rgb = colorsOf(this.preset);
    this.field.clear();
    this.bolts = [];
    this.burst = -1;

    for (const layer of Object.values(this.layers)) layer.key = "";
  }

  /** Moves particles along when particle space jumps, e.g. the camera snapping on a teleport. */
  shift(dx: number, dy: number): void {
    this.field.shift(dx, dy);
  }

  update(dt: number, place: AuraPlacement | null, intensity: number): void {
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

    if (fx.includes("heartbeat") && place.ground && this.showGround)
      this.updateHeartbeat(frame);
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

    if (fx.includes("orbits"))
      frame.attractors = this.orbitHeads(place).map(([x, y]) => ({
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
    const box = boxOf(place);
    const { backDim, backLit } = this.layers;

    if (this.begin(backLit, backDim, box, place)) {
      if (place.ground && p.ground && this.showGround)
        this.drawGround(place, p.ground, intensity);

      if (p.fx.includes("rays")) this.drawRays(place, intensity);

      if (p.fx.includes("moon")) this.drawMoon(place, intensity);

      if (p.fx.includes("flicker-tongues")) this.drawTongues(place, intensity);

      if (p.fx.includes("orbits")) this.drawOrbits(place, intensity, false);

      if (p.fx.includes("frost-shards") && place.ground && this.showGround)
        this.drawShards(place, intensity, false);
      this.drawDecor(place, intensity, false);
      this.drawBurst(place, intensity, false);
      this.drawParticles(place, false);
      this.finish(backLit, backDim, box);
    }

    // The game's context goes back as it came, even if a draw throws.
    ctx.save();

    try {
      blitLayer(ctx, backDim, box, "source-over");
      this.drawOutline(ctx, place, glow);
      blitLayer(ctx, backLit, box, "lighter");
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
    const box = boxOf(place);
    const { frontDim, frontLit } = this.layers;

    if (this.begin(frontLit, frontDim, box, place)) {
      if (p.fx.includes("frost-shards") && place.ground && this.showGround)
        this.drawShards(place, intensity, true);
      this.drawParticles(place, true);

      if (p.fx.includes("orbits")) this.drawOrbits(place, intensity, true);

      if (p.fx.includes("lightning")) this.drawBolts(place, intensity);
      this.drawDecor(place, intensity, true);
      this.drawBurst(place, intensity, true);
      this.finish(frontLit, frontDim, box);
    }

    ctx.save();

    try {
      if (place.ground) {
        ctx.globalCompositeOperation = "lighter";
        this.blitMask(
          ctx,
          place,
          place.silhouette.sil,
          this.rgb.tones[0],
          Math.min(0.5, p.inner * glow),
        );
      }

      blitLayer(ctx, frontDim, box, "source-over");
      blitLayer(ctx, frontLit, box, "lighter");
    } finally {
      ctx.restore();
    }
  }

  /** Prepares both buffers of a layer pair; false when the cached render is still valid. */
  private begin(
    lit: Layer,
    dim: Layer,
    box: Box,
    place: AuraPlacement,
  ): boolean {
    const key = `${this.tick}|${box.ox}|${box.oy}|${Math.round(place.viewX)}|${Math.round(place.viewY)}|${box.w}x${box.h}`;

    if (lit.key === key) return false;
    lit.key = key;

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
    }

    this.lit = lit.ctx;
    this.dim = dim.ctx;
    this.dimLayer = dim;

    return true;
  }

  /** Snaps what was drawn to the pixel grid: stepped alpha and flat, dithered tones. */
  private finish(lit: Layer, dim: Layer, box: Box): void {
    lit.used = true;

    for (const layer of [lit, dim]) {
      if (!layer.used) continue;
      const image = layer.ctx.getImageData(0, 0, box.w, box.h);
      posterizeAlpha(
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
  ): void {
    const { silhouette } = place;
    const p = this.preset;

    if (silhouette.bands) {
      const [light, mid, dark] = this.rgb.tones;
      const alphas = [0.95, 0.8, 0.7, 0.55];
      const tones = [light, mid, dark, dark];
      ctx.globalCompositeOperation = "source-over";

      for (const [band, mask] of silhouette.bands.entries()) {
        // The outer dither only shows near the top of a pulse, so the glow visibly breathes.
        const alpha = alphas[band] ?? 0;

        const a =
          band === 3
            ? smoothstep(0.75, 1.05, glow) * alpha
            : clamp(alpha * glow, 0, 1);

        this.blitMask(ctx, place, mask, tones[band] ?? dark, a, band);
      }

      const inner = silhouette.bands[0];

      if (this.flash > 0.05 && inner) {
        ctx.globalCompositeOperation = "lighter";
        this.blitMask(ctx, place, inner, [255, 255, 255], this.flash * 0.7);
      }

      return;
    }

    if (silhouette.far) {
      ctx.globalCompositeOperation = p.darkHaze ? "source-over" : "lighter";
      this.blitMask(
        ctx,
        place,
        silhouette.far,
        this.rgb.haze,
        Math.min(1, p.far * glow),
      );
    }

    if (silhouette.near) {
      ctx.globalCompositeOperation = "lighter";
      this.blitMask(
        ctx,
        place,
        silhouette.near,
        this.rgb.rim,
        Math.min(1, p.near * glow),
      );
    }
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
    const gradient = sctx.createLinearGradient(0, 0, w * 0.3, h);
    const shift = this.time * 90 + band * 40;

    for (let i = 0; i <= 6; i++)
      gradient.addColorStop(
        i / 6,
        rgba(hslToRgb(shift + i * 60, 1, band ? 0.55 : 0.72), 1),
      );

    return gradient;
  }

  // --- decorations ---------------------------------------------------------------------------

  private brush(intensity: number): Brush {
    return {
      lit: this.lit,
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
  private drawDecor(
    place: AuraPlacement,
    intensity: number,
    front: boolean,
  ): void {
    const b = this.brush(intensity);
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
      this.advanceBurst(kind, frame, k);

      return;
    }

    if (!this.bursts) return;
    this.nextBurst -= TICK;

    if (this.nextBurst > 0) return;
    this.nextBurst = 4.5 + this.rng() * 3;
    this.burst = 0;
    this.startBurst(kind, place, frame, k);
  }

  /** The running burst's per-tick spawns and the beats it crosses this tick. */
  private advanceBurst(kind: BurstKind, frame: SpawnFrame, k: number): void {
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

    if (this.burst > 1) this.burst = -1;
  }

  /** A ring spreading on the ground under the feet, while the ground piece shows. */
  private burstRing(
    place: AuraPlacement,
    frame: SpawnFrame,
    size: number,
    color: number,
  ): void {
    if (!place.ground || !this.showGround) return;
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
  private drawBurst(
    place: AuraPlacement,
    intensity: number,
    front: boolean,
  ): void {
    if (this.burst < 0) return;
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

    this.drawBurstScene(this.burstKind, {
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

  private drawBurstScene(kind: BurstKind, scene: BurstScene): void {
    switch (kind) {
      case "descend":
        this.drawDescendBurst(scene);
        break;
      case "implode":
        this.drawImplodeBurst(scene);
        break;
      case "comet":
        this.drawCometBurst(scene);
        break;
      case "bloom":
        this.drawBloomBurst(scene);
        break;
      case "sweep":
        this.drawSweepBurst(scene);
        break;
      case "whirl":
        this.drawWhirlBurst(scene);
        break;
      case "sandspout":
        this.drawSandspoutBurst(scene);
        break;
      case "souls":
        this.drawSoulsBurst(scene);
        break;
      case "splash":
        this.drawSplashBurst(scene);
        break;
      case "ascend":
        this.drawAscendBurst(scene);
        break;
      case "eruption":
      case "freeze":
      case "strike":
      case "spores":
      case "bloodrain":
      case "aurora-flare":
        break;
    }
  }

  private drawDescendBurst({
    place,
    front,
    t,
    bounds,
    light,
    mid,
    dark,
    cx,
    fade,
  }: BurstScene): void {
    // A halo lowering from above the head to the feet, with two fainter echoes behind it.
    const rx = Math.round(bounds.w * 0.55 + 4);
    const ry = Math.max(2, Math.round(rx * 0.3));
    const top = place.y + bounds.y - 10;

    const bottom = place.ground
      ? place.feetY - 2
      : place.y + bounds.y + bounds.h;

    const y = top + (bottom - top) * t;
    pixelArc(this.lit, cx, y, rx, ry, light, fade, front);
    pixelArc(this.lit, cx, y - 3, rx, ry, mid, fade * 0.55, front);
    pixelArc(this.lit, cx, y - 6, rx, ry, dark, fade * 0.3, front);
  }

  private drawImplodeBurst({
    place,
    front,
    t,
    bounds,
    light,
    mid,
    dark,
    cx,
    fade,
  }: BurstScene): void {
    // A sphere of light collapsing into the chest, then a flash and sparks (`updateBurst`).
    if (t > 0.85 || front) return;
    const cy = place.y + bounds.y + bounds.h * 0.45;
    const base = Math.max(bounds.w, bounds.h) * 0.5 + 22;
    const r = Math.max(1, base * (1 - t / 0.85));
    const squash = place.ground ? 0.85 : bounds.h / bounds.w;
    pixelEllipse(
      this.lit,
      cx,
      cy,
      r,
      Math.max(1, r * squash),
      light,
      fade,
      0,
      1,
    );
    pixelEllipse(
      this.lit,
      cx,
      cy,
      r + 1,
      Math.max(1, (r + 1) * squash),
      mid,
      fade * 0.7,
      0,
      1,
    );
    pixelEllipse(
      this.lit,
      cx,
      cy,
      r + 3,
      Math.max(1, (r + 3) * squash),
      dark,
      fade * 0.4,
      0,
      2,
    );
  }

  private drawCometBurst({
    place,
    intensity,
    front,
    t,
    bounds,
    light,
    mid,
    dark,
    cx,
  }: BurstScene): void {
    // A shooting star arcing over the head, left to right, with a three-tone tail.
    if (front) return;
    const x0 = cx - bounds.w / 2 - 34;
    const x1 = cx + bounds.w / 2 + 34;

    const at = (u: number): [number, number] => [
      x0 + (x1 - x0) * u,
      place.y + bounds.y - 6 - Math.sin(Math.PI * u) * 16,
    ];

    for (let i = 16; i >= 1; i--) {
      const u = t - i * 0.018;

      if (u < 0) continue;
      const [x, y] = at(u);
      const color = i < 4 ? light : i < 9 ? mid : dark;
      plot(this.lit, x, y, color, (1 - i / 17) * intensity);

      if (i < 6) plot(this.lit, x, y + 1, color, (1 - i / 6) * 0.6 * intensity);
    }

    const [x, y] = at(t);
    pixelGlint(this.lit, x, y, 2, [255, 255, 255], light, intensity);
  }

  private drawBloomBurst({
    place,
    intensity,
    front,
    t,
    light,
  }: BurstScene): void {
    // Pixel flowers opening one after another round the feet, then wilting.
    if (!place.ground) return;
    const rx = groundRadius(place) * 0.95;
    const ry = rx * 0.36;
    const petals = this.rgb.particles;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU + 0.2;

      if (Math.sin(angle) > 0 !== front) continue;
      const local = (t - i * 0.06) / 0.6;

      if (local < 0 || local > 1) continue;
      const stage = local < 0.15 ? 0 : local < 0.3 ? 1 : 2;
      const a = envelope(local, 0, 0.3) * intensity;
      const x = place.feetX + Math.cos(angle) * rx;
      const y = place.feetY - 2 + Math.sin(angle) * ry;
      const petal = petals[i % 3] ?? light;
      plot(this.lit, x, y + 1, [90, 160, 60], a);
      plot(this.lit, x, y, stage ? [255, 224, 122] : petal, a);

      if (stage >= 1)
        for (const [ox, oy] of ORTHO) plot(this.lit, x + ox, y + oy, petal, a);

      if (stage >= 2)
        for (const [ox, oy] of DIAG)
          plot(this.lit, x + ox, y + oy, petal, a * 0.5);
    }
  }

  private drawSweepBurst({
    place,
    intensity,
    front,
    t,
    bounds,
  }: BurstScene): void {
    // Prism: a rainbow band climbing the outline.
    if (!front) return;
    const row = place.y + bounds.y + bounds.h * (1 - t);

    for (const site of place.silhouette.edge) {
      const y = place.y + site.y;

      if (Math.abs(y - row) > 2) continue;
      plot(
        this.lit,
        place.x + site.x + site.nx,
        y,
        hslToRgb(this.time * 200 + site.x * 8, 1, 0.65),
        intensity,
      );
    }

    for (
      let x = Math.round(place.x + bounds.x) - 2;
      x <= place.x + bounds.x + bounds.w + 2;
      x += 2
    ) {
      plot(
        this.lit,
        x,
        row,
        hslToRgb(this.time * 200 + x * 6, 1, 0.7),
        0.5 * intensity,
      );
    }
  }

  private drawWhirlBurst({
    place,
    front,
    t,
    bounds,
    light,
    mid,
    cx,
    fade,
  }: BurstScene): void {
    // Petals spiralling up round the body, behind and in front.
    const rx = bounds.w * 0.65 + 6;

    const bottom = place.ground
      ? place.feetY - 2
      : place.y + bounds.y + bounds.h;

    const rise = bounds.h + 16;

    for (let i = 0; i < 14; i++) {
      const angle = t * TAU * 1.6 + (i * TAU) / 14;
      const depth = Math.sin(angle);

      if (depth > 0 !== front) continue;
      const u = (t * 1.2 + i / 14) % 1;
      const x = cx + Math.cos(angle) * rx * (0.8 + u * 0.4);
      const y = bottom - u * rise + depth * 3;
      const petal = this.rgb.particles[i % 3] ?? light;
      plot(this.useDim(), x, y, petal, fade);
      plot(this.useDim(), x + 1, y, this.rgb.particles[2] ?? mid, fade);
    }
  }

  private drawSandspoutBurst({
    place,
    front,
    t,
    light,
    mid,
    cx,
    fade,
  }: BurstScene): void {
    // A tornado of dashed rings, widening upwards, spinning fast.
    if (!place.ground) return;
    const height = Math.sin(Math.PI * t) * 1.1;

    for (let level = 0; level < 12; level++) {
      const y = place.feetY - 2 - level * 5 * height;
      const r = 5 + level * 2.3;

      for (let arm = 0; arm < 2; arm++) {
        for (let s2 = 0; s2 < 16; s2++) {
          const angle = this.time * 9 + level * 0.7 + arm * Math.PI + s2 * 0.12;

          const depth = Math.sin(angle);

          if (depth > 0 !== front) continue;
          plot(
            this.lit,
            cx + Math.cos(angle) * r,
            y + depth * r * 0.25,
            s2 < 4 ? light : mid,
            Math.min(1, (1.2 - s2 / 16) * fade),
          );
        }
      }
    }
  }

  private drawSoulsBurst({
    place,
    intensity,
    front,
    t,
    bounds,
  }: BurstScene): void {
    if (!front) return;

    if (place.ground)
      drawSouls(this.brush(intensity), place.feetX, place.feetY, t);
    else {
      // Tooltips: one soul up each side of the box, clear of the text.
      const bottom = place.y + bounds.y + bounds.h + 4;
      drawSouls(this.brush(intensity), place.x + bounds.x - 6, bottom, t, [0]);
      drawSouls(
        this.brush(intensity),
        place.x + bounds.x + bounds.w + 6,
        bottom,
        t,
        [0],
      );
    }
  }

  private drawSplashBurst({
    place,
    front,
    t,
    light,
    mid,
    cx,
    fade,
  }: BurstScene): void {
    // A water column shooting up from the feet and collapsing.
    if (!place.ground || !front || t > 0.5) return;
    const height = Math.sin((Math.PI * t) / 0.5) * 30;

    for (let dx = -2; dx <= 2; dx++) {
      const top = place.feetY - 2 - height * (1 - Math.abs(dx) * 0.2);

      for (let y = place.feetY - 2; y > top; y -= 1) {
        plot(
          this.lit,
          cx + dx,
          y,
          Math.abs(dx) < 2 ? light : mid,
          fade * (0.5 + 0.5 * ((y - top) / height)),
        );
      }
    }
  }

  private drawAscendBurst({
    place,
    front,
    t,
    bounds,
    light,
    cx,
    fade,
  }: BurstScene): void {
    // The magic circle lifting off the ground to above the head.
    const bottom = place.ground
      ? place.feetY - 2
      : place.y + bounds.y + bounds.h;

    const top = place.y + bounds.y - 10;
    const y = bottom + (top - bottom) * t;
    const rx = place.ground ? groundRadius(place) : bounds.w / 2 + 6;
    const ry = Math.max(2, Math.round(rx * 0.36));

    if (front) pixelArc(this.lit, cx, y, rx, ry, light, fade, true);
    else drawMagicCircle(this.brush(fade), cx, y, rx, ry, 1);
  }

  // --- ground ------------------------------------------------------------------------------

  private drawGround(
    place: AuraPlacement,
    ground: NonNullable<AuraPreset["ground"]>,
    intensity: number,
  ): void {
    const color = hexToRgb(ground.color);
    const [light, , dark] = this.rgb.tones;
    const rx = groundRadius(place);
    const ry = Math.round(rx * 0.36);
    const x = Math.round(place.feetX);
    const y = Math.round(place.feetY) - 2;
    const pulse = this.preset.pulse(this.time) + this.flash;
    const a = ground.alpha * intensity * clamp(pulse, 0.5, 1.6);
    const t = this.time;
    const lit = this.lit;

    switch (ground.style) {
      case "disc":
        softEllipse(lit, x, y, rx * 1.15, ry * 1.15, color, a * 0.8);
        pixelEllipse(lit, x, y, rx, ry, light, a * 0.5, 0, 1);
        break;
      case "ring":
        softEllipse(lit, x, y, rx, ry, color, a * 0.35);
        pixelEllipse(
          lit,
          x,
          y,
          rx + (Math.sin(t * 2) > 0 ? 1 : 0),
          ry,
          light,
          a,
          0,
          1,
        );
        pixelEllipse(
          lit,
          x,
          y,
          Math.round(rx * 0.62),
          Math.round(ry * 0.62),
          color,
          a * 0.6,
          0,
          1,
        );
        break;
      case "runes":
        softEllipse(lit, x, y, rx * 1.1, ry * 1.1, color, a * 0.45);
        pixelEllipse(lit, x, y, rx, ry, light, a * 0.9, 0, 1);
        pixelEllipse(
          lit,
          x,
          y,
          Math.round(rx * 0.68),
          Math.round(ry * 0.68),
          color,
          a * 0.55,
          0,
          1,
        );
        drawRunes(lit, x, y, rx * 0.84, ry * 0.84, t * 0.35, light, a);
        break;
      case "vortex": {
        softEllipse(
          this.useDim(),
          x,
          y,
          rx * 1.2,
          ry * 1.2,
          [10, 0, 18],
          0.75 * intensity,
        );

        drawVortexArms(lit, x, y, rx, ry, t, light, color, a);
        break;
      }

      case "frost":
        softEllipse(lit, x, y, rx * 1.1, ry * 1.1, color, a * 0.45);
        pixelEllipse(lit, x, y, rx, ry, light, a * 0.6, 0, 2);
        break;
      case "rainbow":
        softEllipse(lit, x, y, rx * 0.95, ry * 0.95, [255, 255, 255], a * 0.2);
        pixelEllipse(lit, x, y, rx, ry, null, a, t * 1.2, 1);
        break;
      case "ripples":
        // Three rings spreading from the feet in turn, fading as they widen.
        softEllipse(lit, x, y, rx, ry, color, a * 0.3);

        for (let i = 0; i < 3; i++) {
          const phase = (t * 0.7 + i / 3) % 1;
          pixelEllipse(
            lit,
            x,
            y,
            Math.max(2, Math.round(rx * (0.3 + phase))),
            Math.max(1, Math.round(ry * (0.3 + phase))),
            phase < 0.5 ? light : color,
            a * (1 - phase),
            0,
            1,
          );
        }

        break;
      case "circle":
        softEllipse(lit, x, y, rx * 1.1, ry * 1.1, color, a * 0.35);
        drawMagicCircle(this.brush(a), x, y, rx, ry, 1);
        break;
      case "dust":
        softEllipse(lit, x, y, rx * 1.1, ry * 1.1, dark, a * 0.45);

        // Dashes of sand racing round the feet.
        for (let dash = 0; dash < 4; dash++) {
          for (let s = 0; s < 8; s++) {
            const angle = t * 4 + (dash * TAU) / 4 + s * 0.08;
            plot(
              lit,
              x + Math.cos(angle) * rx * (0.85 + (dash % 2) * 0.2),
              y + Math.sin(angle) * ry,
              s < 3 ? light : color,
              (s / 8) * a,
            );
          }
        }

        break;
      case "mist":
        for (let i = 0; i < 5; i++) {
          const ox = noise1(t * 0.35 + i * 7.1, 11) * rx * 0.8;
          const oy = noise1(t * 0.3 + i * 3.7, 12) * ry * 0.5;
          softEllipse(
            lit,
            x + ox,
            y + oy,
            rx * 0.8,
            ry * 0.95,
            i % 2 ? color : dark,
            a * 0.55,
          );
        }

        break;
    }
  }

  // --- signature effects -------------------------------------------------------------------

  /** Divine: 1 px rays turning a notch per tick, alternately long and short, fading outwards. */
  private drawRays(place: AuraPlacement, intensity: number): void {
    const { bounds } = place.silhouette;
    const cx = place.x + bounds.x + bounds.w / 2;
    const cy = place.y + bounds.y + bounds.h * 0.38;
    const reach = Math.max(bounds.w, bounds.h) * 0.5;
    const [light, mid] = this.rgb.tones;
    const count = 16;
    const turn = this.time * 0.25;

    for (let i = 0; i < count; i++) {
      const angle = turn + (i / count) * TAU;
      const long = i % 2 === 0;
      const flicker = 0.75 + 0.25 * noise1(this.time * 0.9 + i * 3.3, 21);
      const from = reach * 0.6;
      const to = reach + (long ? 16 : 8) * flicker;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const a = (long ? 0.7 : 0.45) * intensity * flicker;
      pixelLine(
        this.lit,
        cx + cos * from,
        cy + sin * from,
        cx + cos * to,
        cy + sin * to,
        long ? light : mid,
        a,
        0.05,
      );
    }
  }

  /** Blood moon: a dark red pixel disc with craters and a lit rim, behind the head. */
  private drawMoon(place: AuraPlacement, intensity: number): void {
    const { head, bounds } = place.silhouette;
    const beat = this.preset.pulse(this.time);

    const r = Math.round(
      clamp(bounds.w * 0.38, 7, 12) * (place.ground ? 1 : 0.9),
    );

    // Characters: rising behind the head, off to one side so it isn't hidden by it.
    const lag = place.ground ? this.lag() : { x: 0, y: 0 };

    const x = Math.round(
      place.x + head.x + (place.ground ? r * 0.75 : 0) + lag.x * 1.3,
    );

    const y = Math.round(
      place.y + head.y + (place.ground ? r * 0.15 : 0) + lag.y,
    );

    softEllipse(
      this.lit,
      x,
      y,
      r * 2.2,
      r * 2.2,
      [200, 20, 30],
      0.35 * intensity * beat,
    );
    const dim = this.useDim();
    dim.fillStyle = rgba([110, 8, 16], 0.97 * intensity);
    pixelDisc(dim, x, y, r);
    dim.fillStyle = rgba([150, 18, 26], 0.97 * intensity);
    pixelDisc(dim, x - 1, y - 1, r - 2);
    dim.fillStyle = rgba([70, 0, 8], 0.9 * intensity);

    for (const [cx, cy, cr] of [
      [-0.35, -0.15, 0.24],
      [0.3, 0.35, 0.18],
      [0.35, -0.4, 0.12],
    ] as const) {
      pixelDisc(
        dim,
        x + Math.round(cx * r),
        y + Math.round(cy * r),
        Math.max(1, Math.round(cr * r)),
      );
    }

    pixelEllipse(
      this.lit,
      x,
      y,
      r,
      r,
      [255, 70, 60],
      0.9 * intensity * clamp(beat, 0.6, 1.2),
      0,
      1,
    );
  }

  /** Hellfire: flame tongues licking up from the outline, each on its own flicker. */
  private drawTongues(place: AuraPlacement, intensity: number): void {
    const edge = place.silhouette.edge;

    if (!edge.length) return;
    const count = place.ground ? 14 : 22;
    // An eruption doubles the flames for a moment.
    const base = (place.ground ? 6 : 5) * (1 + this.burstSwell("eruption"));
    const ctx = this.lit;

    for (let i = 0; i < count; i++) {
      const site = edge[Math.floor(((i + 0.5) / count) * edge.length)];

      // Flames rise from the top and the flanks, never from under the feet.
      if (!site || site.ny > 0.5) continue;
      const t = this.time * 2.6 + i * 1.7;

      const height =
        base + noise1(t, i) * 2.5 + (0.5 + 0.5 * noise1(t * 2.1, i + 90)) * 4;

      const width = 1.6 + 0.6 * (0.5 + 0.5 * noise1(t * 0.8, i + 40));
      const x = place.x + site.x + site.nx * 1.5;
      const y = place.y + site.y + site.ny * 1.5 + 1;
      const tipX = x + noise1(t * 1.4, i + 70) * 2.6 + site.nx * 2;
      const tipY = y - height;
      const gradient = ctx.createLinearGradient(x, y, tipX, tipY);
      gradient.addColorStop(0, "rgba(255,244,190,0.95)");
      gradient.addColorStop(0.3, "rgba(255,170,50,0.85)");
      gradient.addColorStop(0.7, "rgba(230,50,12,0.5)");
      gradient.addColorStop(1, "rgba(120,10,0,0)");
      ctx.globalAlpha = 0.85 * Math.min(1, intensity);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x - width, y);
      ctx.quadraticCurveTo(x - width, y - height * 0.55, tipX, tipY);
      ctx.quadraticCurveTo(x + width, y - height * 0.55, x + width, y);
      ctx.quadraticCurveTo(x, y + width, x - width, y);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /** Screen positions of the orbiting stars' heads, the attractors of the star dust. */
  private orbitHeads(place: AuraPlacement): [number, number][] {
    const { bounds } = place.silhouette;
    const cx = place.x + bounds.x + bounds.w / 2;

    const rx = place.ground
      ? clamp(bounds.w * 0.75, 15, 26)
      : bounds.w / 2 + 12;

    const ry = place.ground ? rx * 0.3 : bounds.h * 0.18;

    return ORBITS.flatMap((orbit, index) => {
      if (!place.ground && index === 1) return [];

      const cy =
        place.y +
        bounds.y +
        bounds.h * (place.ground ? orbit.at : index ? 0.75 : 0.25);

      const angle = this.time * orbit.speed + index * 2.1;
      const ox = Math.cos(angle) * rx;

      const head: [number, number] = [
        cx + ox,
        cy + Math.sin(angle) * ry + ox * orbit.tilt,
      ];

      return [head];
    });
  }

  /** Astral: three stars with pixel tails on tilted orbits, split by depth around the body. */
  private drawOrbits(
    place: AuraPlacement,
    intensity: number,
    front: boolean,
  ): void {
    const { bounds } = place.silhouette;
    const cx = place.x + bounds.x + bounds.w / 2;
    const orbits = ORBITS;

    const rx = place.ground
      ? clamp(bounds.w * 0.75, 15, 26)
      : bounds.w / 2 + 12;

    const ry = place.ground ? rx * 0.3 : bounds.h * 0.18;

    for (const [index, orbit] of orbits.entries()) {
      if (!place.ground && index === 1) continue;

      const cy =
        place.y +
        bounds.y +
        bounds.h * (place.ground ? orbit.at : index ? 0.75 : 0.25);

      const color = this.rgb.particles[orbit.color] ?? this.rgb.rim;
      const head = this.time * orbit.speed + index * 2.1;
      const tail = 9;

      for (let k = tail; k >= 0; k--) {
        const angle = head - Math.sign(orbit.speed) * k * 0.11;
        const ox = Math.cos(angle) * rx;
        const depth = Math.sin(angle);

        if (depth > 0 !== front) continue;
        const x = cx + ox;
        const y = cy + depth * ry + ox * orbit.tilt;

        if (k === 0)
          pixelGlint(this.lit, x, y, 2, [255, 255, 255], color, intensity);
        else plot(this.lit, x, y, color, (1 - k / tail) * 0.9 * intensity);
      }
    }
  }

  /** Frost: ice crystals ringing the feet; those behind the feet draw before the character. */
  private drawShards(
    place: AuraPlacement,
    intensity: number,
    front: boolean,
  ): void {
    const rx = groundRadius(place);
    const ry = rx * 0.36;
    const count = 11;
    const ctx = this.lit;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU + 0.3;
      const depth = Math.sin(angle);

      if (depth > 0 !== front) continue;
      const x = Math.round(place.feetX + Math.cos(angle) * rx * 0.95);
      const y = Math.round(place.feetY - 2 + depth * ry * 0.95);

      // A freeze grows the crystals and shrinks them back.
      const height = Math.round(
        (4 + ((i * 7919) % 5)) * (1 + this.burstSwell("freeze") * 0.9),
      );

      const lean = Math.round(Math.cos(angle) * 2);
      ctx.fillStyle = rgba([60, 150, 230], 0.9 * intensity);
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 1);
      ctx.lineTo(x + lean, y - height);
      ctx.lineTo(x + 2, y + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba([235, 250, 255], 0.95 * intensity);
      ctx.beginPath();
      ctx.moveTo(x - 1, y);
      ctx.lineTo(x + lean, y - height + 1);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();

      if ((this.tick + i * 3) % 14 === 0)
        pixelGlint(
          ctx,
          x + lean,
          y - height,
          2,
          [255, 255, 255],
          [180, 240, 255],
          intensity,
        );
    }
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

  private drawBolts(place: AuraPlacement, intensity: number): void {
    const ctx = this.lit;
    const mid = this.rgb.tones[1];

    for (const bolt of this.bolts) {
      const fade = bolt.age < TICK ? 1 : 0.6;
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
      const x = Math.round(p.x - place.viewX);
      const y = Math.round(p.y - place.viewY);
      const age = p.age / p.life;
      const color = palette[p.color % palette.length] ?? this.rgb.rim;

      const covering =
        p.kind === "leaf" || p.kind === "smoke" || p.kind === "wisp";

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

/** Draws one particle kind at (`x`, `y`); `age` runs 0..1 over its life. */
type ParticlePainter = (
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
  tick: number,
) => void;

function drawMoteParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a =
    envelope(age, 0.15, 0.5) *
    ((tick + Math.floor(p.seed)) % 6 === 0 ? 0.55 : 1);

  if (p.size < 1.2) plot(lit, x, y, color, a);
  else pixelPlus(lit, x, y, hot(color), color, a, p.size > 1.6);
}

function drawEmberParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  _color: Rgb,
  palette: Rgb[],
): void {
  const heat = ramp(palette.slice(0, 4), age);
  const a = envelope(age, 0.08, 0.5);
  pixelLine(lit, x, y, x - p.vx * 0.08, y - p.vy * 0.08, heat, a, a * 0.2);

  if (p.size > 2.4) pixelPlus(lit, x, y, hot(heat), heat, a, false);
  else plot(lit, x, y, hot(heat), a);
}

function drawSparkParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.05, 0.6);
  pixelLine(lit, x, y, x - p.vx * 0.06, y - p.vy * 0.06, color, a, a * 0.15);
  plot(lit, x, y, [255, 255, 255], a);
}

function drawGlintParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  pixelGlint(
    lit,
    x,
    y,
    Math.round(p.size * 0.5 * Math.sin(Math.PI * age)),
    [255, 255, 255],
    color,
    1,
  );
}

function drawFlakeParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a = envelope(age, 0.15, 0.35);

  // Snow that landed lies as a pixel or two.
  if (p.settled) {
    plot(lit, x, y, [255, 255, 255], a * 0.9);

    if (p.size > 3) plot(lit, x + 1, y, color, a * 0.6);

    return;
  }

  // A 5×5 pixel snowflake; arms and diagonals swap every few ticks to twinkle.
  const big = p.size >= 2.8;
  const turn = (tick + Math.floor(p.seed)) % 8 < 4;
  plot(lit, x, y, [255, 255, 255], a);

  for (const [dx, dy] of turn ? ORTHO : DIAG) {
    plot(lit, x + dx, y + dy, color, a * 0.9);

    if (big) plot(lit, x + dx * 2, y + dy * 2, color, a * 0.6);
  }

  if (big)
    for (const [dx, dy] of turn ? DIAG : ORTHO)
      plot(lit, x + dx, y + dy, color, a * 0.4);
}

function drawBubbleParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.2, 0.1);
  const r = Math.max(1, Math.round(p.size * (0.8 + age * 0.4)));
  pixelEllipse(lit, x, y, r, r, color, a * 0.9, 0, 1);
  plot(lit, x - Math.ceil(r / 2), y - Math.ceil(r / 2), [255, 255, 255], a);
}

function drawLeafParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a = envelope(age, 0.15, 0.3);

  // Three poses stepping through a flutter.
  const pose =
    LEAF_POSES[
      p.settled ? 0 : (tick + Math.floor(p.seed)) % LEAF_POSES.length
    ] ?? [];

  const dark: Rgb = [
    Math.round(color[0] * 0.55),
    Math.round(color[1] * 0.55),
    Math.round(color[2] * 0.55),
  ];

  for (const [dx, dy, shade] of pose)
    plot(dim, x + dx, y + dy, shade ? dark : color, a);
}

function drawShardParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.1, 0.4);
  const len = Math.max(1, Math.round(p.size * 0.8));
  const vertical = Math.sin(p.rot) > 0;

  for (let i = -len; i <= len; i++)
    plot(
      lit,
      x + (vertical ? 0 : i),
      y + (vertical ? i : 0),
      i < 0 ? [255, 255, 255] : color,
      a,
    );
  plot(lit, x + (vertical ? 1 : 0), y + (vertical ? 0 : 1), color, a * 0.7);
  plot(lit, x - (vertical ? 1 : 0), y - (vertical ? 0 : 1), color, a * 0.7);
}

function drawSmokeParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  drawDot(
    dim,
    x,
    y,
    p.size * (2 + age * 2.5),
    color,
    0.3 * envelope(age, 0.25, 0.6),
  );
}

function drawWispParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = envelope(age, 0.3, 0.25);
  drawDot(dim, x, y, p.size * 3.5, color, a * 0.7);
  plot(lit, x, y, palette[0] ?? color, a * 0.8);
}

function drawFireflyParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const on = Math.sin(p.age * 2.4 + p.seed) > -0.2;
  const a = envelope(age, 0.1, 0.2) * (on ? 1 : 0.15);
  drawDot(lit, x, y, p.size * 6, color, a * 0.5);
  pixelPlus(lit, x, y, [255, 255, 220], color, a, false);
}

function drawDropParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.1, 0.1);
  // Fast drops streak: the faster, the longer the trail above them.
  const streak = Math.min(4, Math.round(Math.abs(p.vy) / 40));

  for (let k = streak; k >= 1; k--)
    plot(lit, x, y - k, color, a * (1 - k / (streak + 1)));
  plot(lit, x, y, hot(color), a);
  plot(lit, x, y + 1, color, a * 0.7);
}

function drawFeatherParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = envelope(age, 0.1, 0.3);
  // Four pixels on a slant that rocks with the swing; flat once it lies.
  const lean = p.settled ? 0 : p.rot > 0.3 ? 1 : p.rot < -0.3 ? -1 : 0;

  for (let i = -1; i <= 2; i++)
    plot(
      dim,
      x + i,
      y - (lean ? Math.round((i * lean) / 2) : 0),
      i === 2 ? [255, 255, 255] : color,
      a,
    );
  plot(dim, x, y + 1, palette[1] ?? color, a * 0.6);
}

function drawGrainParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  _p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  plot(dim, x, y, color, envelope(age, 0.05, 0.3));
}

function drawRockParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = envelope(age, 0.1, 0.2);
  dim.fillStyle = rgba([24, 10, 34], a);
  dim.fillRect(x, y, 2, 2);
  plot(lit, x + (p.vx > 0 ? 0 : 1), y, palette[0] ?? color, a * 0.8);
}

function drawBatParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  _color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a = envelope(age, 0.15, 0.15);
  // Two-frame flap: wings up, then down.
  const up = (tick + Math.floor(p.seed)) % 2 === 0;
  const body: Rgb = [36, 6, 12];
  const wing: Rgb = [110, 16, 28];
  plot(dim, x, y, body, a);
  plot(dim, x, y + 1, body, a);

  for (const side of [-1, 1]) {
    plot(dim, x + side, y + (up ? -1 : 0), wing, a);
    plot(dim, x + side * 2, y + (up ? -2 : 1), wing, a);
    plot(dim, x + side * 3, y + (up ? -2 : 1), wing, a * 0.8);
    // Moonlight catching the wing tips.
    plot(lit, x + side * 3, y + (up ? -3 : 1), [255, 70, 70], a * 0.7);
  }

  plot(lit, x, y, [255, 200, 120], a);
}

function drawDustParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  plot(lit, x, y, color, envelope(age, 0.2, 0.4) * (p.settled ? 0.7 : 1));
}

function drawScorchParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  _p: Particle,
  x: number,
  y: number,
  age: number,
): void {
  // A landed ember: glows orange, cools through red to a dark mark, then fades.
  const heat = ramp(
    [
      [255, 200, 90],
      [230, 70, 20],
      [90, 20, 10],
      [30, 18, 14],
    ],
    age,
  );

  const a = age > 0.7 ? (1 - age) / 0.3 : 1;
  plot(age < 0.6 ? lit : dim, x, y, heat, a);
  plot(age < 0.6 ? lit : dim, x + 1, y, heat, a * 0.7);

  if (age < 0.3) plot(lit, x, y - 1, [255, 230, 160], a * 0.6);
}

function drawPuddleParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
  tick: number,
): void {
  // A flat pool swelling as drops feed it and drying from the edges; a glint on top.
  const dry = age > 0.6 ? (1 - age) / 0.4 : 1;
  const r = Math.max(1, Math.round(p.size * dry));

  for (let dx = -r; dx <= r; dx++)
    plot(
      dim,
      x + dx,
      y,
      Math.abs(dx) === r ? (palette[3] ?? color) : color,
      0.85,
    );

  if (r > 1)
    for (let dx = -r + 1; dx < r; dx++)
      plot(dim, x + dx, y + 1, palette[3] ?? color, 0.7);

  if ((tick + Math.floor(p.seed)) % 12 < 2)
    plot(lit, x - Math.floor(r / 2), y, [255, 255, 255], 0.8);
}

function drawPrintParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = (1 - age) * 0.6;
  plot(dim, x, y, palette[2] ?? color, a);
  plot(dim, x + p.rot, y, palette[2] ?? color, a * 0.7);
}

function drawRingParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const grow = 1 - (1 - age) * (1 - age);
  const r = Math.max(1, Math.round(p.size * (0.3 + grow * 0.9)));
  pixelEllipse(
    lit,
    x,
    y,
    r,
    Math.max(1, Math.round(r * p.squash)),
    color,
    (1 - age) * 0.95,
    0,
    1,
  );
}

const PARTICLE_PAINTERS: Record<ParticleKind, ParticlePainter> = {
  mote: drawMoteParticle,
  ember: drawEmberParticle,
  spark: drawSparkParticle,
  glint: drawGlintParticle,
  flake: drawFlakeParticle,
  bubble: drawBubbleParticle,
  leaf: drawLeafParticle,
  shard: drawShardParticle,
  smoke: drawSmokeParticle,
  wisp: drawWispParticle,
  firefly: drawFireflyParticle,
  drop: drawDropParticle,
  feather: drawFeatherParticle,
  grain: drawGrainParticle,
  rock: drawRockParticle,
  bat: drawBatParticle,
  dust: drawDustParticle,
  scorch: drawScorchParticle,
  puddle: drawPuddleParticle,
  print: drawPrintParticle,
  ring: drawRingParticle,
};

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

/** Vortex ground: three arms of pixels winding in, rotating a notch per tick. */
function drawVortexArms(
  lit: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  t: number,
  light: Rgb,
  color: Rgb,
  a: number,
): void {
  for (let arm = 0; arm < 3; arm++) {
    const start = t * 1.6 + (arm * TAU) / 3;

    for (let s = 0; s < 16; s++) {
      const f = s / 16;
      const ang = start + f * 3.4;
      const r = 1.05 - f * 0.85;
      plot(
        lit,
        x + Math.cos(ang) * rx * r,
        y + Math.sin(ang) * ry * r,
        f > 0.6 ? light : color,
        a * (0.25 + f * 0.75),
      );
    }
  }
}

function groundRadius(place: AuraPlacement): number {
  return Math.round(clamp(place.silhouette.bounds.w * 0.7, 14, 30));
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
): void {
  if (!layer.used) return;
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = 1;
  ctx.drawImage(layer.canvas, 0, 0, box.w, box.h, box.ox, box.oy, box.w, box.h);
}

function spawnFrame(place: AuraPlacement): SpawnFrame {
  const { silhouette } = place;
  const ox = place.x + place.viewX;
  const oy = place.y + place.viewY;
  const rx = groundRadius(place);

  return {
    edge: silhouette.edge,
    ox,
    oy,
    feet: {
      x: place.feetX + place.viewX,
      y: place.feetY + place.viewY - 2,
      rx,
      ry: rx * 0.36,
    },
    body: {
      x: ox + silhouette.bounds.x,
      y: oy + silhouette.bounds.y,
      w: silhouette.bounds.w,
      h: silhouette.bounds.h,
    },
    center: {
      x: ox + silhouette.bounds.x + silhouette.bounds.w / 2,
      y: oy + silhouette.bounds.y + silhouette.bounds.h * 0.45,
    },
    ground: place.ground,
    motion: { vx: 0, vy: 0 },
  };
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
