type LegacyUiRuntimeWindow = Window & {
  getCookie?: (name: string) => string | undefined;
  getZoomFactor?: () => number;
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
