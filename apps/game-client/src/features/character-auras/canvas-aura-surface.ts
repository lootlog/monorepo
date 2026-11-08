import {
  auraRuntimeAdapter,
  type RuntimeAuraCharacter,
} from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import {
  rendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import {
  CharacterAuraRenderer,
  type CharacterAuraSurface,
  type ShownAura,
} from "./character-aura-renderer";
import { isAuraInView } from "./engine/render";

/** Just under and just over the character in the draw order, between it and the next row. */
const ORDER_EPSILON = 0.001;

type CanvasAura = {
  shown: ShownAura<RuntimeAuraCharacter>;
  back: RuntimeDrawable;
  front: RuntimeDrawable;
};

const shownAuras = new Map<string, CanvasAura>();

function createCanvasAura(shown: ShownAura<RuntimeAuraCharacter>): CanvasAura {
  // The game draws these whatever their position (`getAlwaysDraw`), so an
  // aura off the visible canvas skips its tick render and blits here.
  const aura: CanvasAura = {
    shown,
    back: {
      getAlwaysDraw: () => true,
      getOrder: () => aura.shown.character.order - ORDER_EPSILON,
      draw: (context) => aura.shown.back(context),
    },
    front: {
      getAlwaysDraw: () => true,
      getOrder: () => aura.shown.character.order + ORDER_EPSILON,
      draw: (context) => aura.shown.front(context),
    },
  };

  return aura;
}

/** The NI map canvas: auras join the game's own draw list beside their characters. */
const canvasAuraSurface: CharacterAuraSurface<RuntimeAuraCharacter> = {
  getView: () => auraRuntimeAdapter.getView(),
  getHero: () => auraRuntimeAdapter.getHero(),
  getOther: (characterId) => auraRuntimeAdapter.getOther(characterId),
  subscribeFrame: (onFrame) => rendererRuntimeAdapter.subscribeDraw(onFrame),

  // The game scales the context by its zoom.
  isInView(place, context) {
    const { a: scaleX, d: scaleY } = context.getTransform();

    return isAuraInView(
      place,
      context.canvas.width / scaleX,
      context.canvas.height / scaleY,
    );
  },

  present(key, shown) {
    if (!shown) return;
    let aura = shownAuras.get(key);

    if (aura) aura.shown = shown;
    else {
      aura = createCanvasAura(shown);
      shownAuras.set(key, aura);
    }

    rendererRuntimeAdapter.addDrawable(aura.back);
    rendererRuntimeAdapter.addDrawable(aura.front);
  },

  release(key) {
    shownAuras.delete(key);
  },
};

export const canvasAuraRenderer = new CharacterAuraRenderer(canvasAuraSurface);
