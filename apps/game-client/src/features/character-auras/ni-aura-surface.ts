import { auraRuntimeAdapter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import {
  rendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import type { AuraSurface, SurfaceAura } from "./aura-surface";
import { isAuraInView } from "./engine/render";
import type { AuraPlacement } from "./engine/placement";

/** Just under and just over the character in the draw order, between it and the next row. */
const ORDER_EPSILON = 0.001;

type Drawables = {
  aura: SurfaceAura;
  back: RuntimeDrawable;
  front: RuntimeDrawable;
};

/** The NI game canvas: auras join its renderer just under and over their characters. */
class NiAuraSurface implements AuraSurface {
  private readonly drawables = new Map<string, Drawables>();

  isAvailable(): boolean {
    return auraRuntimeAdapter.isAvailable();
  }

  subscribeFrame(onFrame: () => void): (() => void) | null {
    return rendererRuntimeAdapter.subscribeDraw(onFrame);
  }

  getView() {
    return auraRuntimeAdapter.getView();
  }

  getHero() {
    return auraRuntimeAdapter.getHero();
  }

  getOther(characterId: string) {
    return auraRuntimeAdapter.getOther(characterId);
  }

  /** The game scales the context by its zoom. */
  isInView(place: AuraPlacement, context: CanvasRenderingContext2D): boolean {
    const { a: scaleX, d: scaleY } = context.getTransform();

    return isAuraInView(
      place,
      context.canvas.width / scaleX,
      context.canvas.height / scaleY,
    );
  }

  show(key: string, aura: SurfaceAura): void {
    let drawables = this.drawables.get(key);

    // The game draws these whatever their position (`getAlwaysDraw`), so an
    // aura off the visible canvas skips its tick render and blits in `isInView`.
    if (drawables?.aura !== aura) {
      drawables = {
        aura,
        back: {
          getAlwaysDraw: () => true,
          getOrder: () => aura.order - ORDER_EPSILON,
          draw: (context) => aura.drawBack(context),
        },
        front: {
          getAlwaysDraw: () => true,
          getOrder: () => aura.order + ORDER_EPSILON,
          draw: (context) => aura.drawFront(context),
        },
      };
      this.drawables.set(key, drawables);
    }

    rendererRuntimeAdapter.addDrawable(drawables.back);
    rendererRuntimeAdapter.addDrawable(drawables.front);
  }

  // The renderer takes only what was added this frame.
  endFrame(): void {}

  forget(key: string): void {
    this.drawables.delete(key);
  }

  clear(): void {
    this.drawables.clear();
  }
}

export const niAuraSurface = new NiAuraSurface();
