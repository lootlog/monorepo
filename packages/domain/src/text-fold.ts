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

export const foldText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(
      /[łŁßẞæÆøØœŒ]/g,
      (letter) => UNDECOMPOSED_LETTERS.get(letter) ?? letter,
    );

export const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const normalizeSearchText = (value: string): string =>
  foldText(value).toLowerCase().replace(/\s+/g, " ").trim();
