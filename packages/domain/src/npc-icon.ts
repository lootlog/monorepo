const NPC_IMAGE_DIRECTORY =
  /^(?:(?:(?:[a-z][a-z\d+.-]*:)?\/\/[^/?#]*)?\/obrazki\/npc\/)+/i;

export const normalizeNpcIcon = (icon: string): string => {
  const relativeIcon = icon.replace(NPC_IMAGE_DIRECTORY, "");

  return relativeIcon.startsWith("/") ? relativeIcon.slice(1) : relativeIcon;
};

const MARGONEM_NPC_IMAGES_URL = "https://micc.garmory-cdn.cloud/obrazki/npc/";

export const npcIconUrl = (icon: string): string =>
  /^(?:https?:)?\/\//i.test(icon) ? icon : `${MARGONEM_NPC_IMAGES_URL}${icon}`;
