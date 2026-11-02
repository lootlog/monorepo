const DIACRITICS_REGEX = /\p{Diacritic}/gu;

const POLISH_CHARACTER_REPLACEMENTS = new Map([
  ["Ł", "L"],
  ["ł", "l"],
]);

export const normalizeSearchText = (value: string): string =>
  value
    .replace(
      /[Łł]/g,
      (character) => POLISH_CHARACTER_REPLACEMENTS.get(character) ?? character,
    )
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/\s+/g, " ")
    .trim();
