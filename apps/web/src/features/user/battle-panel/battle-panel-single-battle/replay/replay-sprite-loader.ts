import type { ReplayParticipant } from "@lootlog/battle-processor/replay-timeline";
import type {
  ReplayLoadedSprite,
  ReplaySpriteMap,
} from "./replay-canvas-types";

const CDN_PREFIX_PATTERN =
  /^(?:https?:)?\/\/micc\.garmory-cdn\.cloud\/obrazki\//iu;

export const getReplaySpriteUrl = (icon: string): string | null => {
  const trimmed = icon.trim();

  if (!trimmed) return null;

  const stripped = trimmed
    .replace(CDN_PREFIX_PATTERN, "")
    .replace(/^\/?obrazki\//iu, "")
    .replace(/^\/+/u, "");

  if (!stripped || stripped.includes("..")) return null;

  if (
    stripped.startsWith("postacie/") ||
    stripped.startsWith("npc/") ||
    stripped.startsWith("itemy/")
  ) {
    return `/cdn-proxy/obrazki/${stripped}`;
  }

  return `/cdn-proxy/obrazki/postacie/${stripped}`;
};

const isMargonemCharacterSheet = (width: number, height: number): boolean => {
  if (width < 96 || height < 128) return false;

  if (width % 4 !== 0 || height % 4 !== 0) return false;

  const frameAspect = width / 4 / (height / 4);

  return frameAspect >= 0.45 && frameAspect <= 0.95;
};

const loadSingleSprite = (url: string): Promise<ReplayLoadedSprite | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    const finalize = () => {
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        resolve(null);

        return;
      }

      const isSheet = isMargonemCharacterSheet(
        image.naturalWidth,
        image.naturalHeight,
      );

      resolve({
        image,
        isSheet,
        frameWidth: isSheet ? image.naturalWidth / 4 : image.naturalWidth,
        frameHeight: isSheet ? image.naturalHeight / 4 : image.naturalHeight,
      });
    };

    image.onload = finalize;
    image.onerror = () => resolve(null);
    image.src = url;
  });

export const loadReplaySprites = async (
  participants: readonly ReplayParticipant[],
): Promise<ReplaySpriteMap> => {
  const uniqueIcons = new Set<string>();

  for (const participant of participants) {
    if (participant.icon) uniqueIcons.add(participant.icon);
  }

  const loaded = new Map<string, ReplayLoadedSprite>();

  await Promise.all(
    Array.from(uniqueIcons, async (icon) => {
      const url = getReplaySpriteUrl(icon);

      if (!url) return;

      const sprite = await loadSingleSprite(url);

      if (sprite) loaded.set(icon, sprite);
    }),
  );

  return loaded;
};
