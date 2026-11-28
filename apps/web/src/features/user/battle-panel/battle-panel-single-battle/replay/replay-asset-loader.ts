import "@fontsource/pixelify-sans/500.css";
import "@fontsource/pixelify-sans/700.css";
import type { ReplayParticipant } from "@lootlog/battle-processor/replay-timeline";
import {
  MARGONEM_CDN_BATTLEGROUNDS_URL,
  MARGONEM_CDN_CHARACTERS_URL,
} from "@lootlog/domain/margonem-cdn";
import type {
  ReplayAssets,
  ReplayLoadedSprite,
  ReplaySpriteMap,
} from "./replay-canvas-types";
import { REPLAY_FONT_FAMILY } from "./replay-pixel-text";

const SAFE_BATTLEGROUND_FILE = /^[a-z0-9_-]+\.(?:jpe?g|png|webp)$/iu;

const DEFAULT_BATTLEGROUND_FILE = "m18.jpg";

const GAME_BATTLEGROUND_ALIASES = new Map(
  Object.entries({
    "002.jpg": "m15.jpg",
    "003.jpg": "m17.jpg",
    "004.jpg": "m13.jpg",
    "005.jpg": "m10.jpg",
    "006.jpg": "m10.jpg",
    "007.jpg": "m11.jpg",
    "07n.jpg": "m11.jpg",
    "008.jpg": "m13.jpg",
    "009.jpg": "m9.jpg",
    "010.jpg": "m8.jpg",
    "011.jpg": "m5.jpg",
    "012.jpg": "m7.jpg",
    "013.jpg": "m18.jpg",
    "014.jpg": "m6.jpg",
    "015.jpg": "m14.jpg",
    "018.jpg": "m2.jpg",
    "019.jpg": "m1.jpg",
    "19n.jpg": "m1.jpg",
    "021.jpg": "m5.jpg",
    "027.jpg": "m4.jpg",
    "27n.jpg": "m17.jpg",
    "032.jpg": "m3.jpg",
    "033.jpg": "m2.jpg",
    "034.jpg": "m1.jpg",
    "035.jpg": "m11.jpg",
    "35n.jpg": "m11.jpg",
    "aa1.jpg": "m16.jpg",
    "aa2.jpg": "m16.jpg",
    "bb.jpg": "m16.jpg",
    "cc1.jpg": "m14.jpg",
    "cc2.jpg": "m14.jpg",
    "dd1.jpg": "m12.jpg",
    "dd2.jpg": "m16.jpg",
    "dd3.jpg": "m16.jpg",
    "dd4.jpg": "m18.jpg",
    "j.jpg": "m15.jpg",
    "ee.jpg": "m15.jpg",
    "f.jpg": "m15.jpg",
    "g.jpg": "m15.jpg",
    "h.jpg": "m15.jpg",
    "i.jpg": "m12.jpg",
    "k.jpg": "m15.jpg",
    "l.jpg": "m15.jpg",
    "36.jpg": "m24.jpg",
    "37.jpg": "m26.jpg",
  }),
);

export const getReplaySpriteUrl = (icon: string): string | null => {
  const path = icon.trim().replace(/^\/+/u, "");

  if (!path || path.includes("..")) return null;

  return `${MARGONEM_CDN_CHARACTERS_URL}/${path}`;
};

export const getBattlegroundUrl = (battleground: string | undefined) => {
  const requested = battleground?.trim().toLowerCase() ?? "";
  const file = GAME_BATTLEGROUND_ALIASES.get(requested) ?? requested;

  return `${MARGONEM_CDN_BATTLEGROUNDS_URL}/${
    SAFE_BATTLEGROUND_FILE.test(file) && file !== "matchmaking.jpg"
      ? file
      : DEFAULT_BATTLEGROUND_FILE
  }`;
};

const loadImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () =>
      resolve(image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = url;
  });

const isCharacterSheet = (width: number, height: number) =>
  width >= 64 && height >= 64 && width % 4 === 0 && height % 4 === 0;

const createVariant = (
  image: HTMLImageElement,
  paint: (ctx: CanvasRenderingContext2D) => void,
): CanvasImageSource => {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) return image;

  ctx.drawImage(image, 0, 0);
  paint(ctx);

  return canvas;
};

const fillSilhouette = (ctx: CanvasRenderingContext2D) => {
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

const desaturate = (ctx: CanvasRenderingContext2D) => {
  const pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data } = pixels;

  for (let index = 0; index < data.length; index += 4) {
    const luma =
      (data[index] ?? 0) * 0.3 +
      (data[index + 1] ?? 0) * 0.59 +
      (data[index + 2] ?? 0) * 0.11;

    const shade = Math.round(luma * 0.55);
    data[index] = shade;
    data[index + 1] = shade;
    data[index + 2] = Math.round(shade * 1.08);
  }

  ctx.putImageData(pixels, 0, 0);
};

const loadSprite = async (url: string): Promise<ReplayLoadedSprite | null> => {
  const image = await loadImage(url);

  if (!image) return null;

  const isSheet = isCharacterSheet(image.naturalWidth, image.naturalHeight);

  return {
    image,
    flash: createVariant(image, fillSilhouette),
    faded: createVariant(image, desaturate),
    isSheet,
    frameWidth: isSheet ? image.naturalWidth / 4 : image.naturalWidth,
    frameHeight: isSheet ? image.naturalHeight / 4 : image.naturalHeight,
  };
};

const loadSprites = async (
  participants: readonly ReplayParticipant[],
): Promise<ReplaySpriteMap> => {
  const icons = new Set(
    participants.flatMap((participant) =>
      participant.icon ? [participant.icon] : [],
    ),
  );

  const entries = await Promise.all(
    Array.from(icons, async (icon) => {
      const url = getReplaySpriteUrl(icon);
      const sprite = url ? await loadSprite(url) : null;

      return sprite ? ([icon, sprite] as const) : null;
    }),
  );

  return new Map(entries.filter((entry) => entry !== null));
};

const loadFonts = () =>
  Promise.all(
    ["500", "700"].map((weight) =>
      document.fonts
        .load(`${weight} 16px "${REPLAY_FONT_FAMILY}"`, "Ąą0")
        .catch(() => []),
    ),
  );

export const loadReplayAssets = async (
  participants: readonly ReplayParticipant[],
  battleground: string | undefined,
): Promise<ReplayAssets> => {
  const [sprites, battlegroundImage] = await Promise.all([
    loadSprites(participants),
    loadImage(getBattlegroundUrl(battleground)),
    loadFonts(),
  ]);

  return { sprites, battleground: battlegroundImage };
};
