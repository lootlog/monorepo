type LegacyUiRuntimeWindow = Window & {
  getCookie?: (name: string) => string | undefined;
  getZoomFactor?: () => number;
  message?: (text: string) => void;
};

const getRuntimeWindow = (): LegacyUiRuntimeWindow => window;

export const getRuntimeCookie = (name: string): string | undefined => {
  return getRuntimeWindow().getCookie?.(name);
};

export const getRuntimeZoomFactor = (): number | null => {
  return getRuntimeWindow().getZoomFactor?.() ?? null;
};

export const getRuntimeUiScale = (): number =>
  getRuntimeZoomFactor() ?? window.visualViewport?.scale ?? 1;

// The game's message() decodes HTML entities once and then renders the result
// as HTML with BB codes and [NICK]/[SEX] tags. Each special character becomes
// an entity whose ampersand is escaped again, so the decode leaves an entity
// and names chosen by players are shown literally instead of as markup.
const escapeRuntimeMessage = (text: string): string =>
  text.replace(/[&<>"'[\]]/g, (char) => `&amp;#${char.charCodeAt(0)};`);

/**
 * Shows short feedback in the game's own message box. The game reads its
 * interface on every call, so a message raised before the game has loaded is
 * dropped instead of breaking the caller.
 */
export const showRuntimeMessage = (text: string): void => {
  try {
    getRuntimeWindow().message?.(escapeRuntimeMessage(text));
  } catch (error) {
    console.warn("[Lootlog] Failed to show game message:", error);
  }
};
