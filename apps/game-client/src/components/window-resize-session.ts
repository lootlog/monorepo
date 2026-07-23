let resizeSessionCounter = 0;
let activeResizeSessionId: number | null = null;
let cancelActiveResizeSession: (() => void) | null = null;

export const cancelWindowResizeSession = () => {
  if (!cancelActiveResizeSession) return;
  const cancel = cancelActiveResizeSession;
  cancelActiveResizeSession = null;
  cancel();
};

export const createWindowResizeSession = () => {
  resizeSessionCounter += 1;
  activeResizeSessionId = resizeSessionCounter;
  return activeResizeSessionId;
};

export const isWindowResizeSessionActive = (sessionId: number) => {
  return activeResizeSessionId === sessionId;
};

export const registerWindowResizeSessionCancellation = (cancel: () => void) => {
  cancelActiveResizeSession = cancel;
};

export const finishWindowResizeSession = (
  sessionId: number,
  cancel: () => void,
) => {
  if (activeResizeSessionId === sessionId) {
    activeResizeSessionId = null;
  }
  if (cancelActiveResizeSession === cancel) {
    cancelActiveResizeSession = null;
  }
};
