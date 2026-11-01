import { Schema } from "effect";
import {
  CharacterAuraIdSchema,
  type CharacterAuraId,
} from "@lootlog/schema/character-aura";
import { AURAS } from "./presets";
import { Aura, type AuraPlacement } from "./render";
import { buildBoxSilhouette, type AuraSilhouette } from "./silhouette";

const isCharacterAuraId = Schema.is(CharacterAuraIdSchema);

/** Marks a character tip as carrying an aura; the overlay looks for it in the shown tip. */
const MARK_CLASS = "ll-aura-mark";

export function auraMark(id: CharacterAuraId): string {
  return `<div class="${MARK_CLASS}" data-aura="${id}" style="display:none"></div>`;
}

/** Room around the tip for the outline bands and particles (silhouette pad + render margin). */
const MARGIN = 68;

/** The tip's own frame: seven 1 px box-shadow rings outside its box (Tips.js:530 `border`). */
const FRAME = 7;

/**
 * Draws the aura around the game's tooltip while it shows a marked character tip.
 *
 * The tip sits above anything placed in its own layer, so the aura is one canvas fixed over
 * the whole page instead. What belongs behind the tip (outline, haze, back particles) is
 * drawn first and then cut out where the tip and its frame are; the front part goes on top.
 */
export class CharacterAuraTooltip {
  private readonly observer: MutationObserver;
  private readonly canvas: HTMLCanvasElement;
  private tip: HTMLElement | null = null;
  private aura: Aura | null = null;
  private silhouette: AuraSilhouette | null = null;
  private frame = 0;
  private last = 0;

  constructor(private readonly layer: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "ll-aura-tip-canvas";
    this.canvas.hidden = true;
    // Tips.js swaps the tip's content and re-appends it on every show (Tips.js:226-245).
    this.observer = new MutationObserver(() => this.check());
    this.observer.observe(layer, { childList: true, subtree: true });
    this.check();
  }

  dispose(): void {
    this.observer.disconnect();
    this.stop();
    this.canvas.remove();
  }

  private check(): void {
    const tip = this.layer.querySelector<HTMLElement>(":scope > .tip-wrapper");
    const id = tip?.querySelector<HTMLElement>(`.${MARK_CLASS}`)?.dataset.aura;

    if (!tip || !isCharacterAuraId(id)) return this.stop();

    if (this.tip !== tip) this.unmarkTip();

    if (this.aura) this.aura.setPreset(id);
    else this.aura = new Aura(id);

    if (tip.dataset.llAura !== id) {
      const [a, b, c] = AURAS[id].nick;
      tip.dataset.llAura = id;
      tip.style.setProperty("--ll-aura-a", a);
      tip.style.setProperty("--ll-aura-b", b);
      tip.style.setProperty("--ll-aura-c", c);
    }

    this.tip = tip;

    if (!this.canvas.isConnected) document.body.append(this.canvas);

    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.render);
    }
  }

  private unmarkTip(): void {
    if (!this.tip) return;
    delete this.tip.dataset.llAura;
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.unmarkTip();
    this.tip = null;
    this.aura = null;
    this.canvas.hidden = true;
  }

  private readonly render = (now: number): void => {
    this.frame = 0;
    const tip = this.tip;
    const aura = this.aura;

    if (!tip || !aura || !tip.isConnected) return this.stop();
    const dt = (now - this.last) / 1000;
    this.last = now;
    const rect = tip.getBoundingClientRect();
    const tipW = Math.round(rect.width);
    const tipH = Math.round(rect.height);

    if (tipW < 4 || tipH < 4) {
      this.frame = requestAnimationFrame(this.render);

      return;
    }

    // The aura's box wraps the tip's frame, so the outline starts where the frame ends.
    const width = tipW + FRAME * 2;
    const height = tipH + FRAME * 2;

    if (
      !this.silhouette ||
      this.silhouette.width !== width ||
      this.silhouette.height !== height
    ) {
      this.silhouette = buildBoxSilhouette(width, height);
    }

    const place: AuraPlacement = {
      silhouette: this.silhouette,
      x: MARGIN,
      y: MARGIN,
      viewX: 0,
      viewY: 0,
      ground: false,
      feetX: MARGIN + width / 2,
      feetY: MARGIN + height,
    };

    aura.update(dt, place, 1);

    const canvas = this.canvas;
    const w = width + MARGIN * 2;
    const h = height + MARGIN * 2;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    canvas.style.left = `${Math.round(rect.left) - FRAME - MARGIN}px`;
    canvas.style.top = `${Math.round(rect.top) - FRAME - MARGIN}px`;
    canvas.hidden = false;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      aura.drawBack(ctx, place, 1);
      ctx.clearRect(MARGIN, MARGIN, width, height);
      aura.drawFront(ctx, place, 1);
    }

    this.frame = requestAnimationFrame(this.render);
  };
}
