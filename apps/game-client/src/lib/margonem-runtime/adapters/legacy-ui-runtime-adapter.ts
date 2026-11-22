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

const escapeRuntimeMessage = (text: string): string =>
  text.replace(/[&<>"'[\]]/g, (char) => `&amp;#${char.charCodeAt(0)};`);

export const showRuntimeMessage = (text: string): void => {
  try {
    getRuntimeWindow().message?.(escapeRuntimeMessage(text));
  } catch (error) {
    console.warn("[Lootlog] Failed to show game message:", error);
  }
};
