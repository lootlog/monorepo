import {
  legacyAuraRuntimeAdapter,
  type LegacyAuraCharacter,
  type LegacyAuraLayers,
} from "@/lib/margonem-runtime/adapters/legacy-aura-runtime-adapter";
import {
  CharacterAuraRenderer,
  type AuraPaint,
  type CharacterAuraSurface,
  type ShownArrival,
  type ShownAura,
} from "./character-aura-renderer";
import { auraScreenBox } from "./engine/layers";
import type { AuraPlacement } from "./engine/placement";

/** SI has no camera in the way: `#base` scrolls, so its pixels are map pixels. */
const MAP_CAMERA = [0, 0] as const;

/** An aura's layers and what they were last painted for. */
type ShownLayers = {
  layers: LegacyAuraLayers;
  place: AuraPlacement | null;
  revision: number | null;
};

const shownLayers = new Map<string, ShownLayers>();

/**
 * Whether the layers already show `shown`. An aura changes ten times a second and when
 * its character moves or takes another frame of its walk, so most animation frames find
 * the canvases as they should be. Resizing a layer clears it, which only a new
 * silhouette does.
 */
function isPainted(
  { place, revision }: ShownLayers,
  shown: ShownAura<LegacyAuraCharacter>,
): boolean {
  return (
    place !== null &&
    revision !== null &&
    revision === shown.revision &&
    place.silhouette === shown.place.silhouette &&
    place.x === shown.place.x &&
    place.y === shown.place.y
  );
}

const veil = legacyAuraRuntimeAdapter.createVeil();

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

/** The night of an admin's arrival with a tall circle of light on them, in map pixels. */
function arrivalBackground({ place, darkness, veil }: ShownArrival): string {
  const { bounds } = place.silhouette;
  const x = Math.round(place.x + bounds.x + bounds.w / 2);
  const y = Math.round(place.y + bounds.y + bounds.h * 0.45);
  const color = veil.join(",");
  const alpha = (0.8 * darkness).toFixed(2);

  return `radial-gradient(ellipse 110px 210px at ${x}px ${y}px, rgba(${color},0) 19%, rgba(${color},${alpha}) 100%)`;
}

/**
 * The SI map: each aura gets a canvas under and one over its character's
 * element, sized to what the aura paints and redrawn on the animation frames
 * that change it.
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
      layers = {
        layers: legacyAuraRuntimeAdapter.createLayers(),
        place: null,
        revision: null,
      };
      shownLayers.set(key, layers);
    }

    const { back, front } = layers.layers;
    const box = auraScreenBox(shown.place);
    legacyAuraRuntimeAdapter.placeLayers(
      layers.layers,
      shown.character.element,
      box,
    );

    if (isPainted(layers, shown)) return;
    layers.place = shown.place;
    layers.revision = shown.revision;
    paintLayer(back, box.x, box.y, shown.back);
    paintLayer(front, box.x, box.y, shown.front);
  },

  release(key) {
    const layers = shownLayers.get(key);

    if (!layers) return;
    shownLayers.delete(key);
    legacyAuraRuntimeAdapter.removeLayers(layers.layers);
  },

  // SI dims the map round the admin with a CSS gradient.
  presentArrival(arrival) {
    // An effect only seen in bursts leaves the SI map as it is.
    if (!arrival || arrival.darkness <= 0) {
      veil.remove();

      return;
    }

    legacyAuraRuntimeAdapter.placeVeil(veil, arrivalBackground(arrival));
  },
};

export const legacyAuraRenderer = new CharacterAuraRenderer(legacyAuraSurface);
