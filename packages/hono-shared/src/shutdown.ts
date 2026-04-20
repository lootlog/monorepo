type ShutdownLogger = {
  error(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
};

type CloseableServer = {
  close(callback: (error?: Error | null) => void): void;
};

export async function closeNodeServer(server: CloseableServer) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export interface RegisterGracefulShutdownOptions {
  errorMessage?: string;
  exitCodeOnError?: number;
  exitCodeOnSuccess?: number;
  logger: ShutdownLogger;
  message?: string;
  onShutdown: (signal: NodeJS.Signals) => Promise<void>;
  signals?: NodeJS.Signals[];
}

export function registerGracefulShutdown({
  errorMessage = "Graceful shutdown failed",
  exitCodeOnError = 1,
  exitCodeOnSuccess = 0,
  logger,
  message = "Shutting down service",
  onShutdown,
  signals = ["SIGINT", "SIGTERM"],
}: RegisterGracefulShutdownOptions) {
  let isShuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info(message, { signal });

    try {
      await onShutdown(signal);
      process.exit(exitCodeOnSuccess);
    } catch (error) {
      logger.error(errorMessage, { signal, error });
      process.exit(exitCodeOnError);
    }
  };

  for (const signal of signals) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }

  return shutdown;
}
