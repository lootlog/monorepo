import {
  legacyAuraRuntimeAdapter,
  type LegacyAuraCharacter,
  type LegacyAuraLayers,
} from "@/lib/margonem-runtime/adapters/legacy-aura-runtime-adapter";
import {
  CharacterAuraRenderer,
  type AuraPaint,
  type CharacterAuraSurface,
} from "./character-aura-renderer";
import { auraScreenBox } from "./engine/render";

/** SI has no camera in the way: `#base` scrolls, so its pixels are map pixels. */
const MAP_CAMERA = [0, 0] as const;

const shownLayers = new Map<string, LegacyAuraLayers>();

function paintLayer(
  layer: HTMLCanvasElement,
  x: number,
  y: number,
  paint: AuraPaint,
): void {
  const context = layer.getContext("2d");

  if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, layer.width, layer.height);
  context.setTransform(1, 0, 0, 1, -x, -y);
  paint(context);
}

/**
 * The SI map: each aura gets a canvas under and one over its character's
 * element, sized to what the aura paints and redrawn every animation frame
 * while any aura is shown.
 */
const legacyAuraSurface: CharacterAuraSurface<LegacyAuraCharacter> = {
  getView: () => ({
    mapId: legacyAuraRuntimeAdapter.getMapId(),
    camera: MAP_CAMERA,
  }),
  getHero: () => legacyAuraRuntimeAdapter.getHero(),
  getOther: (characterId) => legacyAuraRuntimeAdapter.getOther(characterId),

  subscribeFrame(onFrame) {
    let frame = requestAnimationFrame(function loop() {
      frame = requestAnimationFrame(loop);
      onFrame();
    });

    return () => cancelAnimationFrame(frame);
  },

  // Each layer is sized to its aura.
  isInView: () => true,

  present(key, shown) {
    if (!shown) {
      legacyAuraSurface.release(key);

      return;
    }

    let layers = shownLayers.get(key);

    if (!layers) {
      layers = legacyAuraRuntimeAdapter.createLayers();
      shownLayers.set(key, layers);
    }

    const box = auraScreenBox(shown.place);
    legacyAuraRuntimeAdapter.placeLayers(layers, shown.character.element, box);
    paintLayer(layers.back, box.x, box.y, shown.back);
    paintLayer(layers.front, box.x, box.y, shown.front);
  },

  release(key) {
    const layers = shownLayers.get(key);

    if (!layers) return;
    shownLayers.delete(key);
    legacyAuraRuntimeAdapter.removeLayers(layers);
  },
};

export const legacyAuraRenderer = new CharacterAuraRenderer(legacyAuraSurface);
