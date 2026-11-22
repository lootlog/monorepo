export const MARGONEM_CDN_CHARACTERS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/postacie";

const MARGONEM_CDN_ITEMS_URL = "https://micc.garmory-cdn.cloud/obrazki/itemy";

export const itemIconUrl = (icon: string) =>
  `${MARGONEM_CDN_ITEMS_URL}/${icon}`;
