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
  DRAGON_FIRE,
  drawClouds,
  drawDragon,
  drawPearl,
  PEARL_SPARK,
  project,
  pushOutOfBox,
  type Point3,
} from "./dragon";
import { alphaBounds, posterizeAlpha } from "./pixel";
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
import { AURAS } from "./presets";
import type { AuraPreset, BurstKind } from "./presets/preset";
import {
  blitSnapshot,
  boxOf,
  createSnapshot,
  type Box,
  type Layer,
  type Snapshot,
} from "./layers";
import {
  blitComposite,
  colorAt,
  compositeCanvas,
  createComposite,
  paintPixels,
  RAINBOW_RUN,
  tint,
  WHITE,
  writePixel,
} from "./composite";
import { groundRadius, spawnFrame, type AuraPlacement } from "./placement";
import { BURST_DURATION, drawBurstScene } from "./bursts";
import { drawGround } from "./ground";
import { ARRIVAL_BURST, arrivalEvent, pulseStarted } from "./arrival";
import { drawSummonBack, drawSummonFront, type Summon } from "./summon";
import {
  drawClockFace,
  drawGears,
  drawTimeEchoes,
  stillness,
  STOP_FROM,
  STOP_TO,
  TRAIL_STEPS,
  type TrailStep,
} from "./chrono";
import {
  drawGalaxy,
  drawPlanets,
  drawSupernova,
  SUPERNOVA_BLAST,
} from "./cosmos";
import {
  drawCodeRain,
  drawGhosts,
  drawSelection,
  drawTornRows,
  drawWireGround,
  glitchLevel,
  RELOAD_GLITCH,
} from "./glitch";
import { drawDominion } from "./absolute";
import { drawPowerFire, drawPowerStreaks, POWER_RELEASE } from "./ascend";
import { KITS } from "./kits/registry";
import { MAP_EFFECTS } from "./map-effects";
import type { MapScene } from "./sky";
import {
  drawIceCrown,
  drawIceRing,
  drawRime,
  drawSnowOrbit,
  SPIKES_SHATTER,
} from "./winter";
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

const TICK = 0.1;

const ALPHA_LEVELS = 4;

const COLOR_LEVELS = 7;

const LITE_STEP = 0.2;

const HAKI_CORE: Rgb = [14, 0, 4];

const HAKI_RIM = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

interface Bolt {
  points: number[];
  ax: number;
  ay: number;
  bx: number;
  by: number;
  age: number;
  life: number;
  heavy?: boolean;
  haki?: boolean;
}

const DOMINION_ONLY = { gloom: 0, veil: [4, 2, 10] } as const;

const FIRST_REALM = 4;

interface Point {
  x: number;
  y: number;
}

const BAND_ALPHAS = [0.95, 0.8, 0.7, 0.55] as const;

const BAND_TONES = [0, 1, 2, 2] as const;

export class Aura {
  private readonly rng: Rng;
  private readonly field: ParticleField;
  private preset: AuraPreset;
  private time = 0;
  private tick = 0;
  private carry = 0;
  private flash = 0;
  private bolts: Bolt[] = [];
  private nextBolt = 0.3;
  private beatIndex = -1;
  private burst = -1;
  private nextBurst = 2.5;
  private age = 0;
  private quakeSeed = 1;
  private trail: TrailStep[] = [];
  private frozenAt: number | null = null;
  private host: AuraPreset;
  private realm = 0;
  private shifted = Infinity;
  private spring: Spring | null = null;
  private lastCenter: { x: number; y: number } | null = null;
  private motion = { vx: 0, vy: 0 };
  private lastPrint: { x: number; y: number; side: number } | null = null;
  private dragon: Dragon | null = null;
  private pearl: Point3 = { x: 0, y: 0, z: 0 };
  private headTarget = { x: 0, y: 0 };
  private rgb: AuraColors;
  private readonly back = createSnapshot();
  private readonly front = createSnapshot();
  private readonly outline = createComposite();
  private readonly inner = createComposite();
  private readonly lightPixels = new LightPixels();
  private litCtx!: CanvasRenderingContext2D;
  private dim!: CanvasRenderingContext2D;
  private dimLayer!: Layer;
  private litLayer!: Layer;

  constructor(
    id: CharacterAuraId,
    seed = Math.floor(Math.random() * 1e9),
    phase = 0,
  ) {
    this.carry = clamp(phase, 0, 1) * TICK;
    this.rng = mulberry32(seed);
    this.field = new ParticleField(this.rng);
    this.host = AURAS[id];
    this.preset = this.worn();
    this.rgb = colorsOf(this.preset);

    if (this.preset.herald) this.nextBurst = ARRIVAL_BURST;
  }

