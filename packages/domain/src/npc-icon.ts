// A scheme-relative or absolute URL, or a host-relative path, ending in the
// Margonem NPC image directory; some timers carry it twice.
const NPC_IMAGE_DIRECTORY =
  /^(?:(?:(?:[a-z][a-z\d+.-]*:)?\/\/[^/?#]*)?\/obrazki\/npc\/)+/i;

/**
 * Margonem keeps an NPC icon relative to its NPC image directory and adds the
 * CDN directory only to render it (`CFG.r_npath + fixSrc(icon)`), while the
 * old interface reports the rendered URL. Both name the same graphic, so the
 * relative form is the icon's identity: every repeated directory prefix is
 * removed, then one leading slash, as `fixSrc` does.
 */
export const normalizeNpcIcon = (icon: string): string => {
  const relativeIcon = icon.replace(NPC_IMAGE_DIRECTORY, "");

  return relativeIcon.startsWith("/") ? relativeIcon.slice(1) : relativeIcon;
};
