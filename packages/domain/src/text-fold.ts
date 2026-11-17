// Letters NFD does not split into a base letter and a mark.
const UNDECOMPOSED_LETTERS = new Map(
  Object.entries({
    ł: "l",
    Ł: "L",
    ß: "ss",
    ẞ: "SS",
    æ: "ae",
    Æ: "AE",
    ø: "o",
    Ø: "O",
    œ: "oe",
    Œ: "OE",
  }),
);

/**
 * Text without diacritics, keeping its case: `Łódź Œuvre` → `Lodz OEuvre`.
 * Every combining mark goes, and the letters NFD keeps whole (ł, ß, æ, ø, œ)
 * are spelled with Latin letters.
 */
export const foldText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(
      /[łŁßẞæÆøØœŒ]/g,
      (letter) => UNDECOMPOSED_LETTERS.get(letter) ?? letter,
    );

/**
 * Lowercase ASCII letters and digits joined by single hyphens; every other run
 * of characters becomes one hyphen, and none is left at either end. It does
 * not fold diacritics: compose it with `foldText` for that.
 */
export const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
