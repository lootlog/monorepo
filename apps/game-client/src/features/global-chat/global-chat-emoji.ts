import {
  GLOBAL_CHAT_EMOJI_CATEGORIES,
  GLOBAL_CHAT_EMOJI_VERSIONS,
  type GlobalChatEmojiCategoryId,
} from "./global-chat-emoji.data";

export type GlobalChatEmojiCategory = {
  id: GlobalChatEmojiCategoryId;
  emoji: string[];
};

const SIZE = 24;

const FONT = `16px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

/** Regional indicators and tags: Windows draws such flags as letters. */
const FLAG_LETTERS = /[\u{1F1E6}-\u{1F1FF}\u{E0020}-\u{E007F}]/u;

/**
 * Whether the system draws `emoji` as one colour glyph. A glyph it lacks is
 * drawn in the fill colour, and a sequence it cannot join is several glyphs
 * wide.
 */
const drawsEmoji = (
  context: CanvasRenderingContext2D,
  emoji: string,
  glyphWidth: number,
) => {
  if (context.measureText(emoji).width > glyphWidth * 1.5) return false;
  context.clearRect(0, 0, SIZE * 2, SIZE);
  context.fillStyle = "#f00";
  context.fillText(emoji, 0, 0);
  context.fillStyle = "#00f";
  context.fillText(emoji, SIZE, 0);
  const red = context.getImageData(0, 0, SIZE, SIZE).data;
  const blue = context.getImageData(SIZE, 0, SIZE, SIZE).data;

  for (let index = 0; index < red.length; index += 4) {
    if (red[index + 3] === 0) continue;

    return red[index] === blue[index] && red[index + 2] === blue[index + 2];
  }

  return false;
};

const detectCategories = (): GlobalChatEmojiCategory[] => {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE * 2;
  canvas.height = SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  let newest = -1;
  let flags = false;

  if (context) {
    context.font = FONT;
    context.textBaseline = "top";
    const glyphWidth = context.measureText("😀").width;
    const draws = (emoji: string) => drawsEmoji(context, emoji, glyphWidth);

    // Without colour emoji (Windows 7) only the oldest emoji are drawn.
    if (draws("😀")) {
      newest = GLOBAL_CHAT_EMOJI_VERSIONS.findLastIndex(({ sample }) =>
        draws(sample),
      );
      flags = draws("🇵🇱");
    }
  }

  const hidden = new Set(
    GLOBAL_CHAT_EMOJI_VERSIONS.slice(newest + 1).flatMap(({ emoji }) =>
      emoji.split(" "),
    ),
  );

  return GLOBAL_CHAT_EMOJI_CATEGORIES.map(({ id, emoji }) => ({
    id,
    emoji: emoji
      .split(" ")
      .filter(
        (candidate) =>
          !hidden.has(candidate) && (flags || !FLAG_LETTERS.test(candidate)),
      ),
  })).filter(({ emoji }) => emoji.length > 0);
};

let categories: GlobalChatEmojiCategory[] | undefined;

/**
 * The picker's emoji, without those this system would draw as boxes or loose
 * letters. Detected once, on first use.
 */
export const getGlobalChatEmojiCategories = () =>
  (categories ??= detectCategories());