  mapEffect(): { gloom: number; veil: Rgb } | null {
    if (this.preset.sky) return MAP_EFFECTS[this.preset.sky];

    if (this.preset.kit) return KITS[this.preset.kit];

    return this.host.realms ? DOMINION_ONLY : null;
  }

  drawMapEffects(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    width: number,
    height: number,
  ): void {
    const p = this.preset;

    if (!place.ground || !(p.sky || p.kit || this.host.realms)) return;
    const [light, mid, dark] = this.rgb.tones;
    const { bounds } = place.silhouette;
    ctx.save();

    try {
      const scene: MapScene = {
        ctx,
        width,
        height,
        time: this.time,
        now: this.age,
        view: [place.viewX, place.viewY],
        x: place.x + bounds.x + bounds.w / 2,
        y: place.y + bounds.y + bounds.h * 0.45,
        feetY: place.feetY - 2,
        top: place.y + bounds.y,
        half: bounds.w / 2,
        burst:
          this.burst < 0
            ? -1
            : Math.min(1, this.burst + this.carry / this.burstLength()),
        light,
        mid,
        dark,
      };

      if (p.sky) MAP_EFFECTS[p.sky].draw(scene);

      if (p.kit) KITS[p.kit].sky(scene);

      if (this.host.realms) drawDominion(scene, this.shifted);
    } finally {
      ctx.restore();
    }
  }

  private summon(place: AuraPlacement, intensity: number): Summon | null {
    if (!this.preset.herald || !place.ground) return null;
    const event = arrivalEvent(this.age);

    if (!event) return null;
    const [light, mid] = this.rgb.tones;

    return { t: event.t, strength: event.strength * intensity, light, mid };
  }

  setPreset(id: CharacterAuraId): void {
    if (id === this.host.id) return;
    this.host = AURAS[id];
    this.realm = 0;
    this.field.clear();
    this.wear();
  }

  private worn(): AuraPreset {
    const { realms } = this.host;
    const id = realms?.[this.realm % realms.length];

    return id ? AURAS[id] : this.host;
  }

