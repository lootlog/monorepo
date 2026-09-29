type ListenerFailure = {
  source: string;
  error: unknown;
};

const reportListenerError = ({ source, error }: ListenerFailure): void => {
  try {
    console.warn(`[Realtime] ${source} listener failed:`, error);
  } catch {
    // Diagnostics must not interrupt the transport or the remaining observers.
  }
};

export const notifyListeners = <Listener>(
  listeners: Iterable<Listener>,
  notify: (listener: Listener) => void,
  source: string,
): void => {
  for (const listener of listeners) {
    try {
      notify(listener);
    } catch (error) {
      reportListenerError({ source, error });
    }
  }
};
