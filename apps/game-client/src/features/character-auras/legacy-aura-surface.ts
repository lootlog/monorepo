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

const MAP_CAMERA = [0, 0] as const;

type ShownLayers = {
  layers: LegacyAuraLayers;
  paintedPlace: AuraPlacement | null;
  paintedRevision: number | null;
};

const shownLayers = new Map<string, ShownLayers>();

function isPainted(
  { paintedPlace, paintedRevision }: ShownLayers,
  shown: ShownAura<LegacyAuraCharacter>,
): boolean {
  return (
    paintedPlace !== null &&
    paintedRevision !== null &&
    paintedRevision === shown.revision &&
    paintedPlace.silhouette === shown.place.silhouette &&
    paintedPlace.x === shown.place.x &&
    paintedPlace.y === shown.place.y
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

function arrivalBackground({ place, darkness, veil }: ShownArrival): string {
  const { bounds } = place.silhouette;
  const x = Math.round(place.x + bounds.x + bounds.w / 2);
  const y = Math.round(place.y + bounds.y + bounds.h * 0.45);
  const color = veil.join(",");
  const alpha = (0.8 * darkness).toFixed(2);

  return `radial-gradient(ellipse 110px 210px at ${x}px ${y}px, rgba(${color},0) 19%, rgba(${color},${alpha}) 100%)`;
}

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
        paintedPlace: null,
        paintedRevision: null,
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
    layers.paintedPlace = shown.place;
    layers.paintedRevision = shown.revision;
    paintLayer(back, box.x, box.y, shown.back);
    paintLayer(front, box.x, box.y, shown.front);
  },

  release(key) {
    const layers = shownLayers.get(key);

    if (!layers) return;
    shownLayers.delete(key);
    legacyAuraRuntimeAdapter.removeLayers(layers.layers);
  },

  presentArrival(arrival) {
    if (!arrival || arrival.darkness <= 0) {
      veil.remove();

      return;
    }

    legacyAuraRuntimeAdapter.placeVeil(veil, arrivalBackground(arrival));
  },
};

export const legacyAuraRenderer = new CharacterAuraRenderer(legacyAuraSurface);
