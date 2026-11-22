/** Where Margonem serves character sprites; a character's icon is relative to it. */
export const MARGONEM_CDN_CHARACTERS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/postacie";

/** Where Margonem serves item icons; an item's icon is relative to it. */
const MARGONEM_CDN_ITEMS_URL = "https://micc.garmory-cdn.cloud/obrazki/itemy";

/** Where Margonem serves an item's icon. */
export const itemIconUrl = (icon: string) =>
  `${MARGONEM_CDN_ITEMS_URL}/${icon}`;
