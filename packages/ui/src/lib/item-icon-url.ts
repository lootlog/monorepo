const MARGONEM_CDN_ITEMS_URL = "https://micc.garmory-cdn.cloud/obrazki/itemy";

/** Where Margonem serves an item's icon. */
export const itemIconUrl = (icon: string) =>
  `${MARGONEM_CDN_ITEMS_URL}/${icon}`;
