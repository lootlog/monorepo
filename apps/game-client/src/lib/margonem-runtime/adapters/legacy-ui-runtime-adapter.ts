type LegacyUiRuntimeWindow = Window & {
  getCookie?: (name: string) => string | undefined;
  getZoomFactor?: () => number;
  message?: (message: string) => void;
};

const getRuntimeWindow = () => window as LegacyUiRuntimeWindow;

export const getRuntimeCookie = (name: string): string | undefined => {
  return getRuntimeWindow().getCookie?.(name);
};

export const getRuntimeZoomFactor = (): number | null => {
  return getRuntimeWindow().getZoomFactor?.() ?? null;
};

export const showRuntimeMessage = (message: string): void => {
  getRuntimeWindow().message?.(message);
};
