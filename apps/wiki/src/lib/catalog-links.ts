// Letters NFD does not split into a base letter and a mark.
const UNDECOMPOSED_LETTERS = new Map(
  Object.entries({ ł: "l", ß: "ss", æ: "ae", ø: "o", œ: "oe" }),
);

/** A name as a URL slug: `Łowczyni Wspomnień` → `lowczyni-wspomnien`. */
export const catalogSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[łßæøœ]/g, (letter) => UNDECOMPOSED_LETTERS.get(letter) ?? letter)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The wiki covers the Polish edition of Margonem for now. */
export const WIKI_GAME_VERSION = "pl";

/** A catalog page's URL segment: the id, then the name, `257037-barbatos`. */
const pageSegment = (entry: { id: number; name: string }) =>
  [entry.id, catalogSlug(entry.name)].filter(Boolean).join("-");

/**
 * The id and the name slug of a page's URL segment. Old item links carry the
 * id alone, so the slug may be empty.
 */
export const readPageSegment = (segment: string) => {
  const match = /^(\d+)(?:-(.*))?$/.exec(segment);
  const id = Number(match?.[1]);

  return Number.isSafeInteger(id) ? { id, slug: match?.[2] ?? "" } : undefined;
};

export const itemPageParams = (item: { id: number; name: string }) => ({
  itemSlug: pageSegment(item),
});

export const npcPageParams = (npc: { id: number; name: string }) => ({
  npcSlug: pageSegment(npc),
});

// Catalog keys, such as `pl_template_257636_2`, address the old NPC links.
const CATALOG_KEY = /^[a-z]{2}(?:_[a-z]+)?_\d+_\d+$/;

export const isNpcCatalogKey = (segment: string) => CATALOG_KEY.test(segment);