  private wear(): void {
    this.preset = this.worn();
    this.rgb = colorsOf(this.preset);
    this.bolts = [];
    this.dragon = null;
    this.burst = -1;
    this.trail = [];
    this.frozenAt = null;
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
    this.shifted += Math.max(0, dt);

    if (this.preset.herald && pulseStarted(before, this.age))
      this.nextBurst = Math.min(this.nextBurst, ARRIVAL_BURST);
    this.carry += Math.max(0, dt);
    let steps = 0;

    while (this.carry >= TICK) {
      this.carry -= TICK;

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

    if (this.frozenAt === null) {
      this.field.update(
        TICK,
        emitters,
        frame,
        this.host.realms ? intensity * 1.5 : intensity,
        this.time,
      );
      this.field.bubbleUp(TICK);
    }

    if (!place || !frame) return;
    const fx = this.preset.fx;

    if (fx.includes("clockwork") && place.ground) {
      this.trail.unshift({
        x: place.x + place.viewX,
        y: place.y + place.viewY,
        silhouette: place.silhouette,
      });
      this.trail.length = Math.min(this.trail.length, TRAIL_STEPS);
    }

    if (fx.includes("footprints") && place.ground) this.stepPrints(frame);

    if (fx.includes("lightning")) this.updateBolts(place, frame, intensity);

    if (fx.includes("heartbeat") && place.ground) this.updateHeartbeat(frame);
    this.updateBurst(place, frame, intensity);
  }

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

  private lag(): Point {
    if (!this.spring) return { x: 0, y: 0 };

    return {
      x: clamp(this.spring.x - this.headTarget.x, -14, 14),
      y: clamp(this.spring.y - this.headTarget.y, -10, 10),
    };
  }

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
    this.dragon.step(this.pearl, TICK, place.ground ? 5 : 7);

    if (!place.ground) pushOutOfBox(this.dragon, frame.body, 4);
    const [px, py] = project(this.pearl, 0, 0);

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

      if (place.ground) this.drawShowcase(b, place, false);

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

    ctx.save();

    try {
      const summon = this.summon(place, intensity);

      if (summon) drawSummonBack(ctx, place, summon);

      if (place.ground) this.drawDoubles(ctx, place, false, intensity);
      blitSnapshot(ctx, this.back, place, "dim");

      if (!(p.bare && place.ground))
        this.drawOutline(ctx, place, glow, this.compositeKey(intensity));
      blitSnapshot(ctx, this.back, place, "lit");
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

      if (place.ground) this.drawShowcase(b, place, true);

      if (p.fx.includes("frost-shards") && place.ground)
        drawShards(b, place, true, this.burstSwell("freeze"));

      if (p.fx.includes("orbits")) drawOrbits(b, place, true, this.rgb.rim);

      if (p.fx.includes("lightning")) this.drawBolts(place, intensity);

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
      blitSnapshot(ctx, this.front, place, "dim");
      blitSnapshot(ctx, this.front, place, "lit");

      if (place.ground) this.drawDoubles(ctx, place, true, intensity);
      const summon = this.summon(place, intensity);

      if (summon) drawSummonFront(ctx, place, summon);
    } finally {
      ctx.restore();
    }
  }

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
    snap.worldLit.soft = false;
    snap.worldDim.soft = false;
    this.drawParticles(place, front);
    this.drawDragonWorld(place, front, intensity);
    this.finish(snap.worldLit, snap.worldDim, box);
  }

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

  private compositeKey(intensity: number): string {
    return this.steadyKey(intensity) ?? String(this.tick);
  }

  private steadyKey(intensity: number): string | null {
    if (!this.preset.lite || this.burst >= 0 || this.flash > 0) return null;

    return `${intensity}|${this.liteStep()}`;
  }

  private liteStep(): number {
    return Math.floor(this.time / LITE_STEP);
  }

  private drawLitePieces(b: Brush, place: AuraPlacement, front: boolean): void {
    const fx = this.preset.fx;
    const step = this.liteStep();
    const raised = Math.floor(step / 4) % 2 === 1;

    if (fx.includes("halo")) drawHalo(b, place, front, raised);

    if (fx.includes("fire-dragon")) drawFireDragon(b, place, front, step);

    if (fx.includes("crown") && front) drawCrown(b, place, raised, step);

    if (fx.includes("wings") && !front) drawWings(b, place, step);
  }

  private drawShowcase(b: Brush, place: AuraPlacement, front: boolean): void {
    const fx = this.preset.fx;
    const burst = this.burst;

    if (fx.includes("galaxy")) {
      if (!front) drawGalaxy(b, place, burst);
      drawPlanets(b, place, front, burst);
      drawSupernova(b, place, front, burst);
    }

    if (fx.includes("power-flame") && front) drawPowerStreaks(b, place, burst);

    if (this.preset.kit) KITS[this.preset.kit].pieces(b, place, front, burst);

    if (fx.includes("clockwork") && !front) {
      const clock = this.frozenAt ?? this.time;
      drawClockFace(b, place, clock, burst);
      drawGears(b, place, clock);
    }

    if (fx.includes("winter")) {
      if (!front) drawRime(b, place, burst);
      drawIceRing(b, place, front, burst);
      drawSnowOrbit(b, place, front);

      if (front) drawIceCrown(b, place, Math.floor(this.tick / 8) % 2 === 1);
    }

    if (fx.includes("glitch")) {
      if (front) drawSelection(b, place, burst);
      else {
        drawWireGround(b, place);
        drawCodeRain(b, place);
      }
    }
  }

  private drawDoubles(
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    front: boolean,
    intensity: number,
  ): void {
    const fx = this.preset.fx;
    const [light, mid] = this.rgb.tones;

    const { fire, kit } = this.preset;

    if (kit)
      KITS[kit].doubles?.(ctx, place, front, this.tick, this.burst, intensity);

    if (fire && !front)
      drawPowerFire(ctx, place, this.tick, this.burst, intensity, fire);

    if (fx.includes("clockwork") && !front)
      drawTimeEchoes(
        ctx,
        place,
        this.trail,
        mid,
        intensity,
        stillness(this.burst),
      );

    if (!fx.includes("glitch")) return;
    const level = glitchLevel(this.tick, this.burst);

    if (front) drawTornRows(ctx, place, level, this.tick, light, intensity);
    else drawGhosts(ctx, place, level, this.tick, intensity);
  }

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

  private get lit(): CanvasRenderingContext2D {
    this.litLayer.used = true;

    return this.litCtx;
  }

  private useDim(): CanvasRenderingContext2D {
    this.dimLayer.used = true;

    return this.dim;
  }

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
        const a =
          index === 3
            ? smoothstep(0.75, 1.05, glow) * alpha
            : clamp(alpha * glow, 0, 1);

        return a > 0.02 ? a : 0;
      });

      const bandColors = BAND_TONES.map((tone, index) =>
        prism ? this.rainbowStops(index) : [this.rgb.tones[tone]],
      );

      const flash = this.flash > 0.05 ? this.flash * 0.7 : 0;
      const flashColors = prism ? (bandColors[0] ?? []) : [WHITE];

      const composite = compositeCanvas(this.outline, silhouette, key, (octx) =>
        paintPixels(octx, this.outline, (data, width, height) => {
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
      blitComposite(ctx, place, composite);

      return;
    }

    if (!silhouette.glow) return;
    const { near, far } = silhouette.glow;
    ctx.globalCompositeOperation = p.darkHaze ? "source-over" : "lighter";
    this.blitMask(ctx, place, far, this.rgb.haze, Math.min(1, p.far * glow));
    ctx.globalCompositeOperation = "lighter";
    this.blitMask(ctx, place, near, this.rgb.rim, Math.min(1, p.near * glow));
  }

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

    const composite = compositeCanvas(
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
        paintPixels(octx, this.inner, (data, width, height) => {
          for (let n = 0; n < body.length; n++) {
            const i = body[n] ?? 0;
            const a = (alpha * (bodyAlpha[n] ?? 0)) / 255;
            writePixel(data, i, colorAt(colors, i, width, height), a);
          }
        });
      },
    );

    ctx.globalCompositeOperation = "lighter";
    blitComposite(ctx, place, composite);
  }

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

  private rainbowStops(band: number): Rgb[] {
    const shift = this.time * 90 + band * 40;

    return Array.from({ length: 7 }, (_, i) =>
      hslToRgb(shift + i * 60, 1, band ? 0.55 : 0.72),
    );
  }

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

  private burstLength(): number {
    const { kit } = this.preset;

    return kit ? KITS[kit].burst.length : BURST_DURATION[this.burstKind];
  }

  private get burstKind(): BurstKind {
    return this.preset.burst;
  }

  private burstSwell(kind: BurstKind): number {
    if (this.burst < 0 || this.burstKind !== kind) return 0;

    return Math.sin(Math.PI * clamp(this.burst, 0, 1));
  }

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

  private advanceBurst(
    kind: BurstKind,
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
  ): void {
    const before = this.burst;
    this.burst += TICK / this.burstLength();
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

    if ((kind === "coronation" || kind === "rebirth") && crossed(0.85)) {
      this.flash = 1;
      this.field.emit(GOLD_RAIN, frame, Math.round(16 * k));
      this.burstRing(place, frame, frame.feet.rx * 2.4, 1);
      this.burstRing(place, frame, frame.feet.rx * 1.5, 0);
    }

    if (kind === "roar" && crossed(0.85)) {
      this.flash = 1;
      this.field.emit(GOLD_RAIN, frame, Math.round(14 * k));
    }

    this.advanceShowcaseBurst(kind, place, frame, k, crossed);

    if (this.burst <= 1) return;
    this.burst = -1;

    if (!this.host.realms || this.age < FIRST_REALM) return;
    this.realm++;
    this.wear();
    this.shifted = 0;
    this.flash = 1;
    this.nextBurst = 3 + this.rng() * 2;
  }

  private advanceShowcaseBurst(
    kind: BurstKind,
    place: AuraPlacement,
    frame: SpawnFrame,
    k: number,
    crossed: (at: number) => boolean,
  ): void {
    if (kind === "supernova" && crossed(SUPERNOVA_BLAST)) {
      this.flash = 1;
      this.field.emit(
        {
          kind: "spark",
          rate: 0,
          from: "body",
          life: [0.5, 1],
          speed: [60, 130],
          spread: TAU,
          drag: 1.6,
          size: [0.8, 1.4],
          colors: 5,
          front: 0.6,
        },
        frame,
        Math.round(34 * k),
      );
      this.field.emit(
        {
          kind: "glint",
          rate: 0,
          from: "body",
          life: [0.5, 0.9],
          speed: [0, 3],
          size: [4, 7],
          colors: 3,
          front: 0.7,
        },
        frame,
        Math.round(6 * k),
      );
    }

    if (kind === "timestop") {
      if (crossed(STOP_FROM)) {
        this.frozenAt = this.time;
        this.flash = 0.8;
      }

      if (crossed(STOP_TO)) {
        this.frozenAt = null;
        this.flash = 1;
      }

      if (this.burst > 1) this.frozenAt = null;
    }

    if (
      kind === "kit" &&
      this.preset.kit &&
      crossed(KITS[this.preset.kit].burst.release)
    ) {
      this.flash = 1;
      this.field.emit(
        {
          kind: "spark",
          rate: 0,
          from: "body",
          life: [0.4, 0.9],
          speed: [50, 110],
          spread: TAU,
          drag: 1.5,
          size: [0.8, 1.4],
          colors: 3,
          front: 0.6,
        },
        frame,
        Math.round(24 * k),
      );
    }

    if (kind === "powerup" && crossed(POWER_RELEASE)) {
      this.flash = 1;
      this.startConqueror(place, frame, k, false);
    }

    if (kind === "glaciate" && crossed(SPIKES_SHATTER)) {
      this.flash = 0.7;
      this.field.emit(
        {
          kind: "shard",
          rate: 0,
          from: "feet-rim",
          life: [1.2, 1.8],
          speed: [50, 100],
          dir: -Math.PI / 2,
          spread: 1.8,
          gravity: 220,
          size: [1.6, 3],
          colors: 4,
          front: 0.5,
          spin: [-6, 6],
          land: "shatter",
          groundOnly: true,
        },
        frame,
        Math.round(22 * k),
      );
    }

    if (kind === "reload" && crossed(RELOAD_GLITCH)) {
      this.flash = 1;
      this.field.emit(
        {
          kind: "mote",
          rate: 0,
          from: "feet-rim",
          life: [0.7, 1.3],
          speed: [30, 60],
          dir: -Math.PI / 2,
          spread: 0.2,
          size: [1, 2],
          colors: 3,
          colorFrom: 1,
          front: 0.5,
        },
        frame,
        Math.round(20 * k),
      );
    }
  }

  private burstRing(
    place: AuraPlacement,
    frame: SpawnFrame,
    size: number,
    color: number,
  ): void {
    if (!place.ground || this.preset.tier === "mythic" || this.preset.kit)
      return;
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
        this.quakeSeed = Math.floor(this.rng() * 1e9);
        this.flash = 1;
        this.startConqueror(place, frame, k, false);
        this.burstRing(place, frame, frame.feet.rx * 3, 0);

        return true;
      case "judgement":
        this.startJudgement(place, frame, k);

        return true;
      case "supernova":
      case "timestop":
      case "powerup":
      case "kit":
        this.flash = 0.5;

        return true;
      case "glaciate":
        this.flash = 0.9;
        this.field.emit(
          {
            kind: "flake",
            rate: 0,
            from: "feet-rim",
            life: [0.9, 1.5],
            speed: [20, 45],
            spread: TAU,
            drag: 1.2,
            size: [2.4, 3.4],
            colors: 3,
            front: 0.6,
          },
          frame,
          Math.round(14 * k),
        );

        return true;
      case "reload":
        this.flash = 0.6;
        this.field.emit(
          {
            kind: "spark",
            rate: 0,
            from: "edge",
            life: [0.2, 0.4],
            speed: [60, 120],
            spread: TAU,
            outward: 0.8,
            size: [0.8, 1.2],
            colors: 2,
            colorFrom: 3,
            front: 0.7,
          },
          frame,
          Math.round(18 * k),
        );

        return true;
      default:
        return false;
    }
  }

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

  private drawBurst(b: Brush, place: AuraPlacement, front: boolean): void {
    if (this.burst < 0) return;
    const intensity = b.intensity;
    const t = clamp(this.burst, 0, 1);
    const { bounds } = place.silhouette;
    const [light, mid, dark] = this.rgb.tones;
    const cx = place.x + bounds.x + bounds.w / 2;
    const fade = envelope(t, 0.1, 0.2) * intensity;

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

    if (
      this.preset.tier === "mythic" &&
      (this.burstKind === "conqueror" || this.burstKind === "quake")
    )
      return;

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

  private drawDragonWorld(
    place: AuraPlacement,
    front: boolean,
    intensity: number,
  ): void {
    if (!this.dragon || !this.preset.fx.includes("dragon")) return;
    const b = this.brush(intensity);

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
    this.litLayer.soft = true;
    drawPearl(b, px, py);
  }

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
    const mid = this.preset.fire?.bolt ?? this.rgb.tones[1];

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

interface AuraColors {
  rim: Rgb;
  haze: Rgb;
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
