type ListenerFailure = {
  source: string;
  error: unknown;
};

export const reportListenerError = ({
  source,
  error,
}: ListenerFailure): void => {
  try {
    console.warn(`[Realtime] ${source} listener failed:`, error);
  } catch {
    // Diagnostics must not interrupt the transport or the remaining observers.
  }
};
